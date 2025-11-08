#!/usr/bin/env node

/**
 * Import Product Variations from WordPress to Brakebee (FIXED VERSION)
 * 
 * This script correctly imports:
 * 1. Variation types per product (e.g., "Sidewave Metal Decor-Color")
 * 2. Variation values per type (e.g., "Red", "Blue", "Green")
 * 3. Links child products to their specific values
 * 
 * Handles BOTH taxonomy attributes (pa_color) and custom attributes (color)
 * as the same attribute type, avoiding duplicates.
 * 
 * Supports multiple attributes per product (e.g., Color + Size)
 * Each child gets multiple rows in product_variations, one per attribute.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const wpConfig = {
  host: process.env.WP_DB_HOST || '10.128.0.31',
  user: process.env.WP_DB_USER || 'oafuser',
  password: process.env.WP_DB_PASSWORD || 'oafpass',
  database: 'wordpress_import'
};

const oafConfig = {
  host: process.env.OAF_DB_HOST || '10.128.0.31',
  user: process.env.OAF_DB_USER || 'oafuser',
  password: process.env.OAF_DB_PASSWORD || 'oafpass',
  database: 'oaf'
};

// Stats
const stats = {
  variationTypesCreated: 0,
  variationValuesCreated: 0,
  productVariationsLinked: 0,
  parentsProcessed: 0,
  parentsSkipped: 0,
  childrenProcessed: 0,
  errors: 0
};

/**
 * Parse PHP serialized string for product attributes
 * Handles BOTH taxonomy (pa_color) AND custom (color) attributes
 * Returns normalized attribute names (both "pa_color" and "color" become "Color")
 */
function parseProductAttributes(serialized) {
  if (!serialized) return [];
  
  const attributes = [];
  const seenAttributes = new Set(); // Track to avoid duplicates
  
  // Match attribute definitions with is_variation:1
  // Pattern: s:N:"attribute_name";a:N:{...is_variation";i:1...}
  // Use .*? for non-greedy matching to handle nested braces
  const attrPattern = /s:\d+:"([^"]+)";a:\d+:\{.*?is_variation";i:1/g;
  let match;
  
  while ((match = attrPattern.exec(serialized)) !== null) {
    let attrName = match[1]; // e.g., "pa_color" or "color" or "size"
    
    // Normalize: remove pa_ prefix if it exists
    const normalizedName = attrName.startsWith('pa_') ? attrName.substring(3) : attrName;
    
    // Skip if we've already seen this normalized attribute
    if (seenAttributes.has(normalizedName)) {
      continue;
    }
    seenAttributes.add(normalizedName);
    
    // Create display name: "color" -> "Color", "backplate-color" -> "Backplate Color"
    const displayName = normalizedName
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    attributes.push({
      wpName: normalizedName,      // "color" (normalized, no pa_)
      displayName: displayName,    // "Color"
      originalName: attrName       // "pa_color" or "color" (for reference)
    });
  }
  
  return attributes;
}

/**
 * Convert slug to display name (candy-red -> Candy Red)
 */
