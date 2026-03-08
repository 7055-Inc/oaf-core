/**
 * Shipping Service (Sub-module of Commerce)
 * Handles shipping rates, labels, and tracking
 */

const db = require('../../../../config/db');
const path = require('path');
const fs = require('fs').promises;

// Import the main shipping service for carrier integrations
let shippingService;
try {
  shippingService = require('../../../services/shippingService');
} catch (e) {
  console.warn('Shipping service not available:', e.message);
}

/**
 * Get shipping rates for an order item
 * @param {number} itemId - Order item ID
 * @param {number} vendorId - Vendor ID
 * @param {Array} packages - Optional package overrides
 * @returns {Promise<Array>}
 */
async function getRatesForItem(itemId, vendorId, packages = []) {
  // Verify ownership
  const [itemData] = await db.query(`
    SELECT oi.*, ps.*, p.vendor_id, o.id as order_id
    FROM order_items oi
    JOIN product_shipping ps ON oi.product_id = ps.product_id
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.id = ? AND oi.vendor_id = ? AND ps.package_number = 1
  `, [itemId, vendorId]);

  if (!itemData.length) {
    throw new Error('Order item not found or access denied');
  }

  const item = itemData[0];

  if (!shippingService) {
    throw new Error('Shipping service not configured');
  }

  // Get addresses
  const vendorAddress = await shippingService.getVendorAddress(item.vendor_id);
  const recipientAddress = await getShippingAddressForOrder(item.order_id);

  // Build packages array
  const shipmentPackages = packages && packages.length > 0
    ? packages.map(pkg => ({
        length: pkg.length || item.length,
        width: pkg.width || item.width,
        height: pkg.height || item.height,
        weight: pkg.weight || item.weight,
        dimension_unit: pkg.dimension_unit || item.dimension_unit,
        weight_unit: pkg.weight_unit || item.weight_unit
      }))
    : [{
        length: item.length,
        width: item.width,
        height: item.height,
        weight: item.weight,
        dimension_unit: item.dimension_unit,
        weight_unit: item.weight_unit
      }];

  // Build shipment
  const shipment = {
    shipper: { name: vendorAddress.name, address: vendorAddress },
    recipient: { name: 'Customer', address: recipientAddress },
    packages: shipmentPackages
  };

  // Get live rates
  let rates = await shippingService.calculateShippingRates(shipment);

  // Filter by allowed services if configured
  const allowedServices = item.shipping_services ? JSON.parse(item.shipping_services) : [];
  if (allowedServices.length > 0) {
    rates = rates.filter(r => allowedServices.includes(r.service));
  }

  // Prioritize selected service
  const preferred = rates.find(r => r.service === item.selected_shipping_service);
  const prioritizedRates = preferred 
    ? [preferred, ...rates.filter(r => r.service !== preferred.service)] 
    : rates;

  return prioritizedRates;
}

/**
 * Get shipping address for an order
 * @param {number} orderId - Order ID
 * @returns {Promise<Object>}
 */
async function getShippingAddressForOrder(orderId) {
  const [addresses] = await db.query(`
    SELECT * FROM shipping_addresses WHERE order_id = ?
  `, [orderId]);

  if (!addresses.length) {
    throw new Error('Shipping address not found');
  }

  const addr = addresses[0];
  return {
    name: addr.recipient_name,
    street: addr.address_line_1,
    street2: addr.address_line_2 || '',
    city: addr.city,
    state: addr.state,
    zip: addr.postal_code,
    country: addr.country || 'US',
    phone: addr.phone || ''
  };
}

