#!/usr/bin/env node

/**
 * Import Product Variations from WordPress to Brakebee
 * 
 * This script:
 * 1. Extracts variation attributes from WordPress parent products (_product_attributes)
 * 2. Creates user_variation_types prefixed with product name (e.g., "Sidewave-Color")
 * 3. Extracts variation values from child products (attribute_pa_color, etc.)
 * 4. Creates user_variation_values for each unique value per product
 * 5. Links child products to their variation values via product_variations
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
  productsProcessed: 0,
  errors: 0
};

/**
 * Parse PHP serialized string for product attributes
 * Handles BOTH taxonomy attributes (pa_color) AND custom attributes (color, size, etc.)
 */
function parseProductAttributes(serialized) {
  if (!serialized) return [];
  
  const attributes = [];
  
  // Match ANY attribute pattern (taxonomy OR custom) that has is_variation:1
  // Pattern: s:N:"attribute_name";a:N:{...s:12:"is_variation";i:1;...}
  const attrRegex = /s:\d+:"([^"]+)";a:\d+:\{(?:[^}]|\}(?!;))*s:12:"is_variation";i:1;/g;
  let match;
  
  while ((match = attrRegex.exec(serialized)) !== null) {
    const attrName = match[1]; // e.g., "pa_color" or "color"
    const isTaxonomy = attrName.startsWith('pa_');
    
    // Display name: remove pa_ prefix if taxonomy, then format
    const cleanName = isTaxonomy ? attrName.replace('pa_', '') : attrName;
    const displayName = cleanName.replace(/_/g, ' ').replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    attributes.push({
      wpName: attrName,        // pa_color or color
      displayName: displayName, // Color
      isTaxonomy: isTaxonomy   // true if pa_*, false otherwise
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

async function importVariations() {
  let wpConn, oafConn;
  
  try {
    console.log('🔌 Connecting to databases...');
    wpConn = await mysql.createConnection(wpConfig);
    oafConn = await mysql.createConnection(oafConfig);
    console.log('✅ Connected to WordPress and OAF databases\n');

    // Get all parent products with variations
    console.log('📊 Fetching WordPress parent products with variations...');
    const [wpParents] = await wpConn.query(`
      SELECT DISTINCT
        p.ID as wp_product_id,
        p.post_title as product_name,
        p.post_author as wp_user_id,
        MAX(CASE WHEN pm.meta_key = '_product_attributes' THEN pm.meta_value END) as product_attributes
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = '_product_attributes'
      WHERE p.post_type = 'product'
        AND p.post_status = 'publish'
      GROUP BY p.ID, p.post_title, p.post_author
      HAVING product_attributes IS NOT NULL
      ORDER BY p.ID
    `);

    console.log(`Found ${wpParents.length} WordPress parent products with variations\n`);

    for (const wpParent of wpParents) {
      try {
        // Get Brakebee parent product and vendor
        const [oafParent] = await oafConn.query(
          'SELECT id, vendor_id, name FROM products WHERE wp_id = ?',
          [wpParent.wp_product_id]
        );

        if (!oafParent || oafParent.length === 0) {
          console.log(`   ⏩ Skipping: Parent product wp_id ${wpParent.wp_product_id} not found in Brakebee`);
          continue;
        }

        const parentId = oafParent[0].id;
        const vendorId = oafParent[0].vendor_id;
        const parentName = oafParent[0].name;
        
        // Truncate product name for prefix (first 30 chars)
        const productPrefix = parentName.substring(0, 30).trim();

        // Parse attributes from parent
        const attributes = parseProductAttributes(wpParent.product_attributes);
        
        if (attributes.length === 0) {
          continue;
        }

        console.log(`\n   📦 ${parentName} (${attributes.length} variation types)`);

        // Process each variation type (e.g., Color, Size)
        for (const attr of attributes) {
          // Create variation type with product prefix
          const variationTypeName = `${productPrefix}-${attr.displayName}`;
          
          // Check if variation type already exists
          const [existingType] = await oafConn.query(
            'SELECT id FROM user_variation_types WHERE user_id = ? AND variation_name = ?',
            [vendorId, variationTypeName]
          );

          let variationTypeId;
          
          if (existingType.length > 0) {
            variationTypeId = existingType[0].id;
            console.log(`      ⏩ Type exists: ${variationTypeName}`);
          } else {
            const [result] = await oafConn.query(
              'INSERT INTO user_variation_types (user_id, variation_name) VALUES (?, ?)',
              [vendorId, variationTypeName]
            );
            variationTypeId = result.insertId;
            stats.variationTypesCreated++;
            console.log(`      ✅ Created type: ${variationTypeName}`);
          }

          // Get all child products and their attribute values
          // For taxonomy: attribute_pa_color
          // For custom: attribute_color
          const metaKey = attr.isTaxonomy ? `attribute_${attr.wpName}` : `attribute_${attr.wpName}`;
          
          const [children] = await wpConn.query(`
            SELECT 
              pv.ID as wp_child_id,
              pv.post_title as child_name,
              pm.meta_value as attribute_value
            FROM wp_posts pv
            LEFT JOIN wp_postmeta pm ON pv.ID = pm.post_id AND pm.meta_key = ?
            WHERE pv.post_type = 'product_variation'
              AND pv.post_parent = ?
              AND pv.post_status = 'publish'
          `, [metaKey, wpParent.wp_product_id]);

          // Process each child
          for (const child of children) {
            if (!child.attribute_value) continue;

            // Get Brakebee child product
            const [oafChild] = await oafConn.query(
              'SELECT id FROM products WHERE wp_id = ?',
              [child.wp_child_id]
            );

            if (!oafChild || oafChild.length === 0) {
              continue;
            }

            const childProductId = oafChild[0].id;
            const valueName = slugToDisplayName(child.attribute_value);

            // Create variation value if it doesn't exist
            const [existingValue] = await oafConn.query(
              'SELECT id FROM user_variation_values WHERE product_id = ? AND variation_type_id = ? AND value_name = ?',
              [parentId, variationTypeId, valueName]
            );

            let variationValueId;

            if (existingValue.length > 0) {
              variationValueId = existingValue[0].id;
            } else {
              const [valueResult] = await oafConn.query(
                'INSERT INTO user_variation_values (user_id, product_id, variation_type_id, value_name) VALUES (?, ?, ?, ?)',
                [vendorId, parentId, variationTypeId, valueName]
              );
              variationValueId = valueResult.insertId;
              stats.variationValuesCreated++;
            }

            // Link child product to variation value
            const [existingLink] = await oafConn.query(
              'SELECT id FROM product_variations WHERE product_id = ? AND variation_type_id = ?',
              [childProductId, variationTypeId]
            );

            if (existingLink.length === 0) {
              await oafConn.query(
                'INSERT INTO product_variations (product_id, variation_type_id, variation_value_id) VALUES (?, ?, ?)',
                [childProductId, variationTypeId, variationValueId]
              );
              stats.productVariationsLinked++;
            }
          }

          console.log(`         ↳ ${children.length} variations linked`);
        }

        stats.productsProcessed++;

      } catch (err) {
        console.error(`   ❌ Error processing product ${wpParent.product_name}:`, err.message);
        stats.errors++;
      }
    }

    console.log('\n============================================================');
    console.log('📊 IMPORT SUMMARY');
    console.log('============================================================');
    console.log(`✅ Products processed: ${stats.productsProcessed}`);
    console.log(`✅ Variation types created: ${stats.variationTypesCreated}`);
    console.log(`✅ Variation values created: ${stats.variationValuesCreated}`);
    console.log(`✅ Product variations linked: ${stats.productVariationsLinked}`);
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

