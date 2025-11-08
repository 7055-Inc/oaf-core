#!/usr/bin/env node

/**
 * Import Product Variations from WordPress to Brakebee
 * 
 * THIS VERSION IGNORES PARENT METADATA and looks directly at what
 * attribute_ fields the children actually have. This handles WordPress
 * data quality issues where parents have incorrect is_variation flags.
 * 
 * Strategy:
 * 1. Find all parent products with children
 * 2. Look at actual attribute_ meta keys on children
 * 3. Create variation types based on what children have
 * 4. Link children to their values
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
 * Normalize attribute name: remove pa_ prefix, format nicely
 */
function normalizeAttributeName(attrKey) {
  // Remove "attribute_" or "attribute_pa_" prefix
  let cleaned = attrKey.replace(/^attribute_pa_/, '').replace(/^attribute_/, '');
  
  // Format: color -> Color, backplate-color -> Backplate Color
  return cleaned
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function importVariations() {
  let wpConn, oafConn;
  
  try {
    console.log('🔌 Connecting to databases...');
    wpConn = await mysql.createConnection(wpConfig);
    oafConn = await mysql.createConnection(oafConfig);
    console.log('✅ Connected to WordPress and OAF databases\n');

    // Get all Brakebee parent products that have children
    console.log('📊 Fetching parent products with children...');
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
        // Get distinct attribute_ fields that children actually have in WordPress
        const [wpChildAttrs] = await wpConn.query(`
          SELECT DISTINCT
            pm.meta_key
          FROM wp_posts pv
          JOIN wp_postmeta pm ON pv.ID = pm.post_id
          WHERE pv.post_type = 'product_variation'
            AND pv.post_parent = ?
            AND pm.meta_key LIKE 'attribute_%'
            AND pm.meta_value != ''
          ORDER BY pm.meta_key
        `, [oafParent.wp_id]);

        if (wpChildAttrs.length === 0) {
          console.log(`   ⏩ Skipping ${oafParent.name}: No attribute fields found on children`);
          stats.parentsSkipped++;
          continue;
        }

        // Normalize attribute names and remove duplicates (pa_color and color become the same)
        const seenAttributes = new Map(); // normalizedName -> original meta_key
        const attributes = [];
        
        for (const attr of wpChildAttrs) {
          const normalized = normalizeAttributeName(attr.meta_key);
          if (!seenAttributes.has(normalized)) {
            seenAttributes.set(normalized, attr.meta_key);
            attributes.push({
              wpMetaKey: attr.meta_key,     // "attribute_pa_color" or "attribute_color"
              displayName: normalized        // "Color"
            });
          }
        }

        console.log(`\n   📦 ${oafParent.name}`);
        console.log(`      Attributes: ${attributes.map(a => a.displayName).join(', ')}`);

        // Create variation types for this product
        const variationTypeIds = {};
        
        for (const attr of attributes) {
          const variationTypeName = `${oafParent.name}-${attr.displayName}`;
          
          // Check if already exists
          const [existingType] = await oafConn.query(
            'SELECT id FROM user_variation_types WHERE user_id = ? AND variation_name = ?',
            [oafParent.vendor_id, variationTypeName]
          );

          if (existingType.length > 0) {
            variationTypeIds[attr.wpMetaKey] = existingType[0].id;
            console.log(`      ⏩ Type exists: ${variationTypeName}`);
          } else {
            const [result] = await oafConn.query(
              'INSERT INTO user_variation_types (user_id, variation_name) VALUES (?, ?)',
              [oafParent.vendor_id, variationTypeName]
            );
            variationTypeIds[attr.wpMetaKey] = result.insertId;
            stats.variationTypesCreated++;
            console.log(`      ✅ Created type: ${variationTypeName}`);
          }
        }

        // Get all child products from Brakebee
        const [oafChildren] = await oafConn.query(
          'SELECT id, wp_id, name FROM products WHERE parent_id = ? AND wp_id IS NOT NULL',
          [oafParent.id]
        );

        console.log(`      Processing ${oafChildren.length} children...`);

        // Track unique values per attribute
        const valuesPerAttribute = {}; // { "attribute_pa_color": { "red": "Red", "blue": "Blue" } }
        attributes.forEach(attr => {
          valuesPerAttribute[attr.wpMetaKey] = {};
        });

        // Get all child attribute values from WordPress
        for (const child of oafChildren) {
          child.variations = {};
          
          for (const attr of attributes) {
            const [wpValue] = await wpConn.query(
              'SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?',
              [child.wp_id, attr.wpMetaKey]
            );
            
            if (wpValue.length > 0 && wpValue[0].meta_value) {
              const slugValue = wpValue[0].meta_value;
              const displayValue = slugToDisplayName(slugValue);
              
              child.variations[attr.wpMetaKey] = slugValue;
              valuesPerAttribute[attr.wpMetaKey][slugValue] = displayValue;
            }
          }
          
          stats.childrenProcessed++;
        }

        // Create variation_values for each unique value
        const variationValueIds = {}; // { "attribute_pa_color": { "red": valueId, "blue": valueId } }
        
        for (const attr of attributes) {
          variationValueIds[attr.wpMetaKey] = {};
          
          for (const [slugValue, displayValue] of Object.entries(valuesPerAttribute[attr.wpMetaKey])) {
            // Check if value already exists
            const [existingValue] = await oafConn.query(
              'SELECT id FROM user_variation_values WHERE product_id = ? AND variation_type_id = ? AND value_name = ?',
              [oafParent.id, variationTypeIds[attr.wpMetaKey], displayValue]
            );

            if (existingValue.length > 0) {
              variationValueIds[attr.wpMetaKey][slugValue] = existingValue[0].id;
            } else {
              const [valueResult] = await oafConn.query(
                'INSERT INTO user_variation_values (user_id, product_id, variation_type_id, value_name) VALUES (?, ?, ?, ?)',
                [oafParent.vendor_id, oafParent.id, variationTypeIds[attr.wpMetaKey], displayValue]
              );
              variationValueIds[attr.wpMetaKey][slugValue] = valueResult.insertId;
              stats.variationValuesCreated++;
            }
          }
        }

        // Link each child to its variation values
        let childLinksCreated = 0;
        for (const child of oafChildren) {
          for (const attr of attributes) {
            const slugValue = child.variations[attr.wpMetaKey];
            
            if (slugValue && variationValueIds[attr.wpMetaKey][slugValue]) {
              const valueId = variationValueIds[attr.wpMetaKey][slugValue];
              const typeId = variationTypeIds[attr.wpMetaKey];
              
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