/**
 * Get vendor's shipping labels
 * @param {number} vendorId - Vendor ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getVendorLabels(vendorId, options = {}) {
  const { status, limit = 100 } = options;

  let query = `
    SELECT 
      sl.id,
      sl.order_id,
      sl.order_item_id,
      sl.carrier,
      sl.service_code,
      sl.service_name,
      sl.tracking_number,
      sl.label_file_path,
      sl.cost,
      sl.currency,
      sl.status,
      sl.created_at,
      sa.recipient_name as customer_name,
      p.name as product_name,
      oi.quantity
    FROM shipping_labels sl
    JOIN order_items oi ON sl.order_item_id = oi.id
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON sl.order_id = o.id
    LEFT JOIN shipping_addresses sa ON o.id = sa.order_id
    WHERE sl.vendor_id = ?
  `;

  const params = [vendorId];

  if (status) {
    query += ' AND sl.status = ?';
    params.push(status);
  }

  query += ' ORDER BY sl.created_at DESC LIMIT ?';
  params.push(limit);

  const [labels] = await db.query(query, params);
  return labels;
}

/**
 * Cancel a shipping label
 * @param {number} labelId - Label ID
 * @param {number} vendorId - Vendor ID
 * @returns {Promise<Object>}
 */
async function cancelLabel(labelId, vendorId) {
  // Get label details
  const [labels] = await db.query(
    'SELECT * FROM shipping_labels WHERE id = ? AND vendor_id = ?',
    [labelId, vendorId]
  );

  if (!labels.length) {
    throw new Error('Label not found or access denied');
  }

  const label = labels[0];

  if (label.status === 'voided') {
    throw new Error('Label is already cancelled');
  }

  // Cancel with carrier if service is available
  if (shippingService && label.tracking_number) {
    try {
      await shippingService.cancelLabel(label.carrier, label.tracking_number);
    } catch (err) {
      console.error('Carrier cancellation failed:', err);
      // Continue anyway - update our records
    }
  }

  // Update label status
  await db.query(
    'UPDATE shipping_labels SET status = "voided", updated_at = NOW() WHERE id = ?',
    [labelId]
  );

  // Reset order item status back to pending
  await db.query(
    'UPDATE order_items SET status = "pending", shipped_at = NULL WHERE id = ?',
    [label.order_item_id]
  );

  // Remove tracking from order_item_tracking
  if (label.tracking_number) {
    await db.query(
      'DELETE FROM order_item_tracking WHERE order_item_id = ? AND tracking_number = ?',
      [label.order_item_id, label.tracking_number]
    );
  }

  return {
    success: true,
    label_id: labelId,
    tracking_number: label.tracking_number
  };
}

/**
 * Get label file path for serving
 * @param {string} filename - Label filename
 * @param {number} userId - User ID for security check
 * @returns {Promise<string>}
 */
async function getLabelFilePath(filename, userId) {
  // Security check - only allow access to user's own labels
  if (!filename.includes(`user_${userId}`)) {
    throw new Error('Access denied');
  }

  const filePath = path.join(__dirname, '../../../../labels', filename);

  // Check if file exists
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    throw new Error('Label file not found');
  }
}

/**
 * Purchase a shipping label
 * @param {number} itemId - Order item ID
 * @param {number} vendorId - Vendor ID
 * @param {Object} rateData - Selected rate and package info
 * @returns {Promise<Object>}
 */