function slugToDisplayName(slug) {
  if (!slug) return '';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get child product attribute values from WordPress
 * Checks both "attribute_pa_color" and "attribute_color" meta keys
 */
async function getChildAttributeValue(wpConn, childId, attributeName) {
  // Try taxonomy version first (attribute_pa_color)
  const [taxonomy] = await wpConn.query(
    'SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?',
    [childId, `attribute_pa_${attributeName}`]
  );
  
  if (taxonomy.length > 0 && taxonomy[0].meta_value) {
    return taxonomy[0].meta_value;
  }
  
  // Try custom attribute version (attribute_color)
  const [custom] = await wpConn.query(
    'SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?',
    [childId, `attribute_${attributeName}`]
  );
  
  if (custom.length > 0 && custom[0].meta_value) {
    return custom[0].meta_value;
  }
  
  return null;
}

async function importVariations() {
  let wpConn, oafConn;
  
  try {
    console.log('🔌 Connecting to databases...');
    wpConn = await mysql.createConnection(wpConfig);
    oafConn = await mysql.createConnection(oafConfig);
    console.log('✅ Connected to WordPress and OAF databases\n');

    // Get all parent products that have children
    console.log('📊 Fetching parent products with variations...');
    const [oafParents] = await oafConn.query(`
      SELECT DISTINCT
        p.id,
        p.wp_id,
        p.name,
        p.vendor_id
      FROM products p
      WHERE p.parent_id IS NULL
        AND p.wp_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM products c 
          WHERE c.parent_id = p.id AND c.wp_id IS NOT NULL
        )
      ORDER BY p.id
    `);

    console.log(`Found ${oafParents.length} parent products with children\n`);

    for (const oafParent of oafParents) {
      try {
        // Get WordPress parent product attributes
        const [wpParent] = await wpConn.query(
          'SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = "_product_attributes"',
          [oafParent.wp_id]
        );

        if (wpParent.length === 0 || !wpParent[0].meta_value) {
          console.log(`   ⏩ Skipping ${oafParent.name}: No _product_attributes in WordPress`);
          stats.parentsSkipped++;
          continue;
        }

        // Parse attributes
        const attributes = parseProductAttributes(wpParent[0].meta_value);
        
        if (attributes.length === 0) {
          console.log(`   ⏩ Skipping ${oafParent.name}: No variation attributes found`);
          stats.parentsSkipped++;
          continue;
        }

        console.log(`\n   📦 ${oafParent.name}`);
        console.log(`      Attributes: ${attributes.map(a => a.displayName).join(', ')}`);

        // Create variation types for this product
        const variationTypeIds = {};
        
        for (const attr of attributes) {
          // Create variation type name: "Product Name-Attribute"
          const variationTypeName = `${oafParent.name}-${attr.displayName}`;
          
          // Check if already exists
          const [existingType] = await oafConn.query(
            'SELECT id FROM user_variation_types WHERE user_id = ? AND variation_name = ?',
            [oafParent.vendor_id, variationTypeName]
          );

          if (existingType.length > 0) {
            variationTypeIds[attr.wpName] = existingType[0].id;
            console.log(`      ⏩ Type exists: ${variationTypeName}`);
          } else {
            const [result] = await oafConn.query(
              'INSERT INTO user_variation_types (user_id, variation_name) VALUES (?, ?)',
              [oafParent.vendor_id, variationTypeName]
            );
            variationTypeIds[attr.wpName] = result.insertId;
            stats.variationTypesCreated++;
            console.log(`      ✅ Created type: ${variationTypeName}`);
          }
        }

        // Get all child products for this parent
        const [oafChildren] = await oafConn.query(
          'SELECT id, wp_id, name FROM products WHERE parent_id = ? AND wp_id IS NOT NULL',
          [oafParent.id]
        );

        console.log(`      Processing ${oafChildren.length} children...`);

        // Track unique values per attribute to create variation_values
        const valuesPerAttribute = {}; // { "color": Set(["red", "blue"]), "size": Set(["small"]) }
        attributes.forEach(attr => {
          valuesPerAttribute[attr.wpName] = {};
        });

        // Process each child product
        for (const child of oafChildren) {
          const childVariations = {}; // Store this child's attribute values

          // Get attribute values for this child
          for (const attr of attributes) {
            const value = await getChildAttributeValue(wpConn, child.wp_id, attr.wpName);
            
            if (value) {
              childVariations[attr.wpName] = value;
              
              // Track this value for creating variation_values later
              const displayValue = slugToDisplayName(value);
              valuesPerAttribute[attr.wpName][value] = displayValue;
            }
          }

          // Store for linking later
          child.variations = childVariations;
          stats.childrenProcessed++;
        }

        // Create variation_values for each unique value
        const variationValueIds = {}; // { "color": { "red": id, "blue": id }, "size": { "small": id } }
        
        for (const attr of attributes) {
          variationValueIds[attr.wpName] = {};
          
          for (const [slugValue, displayValue] of Object.entries(valuesPerAttribute[attr.wpName])) {
            // Check if value already exists
            const [existingValue] = await oafConn.query(
              'SELECT id FROM user_variation_values WHERE product_id = ? AND variation_type_id = ? AND value_name = ?',
              [oafParent.id, variationTypeIds[attr.wpName], displayValue]
            );

            if (existingValue.length > 0) {
              variationValueIds[attr.wpName][slugValue] = existingValue[0].id;
            } else {
              const [result] = await oafConn.query(
                'INSERT INTO user_variation_values (user_id, product_id, variation_type_id, value_name) VALUES (?, ?, ?, ?)',
                [oafParent.vendor_id, oafParent.id, variationTypeIds[attr.wpName], displayValue]
              );
              variationValueIds[attr.wpName][slugValue] = result.insertId;
              stats.variationValuesCreated++;
            }
          }
        }

        // Link each child to its variation values
        let childLinksCreated = 0;
        for (const child of oafChildren) {
          for (const attr of attributes) {
            const slugValue = child.variations[attr.wpName];
            
            if (slugValue && variationValueIds[attr.wpName][slugValue]) {
              const valueId = variationValueIds[attr.wpName][slugValue];
              const typeId = variationTypeIds[attr.wpName];
              
              // Check if link already exists
              const [existingLink] = await oafConn.query(
                'SELECT id FROM product_variations WHERE product_id = ? AND variation_type_id = ? AND variation_value_id = ?',
                [child.id, typeId, valueId]
              );

              if (existingLink.length === 0) {
                await oafConn.query(
                  'INSERT INTO product_variations (product_id, variation_type_id, variation_value_id) VALUES (?, ?, ?)',
                  [child.id, typeId, valueId]
                );
                childLinksCreated++;
                stats.productVariationsLinked++;
              }
            }
          }
        }

        console.log(`      ✅ Linked ${childLinksCreated} child variations`);
        stats.parentsProcessed++;

      } catch (err) {
        console.error(`   ❌ Error processing ${oafParent.name}:`, err.message);
        stats.errors++;
      }
    }

    console.log('\n============================================================');
    console.log('📊 IMPORT SUMMARY');
    console.log('============================================================');
    console.log(`✅ Parents processed: ${stats.parentsProcessed}`);
    console.log(`⏩ Parents skipped: ${stats.parentsSkipped}`);
    console.log(`✅ Children processed: ${stats.childrenProcessed}`);
    console.log(`✅ Variation types created: ${stats.variationTypesCreated}`);
    console.log(`✅ Variation values created: ${stats.variationValuesCreated}`);
    console.log(`✅ Product-variation links: ${stats.productVariationsLinked}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    if (wpConn) await wpConn.end();
    if (oafConn) await oafConn.end();
  }
}

// Run the import
importVariations();

