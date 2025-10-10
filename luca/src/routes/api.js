const express = require('express');
const { executeQuery } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Apply optional auth to all routes (allows access but sets user context if token exists)
router.use(optionalAuth);

// Fallback to mock user for development if no auth token
const getUser = (req) => req.user || { id: 1 };

// Categories endpoints
router.get('/categories', async (req, res) => {
  try {
    const categories = await executeQuery(
      'SELECT * FROM material_categories WHERE user_id = ? ORDER BY name',
      [getUser(req).id]
    );
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await executeQuery(
      'INSERT INTO material_categories (user_id, name) VALUES (?, ?)',
      [getUser(req).id, name]
    );
    res.json({ id: result.insertId, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await executeQuery(
      'DELETE FROM material_categories WHERE id = ? AND user_id = ?',
      [req.params.id, getUser(req).id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Materials endpoints
router.get('/materials', async (req, res) => {
  try {
    let query = `
      SELECT m.*, c.name as category_name 
      FROM materials m 
      JOIN material_categories c ON m.category_id = c.id 
      WHERE m.user_id = ?
    `;
    let params = [getUser(req).id];
    
    if (req.query.category_id) {
      query += ' AND m.category_id = ?';
      params.push(req.query.category_id);
    }
    
    query += ' ORDER BY c.name, m.name';
    
    const materials = await executeQuery(query, params);
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/materials/:id', async (req, res) => {
  try {
    const materials = await executeQuery(
      'SELECT * FROM materials WHERE id = ? AND user_id = ?',
      [req.params.id, getUser(req).id]
    );
    if (materials.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(materials[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/materials', async (req, res) => {
  try {
    const { category_id, name, measure_unit, purchase_unit_qty, purchase_bundle_price } = req.body;
    const result = await executeQuery(`
      INSERT INTO materials (user_id, category_id, name, measure_unit, purchase_unit_qty, purchase_bundle_price) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [getUser(req).id, category_id, name, measure_unit, purchase_unit_qty, purchase_bundle_price]);
    res.json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/materials/:id', async (req, res) => {
  try {
    const { category_id, name, measure_unit, purchase_unit_qty, purchase_bundle_price } = req.body;
    await executeQuery(`
      UPDATE materials 
      SET category_id = ?, name = ?, measure_unit = ?, purchase_unit_qty = ?, purchase_bundle_price = ?
      WHERE id = ? AND user_id = ?
    `, [category_id, name, measure_unit, purchase_unit_qty, purchase_bundle_price, req.params.id, getUser(req).id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/materials/:id', async (req, res) => {
  try {
    await executeQuery(
      'DELETE FROM materials WHERE id = ? AND user_id = ?',
      [req.params.id, getUser(req).id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Products endpoints
router.get('/products', async (req, res) => {
  try {
    const products = await executeQuery(
      'SELECT p.*, pc.name as collection_name FROM products p LEFT JOIN product_collections pc ON p.collection_id = pc.id WHERE p.user_id = ? ORDER BY p.created_at DESC',
      [getUser(req).id]
    );
    
    // Return simple paginated format for compatibility
    res.json({
      products,
      currentPage: 1,
      totalPages: 1,
      totalProducts: products.length,
      hasNext: false,
      hasPrev: false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, sku, batch_quantity, total_batch_cost, cost_per_item, materials } = req.body;
    
    // Insert product (using title field instead of name)
    const productResult = await executeQuery(`
      INSERT INTO products (user_id, title, sku, batch_quantity, total_batch_cost, cost_per_item) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [getUser(req).id, name, sku, batch_quantity, total_batch_cost, cost_per_item]);
    
    const productId = productResult.insertId;
    
    // Insert product materials
    for (const material of materials) {
      await executeQuery(`
        INSERT INTO product_materials (product_id, material_id, quantity, cost_per_unit, line_cost)
        VALUES (?, ?, ?, ?, ?)
      `, [productId, material.material_id, material.quantity, material.cost_per_unit, material.line_cost]);
    }
    
    res.json({ id: productId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { name, sku, batch_quantity, total_batch_cost, cost_per_item, materials } = req.body;
    
    // Update product
    await executeQuery(`
      UPDATE products SET title = ?, sku = ?, batch_quantity = ?, total_batch_cost = ?, cost_per_item = ?
      WHERE id = ? AND user_id = ?
    `, [name, sku, batch_quantity, total_batch_cost, cost_per_item, req.params.id, getUser(req).id]);
    
    // Delete existing materials and insert new ones
    await executeQuery('DELETE FROM product_materials WHERE product_id = ?', [req.params.id]);
    
    for (const material of materials) {
      await executeQuery(`
        INSERT INTO product_materials (product_id, material_id, quantity, cost_per_unit, line_cost)
        VALUES (?, ?, ?, ?, ?)
      `, [req.params.id, material.material_id, material.quantity, material.cost_per_unit, material.line_cost]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/:id/materials', async (req, res) => {
  try {
    // Get product with its materials
    const [product] = await executeQuery(
      'SELECT * FROM products WHERE id = ? AND user_id = ?',
      [req.params.id, getUser(req).id]
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get product materials
    const materials = await executeQuery(`
      SELECT pm.*, m.name as material_name, m.measure_unit, mc.name as category_name
      FROM product_materials pm
      JOIN materials m ON pm.material_id = m.id
      JOIN material_categories mc ON m.category_id = mc.id
      WHERE pm.product_id = ?
    `, [req.params.id]);
    
    res.json({
      ...product,
      materials
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    // Delete product (cascade will handle product_materials)
    await executeQuery(
      'DELETE FROM products WHERE id = ? AND user_id = ?',
      [req.params.id, getUser(req).id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Collections endpoints
router.get('/collections', async (req, res) => {
  try {
    const collections = await executeQuery(
      'SELECT * FROM product_collections WHERE user_id = ? ORDER BY name',
      [getUser(req).id]
    );
    res.json(collections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/collections', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await executeQuery(
      'INSERT INTO product_collections (user_id, name, description) VALUES (?, ?, ?)',
      [getUser(req).id, name, description]
    );
    res.json({ id: result.insertId, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/collections/:id', async (req, res) => {
  try {
    await executeQuery(
      'DELETE FROM product_collections WHERE id = ? AND user_id = ?',
      [req.params.id, getUser(req).id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Removed duplicate catalog endpoint - now using unified /api/products

// Full product management endpoints
router.get('/products/full', async (req, res) => {
  try {
    const products = await executeQuery(`
      SELECT p.*, pc.name as collection_name
      FROM products p 
      LEFT JOIN product_collections pc ON p.collection_id = pc.id
      WHERE p.user_id = ? AND p.is_parent = TRUE
      ORDER BY p.created_at DESC
    `, [getUser(req).id]);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products/full', async (req, res) => {
  try {
    const {
      title, collection_id, sku, upc, brand, manufacturer, model_number,
      main_category, condition_type, country_origin, age_group, gender,
      height, width, depth, dimension_unit, weight, weight_unit,
      msrp, map_price, batch_quantity, materials_used, material_composition,
      keywords, holiday_occasion, gift_wrappable, age_restriction,
      certifications, safety_warnings, custom_fields, metrics
    } = req.body;
    
    // Calculate cost per item (placeholder - you'll integrate with costing system)
    const cost_per_item = 0; // TODO: Calculate from materials
    const total_batch_cost = 0; // TODO: Calculate from materials
    
    // Insert main product
    const productResult = await executeQuery(`
      INSERT INTO products (
        user_id, title, collection_id, sku, upc, brand, manufacturer, model_number,
        main_category, condition_type, country_origin, age_group, gender,
        height, width, depth, dimension_unit, weight, weight_unit,
        msrp, map_price, batch_quantity, total_batch_cost, cost_per_item,
        materials_used, material_composition, keywords, holiday_occasion,
        gift_wrappable, age_restriction, certifications, safety_warnings,
        is_parent, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'active')
    `, [
      getUser(req).id, title, collection_id, sku, upc, brand, manufacturer, model_number,
      main_category, condition_type, country_origin, age_group, gender,
      height, width, depth, dimension_unit, weight, weight_unit,
      msrp, map_price, batch_quantity, total_batch_cost, cost_per_item,
      materials_used, material_composition, keywords, holiday_occasion,
      gift_wrappable, age_restriction, certifications, safety_warnings
    ]);
    
    const productId = productResult.insertId;
    
    // Insert custom fields
    if (custom_fields && custom_fields.length > 0) {
      for (const field of custom_fields) {
        await executeQuery(`
          INSERT INTO product_custom_fields (user_id, product_id, field_name, field_value, field_type)
          VALUES (?, ?, ?, ?, ?)
        `, [getUser(req).id, productId, field.name, field.value, field.type]);
      }
    }
    
    // Insert variant metrics
    if (metrics && metrics.length > 0) {
      for (const metric of metrics) {
        const metricResult = await executeQuery(`
          INSERT INTO product_variant_metrics (user_id, product_id, metric_name)
          VALUES (?, ?, ?)
        `, [getUser(req).id, productId, metric.name]);
        
        const metricId = metricResult.insertId;
        
        // Insert metric options
        for (const option of metric.options) {
          await executeQuery(`
            INSERT INTO product_variant_options (metric_id, option_value)
            VALUES (?, ?)
          `, [metricId, option]);
        }
      }
    }
    
    res.json({ id: productId, message: 'Product created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/full/:id', async (req, res) => {
  try {
    // Get product details
    const [product] = await executeQuery(`
      SELECT p.*, pc.name as collection_name
      FROM products p 
      LEFT JOIN product_collections pc ON p.collection_id = pc.id
      WHERE p.id = ? AND p.user_id = ?
    `, [req.params.id, getUser(req).id]);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get custom fields
    const customFields = await executeQuery(`
      SELECT pcf.field_name, pcv.field_value, pcf.field_type
      FROM product_custom_values pcv
      JOIN product_custom_fields pcf ON pcv.field_id = pcf.id
      WHERE pcv.product_id = ?
    `, [req.params.id]);
    
    // Get variant metrics and options
    const metrics = await executeQuery(`
      SELECT m.id, m.metric_name, 
             GROUP_CONCAT(o.option_value) as options
      FROM product_variant_metrics m
      LEFT JOIN product_variant_options o ON m.id = o.metric_id
      WHERE m.product_id = ?
      GROUP BY m.id, m.metric_name
    `, [req.params.id]);
    
    product.custom_fields = customFields;
    product.metrics = metrics.map(m => ({
      id: m.id,
      name: m.metric_name,
      options: m.options ? m.options.split(',') : []
    }));
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/products/full/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      title, collection_id, sku, upc, brand, manufacturer, model_number,
      main_category, condition_type, country_origin, age_group, gender,
      height, width, depth, dimension_unit, weight, weight_unit,
      msrp, map_price, batch_quantity, materials_used, material_composition,
      keywords, holiday_occasion, gift_wrappable, age_restriction,
      certifications, safety_warnings, custom_fields, metrics
    } = req.body;
    
    // Update main product
    await executeQuery(`
      UPDATE products SET
        title = ?, collection_id = ?, sku = ?, upc = ?, brand = ?, manufacturer = ?, model_number = ?,
        main_category = ?, condition_type = ?, country_origin = ?, age_group = ?, gender = ?,
        height = ?, width = ?, depth = ?, dimension_unit = ?, weight = ?, weight_unit = ?,
        msrp = ?, map_price = ?, batch_quantity = ?, materials_used = ?, material_composition = ?,
        keywords = ?, holiday_occasion = ?, gift_wrappable = ?, age_restriction = ?,
        certifications = ?, safety_warnings = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [
      title, collection_id, sku, upc, brand, manufacturer, model_number,
      main_category, condition_type, country_origin, age_group, gender,
      height, width, depth, dimension_unit, weight, weight_unit,
      msrp, map_price, batch_quantity, materials_used, material_composition,
      keywords, holiday_occasion, gift_wrappable, age_restriction,
      certifications, safety_warnings, productId, getUser(req).id
    ]);
    
    // Delete and recreate custom fields
    await executeQuery('DELETE FROM product_custom_fields WHERE product_id = ?', [productId]);
    if (custom_fields && custom_fields.length > 0) {
      for (const field of custom_fields) {
        await executeQuery(`
          INSERT INTO product_custom_fields (user_id, product_id, field_name, field_value, field_type)
          VALUES (?, ?, ?, ?, ?)
        `, [getUser(req).id, productId, field.name, field.value, field.type]);
      }
    }
    
    // Delete and recreate variant metrics
    await executeQuery('DELETE FROM product_variant_metrics WHERE product_id = ?', [productId]);
    if (metrics && metrics.length > 0) {
      for (const metric of metrics) {
        const metricResult = await executeQuery(`
          INSERT INTO product_variant_metrics (user_id, product_id, metric_name)
          VALUES (?, ?, ?)
        `, [getUser(req).id, productId, metric.name]);
        
        const metricId = metricResult.insertId;
        
        for (const option of metric.options) {
          await executeQuery(`
            INSERT INTO product_variant_options (metric_id, option_value)
            VALUES (?, ?)
          `, [metricId, option]);
        }
      }
    }
    
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shipping Material Groups endpoints
router.get('/shipping/groups', async (req, res) => {
  try {
    const groups = await executeQuery(
      'SELECT * FROM shipping_material_groups WHERE user_id = ? ORDER BY name',
      [getUser(req).id]
    );
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shipping/groups', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await executeQuery(
      'INSERT INTO shipping_material_groups (user_id, name, description) VALUES (?, ?, ?)',
      [getUser(req).id, name, description]
    );
    res.json({ id: result.insertId, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/shipping/groups/:id', async (req, res) => {
  try {
    await executeQuery(
      'DELETE FROM shipping_material_groups WHERE id = ? AND user_id = ?',
      [req.params.id, getUser(req).id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Packing Materials endpoints
router.get('/shipping/materials', async (req, res) => {
  try {
    const materials = await executeQuery(`
      SELECT pm.*, smg.name as group_name 
      FROM packing_materials pm 
      JOIN shipping_material_groups smg ON pm.group_id = smg.id
      WHERE pm.user_id = ? 
      ORDER BY smg.name, pm.name
    `, [getUser(req).id]);
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shipping/materials', async (req, res) => {
  try {
    const { group_id, name, measure_unit, purchase_unit_qty, purchase_bundle_price } = req.body;
    const result = await executeQuery(`
      INSERT INTO packing_materials (user_id, group_id, name, measure_unit, purchase_unit_qty, purchase_bundle_price) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [getUser(req).id, group_id, name, measure_unit, purchase_unit_qty, purchase_bundle_price]);
    res.json({ id: result.insertId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/shipping/materials/:id', async (req, res) => {
  try {
    await executeQuery(
      'DELETE FROM packing_materials WHERE id = ? AND user_id = ?',
      [req.params.id, getUser(req).id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Product Shipping Packages endpoints
router.get('/shipping/products/:id/packages', async (req, res) => {
  try {
    const packages = await executeQuery(`
      SELECT psp.*, 
             GROUP_CONCAT(
               CONCAT(pm2.material_id, ':', pm2.quantity, ':', pm2.cost_per_unit, ':', pm2.line_cost)
             ) as materials_data
      FROM product_shipping_packages psp
      LEFT JOIN package_materials pm2 ON psp.id = pm2.package_id
      WHERE psp.product_id = ? AND psp.user_id = ?
      GROUP BY psp.id
      ORDER BY psp.package_number
    `, [req.params.id, getUser(req).id]);
    
    // Parse materials data
    const packagesWithMaterials = packages.map(pkg => ({
      ...pkg,
      materials: pkg.materials_data ? 
        pkg.materials_data.split(',').map(matData => {
          const [material_id, quantity, cost_per_unit, line_cost] = matData.split(':');
          return { material_id, quantity, cost_per_unit, line_cost };
        }) : []
    }));
    
    res.json(packagesWithMaterials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shipping/products/:id/packages', async (req, res) => {
  try {
    const { packages } = req.body;
    const productId = req.params.id;
    
    // Delete existing packages
    await executeQuery('DELETE FROM product_shipping_packages WHERE product_id = ? AND user_id = ?', 
      [productId, getUser(req).id]);
    
    // Insert new packages
    for (const pkg of packages) {
      const packageResult = await executeQuery(`
        INSERT INTO product_shipping_packages 
        (user_id, product_id, package_number, length, width, height, dimension_unit, weight, weight_unit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [getUser(req).id, productId, pkg.package_number, pkg.length, pkg.width, pkg.height, 
          pkg.dimension_unit, pkg.weight, pkg.weight_unit]);
      
      const packageId = packageResult.insertId;
      
      // Insert package materials
      for (const material of pkg.materials || []) {
        if (material.material_id && material.quantity) {
          await executeQuery(`
            INSERT INTO package_materials (package_id, material_id, quantity, cost_per_unit, line_cost)
            VALUES (?, ?, ?, ?, ?)
          `, [packageId, material.material_id, material.quantity, material.cost_per_unit, material.line_cost]);
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