async function purchaseLabel(itemId, vendorId, rateData) {
  const { selected_rate, packages = [] } = rateData;

  if (!selected_rate) {
    throw new Error('No rate selected');
  }

  // Verify ownership and get item details
  const [items] = await db.query(`
    SELECT oi.*, o.id as order_id, p.vendor_id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE oi.id = ? AND oi.vendor_id = ?
  `, [itemId, vendorId]);

  if (!items.length) {
    throw new Error('Order item not found or access denied');
  }

  const item = items[0];

  // Check user has active shipping subscription
  const [subscriptions] = await db.query(`
    SELECT id, stripe_customer_id, prefer_connect_balance 
    FROM user_subscriptions 
    WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'active'
  `, [vendorId]);

  if (!subscriptions.length) {
    throw new Error('Active shipping subscription required for label purchase');
  }

  if (!shippingService) {
    throw new Error('Shipping service not configured');
  }

  // Get addresses
  const vendorAddress = await shippingService.getVendorAddress(vendorId);
  const recipientAddress = await getShippingAddressForOrder(item.order_id);

  // Build shipment
  const shipment = {
    shipper: { name: vendorAddress.name, address: vendorAddress },
    recipient: { name: recipientAddress.name || 'Customer', address: recipientAddress },
    packages: packages.length > 0 ? packages : [{
      length: 12, width: 12, height: 6, weight: 1,
      dimension_unit: 'in', weight_unit: 'lb'
    }]
  };

  // Purchase label through carrier
  const labelResult = await shippingService.purchaseLabel(
    selected_rate.carrier,
    shipment,
    selected_rate
  );

  if (!labelResult || !labelResult.label_data) {
    throw new Error('Label purchase failed');
  }

  // Save label file
  const labelsDir = path.join(__dirname, '../../../../labels');
  await fs.mkdir(labelsDir, { recursive: true });

  const fileName = `user_${vendorId}_order_${item.order_id}_${Date.now()}.pdf`;
  const filePath = path.join(labelsDir, fileName);
  await fs.writeFile(filePath, Buffer.from(labelResult.label_data, 'base64'));

  // Save to database
  const [result] = await db.query(`
    INSERT INTO shipping_labels (
      order_id, order_item_id, vendor_id, package_sequence,
      carrier, service_code, service_name, tracking_number,
      label_file_path, label_format, cost, currency, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    item.order_id,
    itemId,
    vendorId,
    1,
    selected_rate.carrier,
    selected_rate.service_code,
    selected_rate.service_name || selected_rate.service,
    labelResult.tracking_number,
    `/labels/${fileName}`,
    'pdf',
    selected_rate.cost || 0,
    'USD',
    'purchased'
  ]);

  // Update order item with tracking
  await db.query(
    'UPDATE order_items SET status = "shipped", shipped_at = NOW() WHERE id = ?',
    [itemId]
  );

  // Add tracking record
  await db.query(`
    INSERT INTO order_item_tracking (order_item_id, carrier, tracking_number)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE carrier = VALUES(carrier), tracking_number = VALUES(tracking_number)
  `, [itemId, selected_rate.carrier, labelResult.tracking_number]);

  return {
    success: true,
    label_id: result.insertId,
    tracking_number: labelResult.tracking_number,
    label_url: `/api/v2/commerce/shipping/labels/${fileName}`,
    cost: selected_rate.cost
  };
}

/**
 * Get shipping subscription status
 * @param {number} userId - User ID
 * @returns {Promise<Object>}
 */
async function getSubscriptionStatus(userId) {
  // Check for active shipping subscription
  const [subscriptions] = await db.query(`
    SELECT 
      us.id,
      us.status,
      us.subscription_type,
      us.stripe_customer_id,
      us.prefer_connect_balance,
      us.created_at,
      up.shipping as has_permission
    FROM user_subscriptions us
    LEFT JOIN user_permissions up ON us.user_id = up.user_id
    WHERE us.user_id = ? AND us.subscription_type = 'shipping_labels' AND us.status = 'active'
    ORDER BY us.created_at DESC
    LIMIT 1
  `, [userId]);

  // Check if terms are accepted
  const [termsAcceptance] = await db.query(`
    SELECT uta.accepted_at
    FROM user_terms_acceptance uta
    JOIN terms_versions tv ON uta.terms_version_id = tv.id
    WHERE uta.user_id = ? AND uta.subscription_type = 'shipping_labels' AND tv.is_current = TRUE
  `, [userId]);

  const hasSubscription = subscriptions.length > 0;
  const subscription = subscriptions[0] || null;

  return {
    active: hasSubscription && subscription?.has_permission,
    status: subscription?.status || 'inactive',
    terms_accepted: termsAcceptance.length > 0,
    terms_accepted_at: termsAcceptance[0]?.accepted_at || null,
    has_permission: subscription?.has_permission === 1,
    prefer_connect_balance: subscription?.prefer_connect_balance === 1,
    created_at: subscription?.created_at || null
  };
}

/**
 * Get all labels (order + standalone) for vendor
 * @param {number} vendorId - Vendor user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getAllLabels(vendorId, options = {}) {
  const { limit = 100, type = 'all' } = options;

  if (type === 'standalone') {
    const [labels] = await db.query(`
      SELECT 
        id as db_id,
        'standalone' as type,
        NULL as order_id,
        NULL as order_item_id,
        tracking_number,
        label_file_path,
        service_name,
        cost,
        status,
        created_at,
        'N/A' as customer_name,
        'Standalone Label' as product_name,
        1 as quantity
      FROM standalone_shipping_labels
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [vendorId, limit]);
    return labels;
  }
  
  if (type === 'order') {
    const [labels] = await db.query(`
      SELECT 
        sl.id as db_id,
        'order' as type,
        sl.order_id,
        sl.order_item_id,
        sl.tracking_number,
        sl.label_file_path,
        sl.service_name,
        sl.cost,
        sl.status,
        sl.created_at,
        sa.recipient_name as customer_name,
        oi.product_name,
        oi.quantity
      FROM shipping_labels sl
      JOIN order_items oi ON sl.order_item_id = oi.id
      JOIN orders o ON sl.order_id = o.id
      LEFT JOIN shipping_addresses sa ON o.id = sa.order_id
      WHERE sl.vendor_id = ?
      ORDER BY sl.created_at DESC
      LIMIT ?
    `, [vendorId, limit]);
    return labels;
  }

  // All labels - fetch both and merge in JS
  const [orderLabels] = await db.query(`
    SELECT 
      sl.id as db_id,
      'order' as type,
      sl.order_id,
      sl.order_item_id,
      sl.tracking_number,
      sl.label_file_path,
      sl.service_name,
      sl.cost,
      sl.status,
      sl.created_at,
      sa.recipient_name as customer_name,
      oi.product_name,
      oi.quantity
    FROM shipping_labels sl
    JOIN order_items oi ON sl.order_item_id = oi.id
    JOIN orders o ON sl.order_id = o.id
    LEFT JOIN shipping_addresses sa ON o.id = sa.order_id
    WHERE sl.vendor_id = ?
    ORDER BY sl.created_at DESC
  `, [vendorId]);

  const [standaloneLabels] = await db.query(`
    SELECT 
      id as db_id,
      'standalone' as type,
      NULL as order_id,
      NULL as order_item_id,
      tracking_number,
      label_file_path,
      service_name,
      cost,
      status,
      created_at,
      'N/A' as customer_name,
      'Standalone Label' as product_name,
      1 as quantity
    FROM standalone_shipping_labels
    WHERE user_id = ?
    ORDER BY created_at DESC
  `, [vendorId]);

  // Merge and sort by created_at DESC
  const allLabels = [...orderLabels, ...standaloneLabels]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  return allLabels;
}

/**
 * Get label statistics for vendor
 * @param {number} vendorId - Vendor user ID
 * @returns {Promise<Object>}
 */
async function getLabelStats(vendorId) {
  const [orderStats] = await db.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'purchased' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'voided' THEN 1 END) as voided,
      COALESCE(SUM(CASE WHEN status = 'purchased' THEN cost END), 0) as total_spent
    FROM shipping_labels
    WHERE vendor_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `, [vendorId]);

  const [standaloneStats] = await db.query(`
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(cost), 0) as total_spent
    FROM standalone_shipping_labels
    WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `, [vendorId]);

  return {
    order_labels: {
      total: orderStats[0]?.total || 0,
      active: orderStats[0]?.active || 0,
      voided: orderStats[0]?.voided || 0,
      spent_30d: parseFloat(orderStats[0]?.total_spent || 0)
    },
    standalone_labels: {
      total: standaloneStats[0]?.total || 0,
      spent_30d: parseFloat(standaloneStats[0]?.total_spent || 0)
    },
    total_spent_30d: parseFloat(orderStats[0]?.total_spent || 0) + parseFloat(standaloneStats[0]?.total_spent || 0)
  };
}

// ============================================================================
// STANDALONE LABELS (Not tied to orders)
// ============================================================================

/**
 * Get vendor's return/ship-from address
 * Uses vendor_ship_settings table (same as legacy routes)
 * @param {number} userId - User ID (vendor_id)
 * @returns {Promise<Object>}
 */
async function getVendorAddress(userId) {
  // Get vendor address from vendor_ship_settings table
  const [vendorSettings] = await db.query(`
    SELECT 
      return_company_name as name,
      return_address_line_1 as street,
      return_address_line_2 as address_line_2,
      return_city as city,
      return_state as state,
      return_postal_code as zip,
      return_country as country,
      return_phone as phone
    FROM vendor_ship_settings 
    WHERE vendor_id = ?
  `, [userId]);

  if (vendorSettings.length === 0) {
    return {
      has_vendor_address: false,
      address: null
    };
  }

  const settings = vendorSettings[0];
  
  // Check if address is complete (required fields filled)
  const isComplete = settings.name && settings.street && settings.city && 
                    settings.state && settings.zip && settings.country;

  return {
    has_vendor_address: true,
    address: isComplete ? settings : null,
    incomplete_address: !isComplete ? settings : null
  };
}

/**
 * Save vendor shipping preferences
 * Uses vendor_ship_settings table (same as legacy routes)
 * @param {number} userId - User ID (vendor_id)
 * @param {Object} preferences - Shipping preferences
 * @returns {Promise<Object>}
 */
async function saveShippingPreferences(userId, preferences) {
  const {
    return_company_name,
    return_contact_name,
    return_address_line_1,
    return_address_line_2,
    return_city,
    return_state,
    return_postal_code,
    return_country = 'US',
    return_phone,
    label_size_preference = '4x6',
    signature_required_default = false,
    insurance_default = false
  } = preferences;

  // Upsert to vendor_ship_settings table
  await db.query(`
    INSERT INTO vendor_ship_settings (
      vendor_id, return_company_name, return_contact_name,
      return_address_line_1, return_address_line_2,
      return_city, return_state, return_postal_code,
      return_country, return_phone,
      label_size_preference, signature_required_default, insurance_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      return_company_name = VALUES(return_company_name),
      return_contact_name = VALUES(return_contact_name),
      return_address_line_1 = VALUES(return_address_line_1),
      return_address_line_2 = VALUES(return_address_line_2),
      return_city = VALUES(return_city),
      return_state = VALUES(return_state),
      return_postal_code = VALUES(return_postal_code),
      return_country = VALUES(return_country),
      return_phone = VALUES(return_phone),
      label_size_preference = VALUES(label_size_preference),
      signature_required_default = VALUES(signature_required_default),
      insurance_default = VALUES(insurance_default)
  `, [
    userId,
    return_company_name || null,
    return_contact_name || null,
    return_address_line_1 || null,
    return_address_line_2 || null,
    return_city || null,
    return_state || null,
    return_postal_code || null,
    return_country,
    return_phone || null,
    label_size_preference,
    signature_required_default ? 1 : 0,
    insurance_default ? 1 : 0
  ]);

  // Ensure user has shipping subscription (auto-create if needed, it's free)
  const [existing] = await db.query(`
    SELECT id FROM user_subscriptions 
    WHERE user_id = ? AND subscription_type = 'shipping_labels'
  `, [userId]);

  if (!existing.length) {
    await db.query(`
      INSERT INTO user_subscriptions (user_id, subscription_type, status, created_at)
      VALUES (?, 'shipping_labels', 'active', NOW())
    `, [userId]);
  }

  // Grant shipping permission
  await db.query(`
    INSERT INTO user_permissions (user_id, shipping) 
    VALUES (?, 1) 
    ON DUPLICATE KEY UPDATE shipping = 1
  `, [userId]);

  return { success: true, message: 'Preferences saved' };
}

/**
 * Get standalone shipping labels for user
 * Uses standalone_shipping_labels table (same as legacy routes)
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getStandaloneLabels(userId, options = {}) {
  const { limit = 100 } = options;

  const [labels] = await db.query(`
    SELECT 
      id as db_id,
      label_id,
      tracking_number,
      label_file_path,
      carrier,
      service_code,
      service_name,
      cost,
      status,
      created_at
    FROM standalone_shipping_labels
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `, [userId, limit]);

  return labels;
}

/**
 * Calculate shipping rates for standalone shipment
 * @param {number} userId - User ID
 * @param {Object} rateData - Addresses and packages
 * @returns {Promise<Array>}
 */
async function calculateStandaloneRates(userId, rateData) {
  const { shipper_address, recipient_address, packages } = rateData;

  if (!shipper_address || !recipient_address || !packages?.length) {
    throw new Error('Missing required address or package data');
  }

  if (!shippingService) {
    throw new Error('Shipping service not configured');
  }

  // Build shipment for rate calculation
  const shipment = {
    shipper: {
      name: shipper_address.name,
      address: {
        street: shipper_address.street,
        street2: shipper_address.address_line_2 || '',
        city: shipper_address.city,
        state: shipper_address.state,
        zip: shipper_address.zip,
        country: shipper_address.country || 'US',
        phone: shipper_address.phone || ''
      }
    },
    recipient: {
      name: recipient_address.name,
      address: {
        street: recipient_address.street,
        street2: recipient_address.address_line_2 || '',
        city: recipient_address.city,
        state: recipient_address.state,
        zip: recipient_address.zip,
        country: recipient_address.country || 'US'
      }
    },
    packages: packages.map(pkg => ({
      length: parseFloat(pkg.length) || 12,
      width: parseFloat(pkg.width) || 12,
      height: parseFloat(pkg.height) || 6,
      weight: parseFloat(pkg.weight) || 1,
      dimension_unit: pkg.dimension_unit || 'in',
      weight_unit: pkg.weight_unit || 'lb'
    }))
  };

  // Get live rates from carrier
  const rates = await shippingService.calculateShippingRates(shipment);
  
  return rates;
}

/**
 * Create a standalone shipping label
 * Delegates to main shippingService.purchaseStandaloneLabel which handles
 * carrier API, file storage, and database insertion
 * @param {number} userId - User ID
 * @param {Object} labelData - Label data
 * @returns {Promise<Object>}
 */
async function createStandaloneLabel(userId, labelData) {
  const { 
    shipper_address, 
    recipient_address, 
    packages, 
    selected_rate,
    force_card_payment = false
  } = labelData;

  if (!selected_rate) {
    throw new Error('No rate selected');
  }

  // Check user has active shipping subscription or permission
  const [permissions] = await db.query(
    'SELECT shipping FROM user_permissions WHERE user_id = ?',
    [userId]
  );

  if (!permissions.length || !permissions[0].shipping) {
    throw new Error('Shipping permission required');
  }

  if (!shippingService) {
    throw new Error('Shipping service not configured');
  }

  // Build shipment object matching shippingService expectations
  const shipment = {
    shipper: { name: shipper_address.name, address: shipper_address },
    recipient: { name: recipient_address.name, address: recipient_address },
    packages: packages.map(pkg => ({
      length: parseFloat(pkg.length) || 12,
      width: parseFloat(pkg.width) || 12,
      height: parseFloat(pkg.height) || 6,
      weight: parseFloat(pkg.weight) || 1,
      dimension_unit: pkg.dimension_unit || pkg.dimUnit || 'in',
      weight_unit: pkg.weight_unit || pkg.weightUnit || 'lb'
    })),
    user_id: userId,
    is_standalone: true
  };

  // Use the main shippingService to create label
  // This handles carrier API call, file storage, and DB insert to standalone_shipping_labels
  const labelResult = await shippingService.purchaseStandaloneLabel(
    selected_rate.carrier,
    shipment,
    selected_rate
  );

  return {
    success: true,
    label_id: labelResult.labelId,
    tracking_number: labelResult.trackingNumber,
    label_url: labelResult.labelUrl,
    cost: selected_rate.cost
  };
}

module.exports = {
  getRatesForItem,
  getShippingAddressForOrder,
  getVendorLabels,
  cancelLabel,
  getLabelFilePath,
  purchaseLabel,
  // Shipping Hub
  getSubscriptionStatus,
  getAllLabels,
  getLabelStats,
  // Standalone Labels
  getVendorAddress,
  saveShippingPreferences,
  getStandaloneLabels,
  calculateStandaloneRates,
  createStandaloneLabel,
};
