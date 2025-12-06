const express = require('express');
const router = express.Router();
const shippingService = require('../services/shippingService');
const stripeService = require('../services/stripeService');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

/**
 * Queue vendor transfer after tracking is added
 * Transfer will be created 3 days after all items are shipped (industry standard)
 * This protects buyers while still being fair to vendors
 * 
 * @param {number} orderId - Order ID to queue transfer for
 * @param {Object} connection - Database connection for transaction
 */
async function queueVendorTransferAfterTracking(orderId, connection) {
  try {
    // Check if all items for this order are shipped
    const [unshippedItems] = await connection.execute(`
      SELECT COUNT(*) as count FROM order_items 
      WHERE order_id = ? AND status != 'shipped'
    `, [orderId]);
    
    if (unshippedItems[0].count > 0) {
      // Not all items shipped yet, wait for full fulfillment
      return { queued: false, reason: 'pending_items' };
    }
    
    // Get order details including charge ID
    const [orders] = await connection.execute(`
      SELECT id, stripe_charge_id, transfer_status, transfer_eligible_date
      FROM orders 
      WHERE id = ? AND transfer_status = 'pending_fulfillment'
    `, [orderId]);
    
    if (orders.length === 0 || !orders[0].stripe_charge_id) {
      return { queued: false, reason: 'no_charge_id_or_already_transferred' };
    }
    
    // Set transfer_eligible_date to 3 days from now
    // Transfer will be processed by cron job after this date
    const TRANSFER_DELAY_DAYS = 3; // Industry standard (Shopify uses 3 days)
    
    await connection.execute(`
      UPDATE orders 
      SET transfer_status = 'pending_transfer',
          transfer_eligible_date = DATE_ADD(NOW(), INTERVAL ? DAY)
      WHERE id = ?
    `, [TRANSFER_DELAY_DAYS, orderId]);
    
    console.log(`Order ${orderId} fully shipped - transfer queued for ${TRANSFER_DELAY_DAYS} days from now`);
    
    return { 
      queued: true, 
      transfer_eligible_date: new Date(Date.now() + TRANSFER_DELAY_DAYS * 24 * 60 * 60 * 1000)
    };
    
  } catch (error) {
    console.error(`Error queuing vendor transfer for order ${orderId}:`, error);
    return { queued: false, reason: error.message };
  }
}

/**
 * @fileoverview Shipping management routes
 * 
 * Handles comprehensive shipping functionality including:
 * - Shipping rate calculations for individual products and carts
 * - Multi-carrier shipping service integration (UPS, FedEx, USPS)
 * - Shipping label generation and purchase
 * - Batch processing for multiple orders
 * - Label library management and PDF serving
 * - Label cancellation and refund processing
 * - Subscription-based label purchasing
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Calculate shipping rates for a single product
 * @route POST /api/shipping/calculate-rates
 * @access Private
 * @param {Object} req - Express request object
 * @param {number} req.body.product_id - Product ID to calculate rates for
 * @param {Object} req.body.recipient_address - Destination shipping address
 * @param {Object} res - Express response object
 * @returns {Object} Available shipping rates for the product
 */
router.post('/calculate-rates', verifyToken, async (req, res) => {
  try {
    const { product_id, recipient_address } = req.body;
    
    if (!product_id || !recipient_address) {
      return res.status(400).json({ error: 'Product ID and recipient address are required' });
    }

    // Get product shipping details
    const [productShipping] = await db.query(`
      SELECT ps.*, p.name as product_name, p.vendor_id
      FROM product_shipping ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.product_id = ?
      ORDER BY ps.package_number ASC
    `, [product_id]);

    if (!productShipping.length) {
      return res.status(404).json({ error: 'Product shipping configuration not found' });
    }

    // Check if this is calculated shipping
    if (productShipping[0].ship_method !== 'calculated') {
      return res.status(400).json({ error: 'This product does not use calculated shipping' });
    }

    // Get vendor's actual address for accurate rate calculation
    const vendorAddress = await shippingService.getVendorAddress(productShipping[0].vendor_id);
    
    // Build shipment object
    const shipment = {
      shipper: {
        name: vendorAddress.name,
        address: vendorAddress
      },
      recipient: {
        name: recipient_address.name || 'Customer',
        address: recipient_address
      },
      packages: productShipping.map(ps => ({
        length: ps.length,
        width: ps.width,
        height: ps.height,
        weight: ps.weight,
        dimension_unit: ps.dimension_unit,
        weight_unit: ps.weight_unit
      }))
    };

    // Calculate shipping rates
    const rates = await shippingService.calculateShippingRates(shipment);
    
    res.json({
      success: true,
      product_id: product_id,
      rates: rates
    });

  } catch (error) {
    console.error('Error calculating shipping rates:', error);
    res.status(500).json({ error: 'Failed to calculate shipping rates' });
  }
});

/**
 * Calculate shipping rates for multiple products in cart/checkout
 * @route POST /api/shipping/calculate-cart-shipping
 * @access Private
 * @param {Object} req - Express request object
 * @param {Array} req.body.cart_items - Array of cart items with product_id and quantity
 * @param {Object} req.body.recipient_address - Destination shipping address
 * @param {Array} req.body.test_packages - Optional test packages for rate estimation
 * @param {Object} res - Express response object
 * @returns {Object} Shipping results for all products with total cost
 */
router.post('/calculate-cart-shipping', verifyToken, async (req, res) => {
  try {
    const { cart_items, recipient_address, test_packages } = req.body;
    
    if (!cart_items || !Array.isArray(cart_items) || !recipient_address) {
      return res.status(400).json({ error: 'Cart items and recipient address are required' });
    }

    const shippingResults = [];
    
    // Process each unique product
    const uniqueProductIds = [...new Set(cart_items.map(item => item.product_id))];
    
    for (const productId of uniqueProductIds) {
      try {
        let productShipping = [];
        let shippingInfo = null;

        // Handle test packages for rate estimation
        if (productId === 'test' && test_packages) {
          // Create mock shipping data for test packages
          productShipping = test_packages.map((pkg, index) => ({
            product_id: 'test',
            package_number: index + 1,
            ship_method: 'calculated',
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            weight: pkg.weight,
            dimension_unit: pkg.dimension_unit,
            weight_unit: pkg.weight_unit,
            name: 'Test Product',
            vendor_id: 1
          }));
          shippingInfo = productShipping[0];
        } else {
          // Get product shipping details from database
          const [dbShipping] = await db.query(`
            SELECT ps.*, p.name as product_name, p.vendor_id
            FROM product_shipping ps
            JOIN products p ON ps.product_id = p.id
            WHERE ps.product_id = ?
            ORDER BY ps.package_number ASC
          `, [productId]);
          productShipping = dbShipping;
          shippingInfo = productShipping[0];
        }

        if (!productShipping.length) {
          shippingResults.push({
            product_id: productId,
            ship_method: 'free',
            cost: 0,
            error: 'No shipping configuration found'
          });
          continue;
        }
        
        if (shippingInfo.ship_method === 'free') {
          shippingResults.push({
            product_id: productId,
            ship_method: 'free',
            cost: 0
          });
        } else if (shippingInfo.ship_method === 'flat_rate') {
          const quantity = cart_items
            .filter(item => item.product_id === productId)
            .reduce((sum, item) => sum + item.quantity, 0);
          
          shippingResults.push({
            product_id: productId,
            ship_method: 'flat_rate',
            cost: parseFloat(shippingInfo.ship_rate) * quantity
          });
        } else if (shippingInfo.ship_method === 'calculated') {
          // Get vendor's actual address for accurate rate calculation
          const vendorAddress = await shippingService.getVendorAddress(productShipping[0].vendor_id);
          
          // Build shipment object
          const shipment = {
            shipper: {
              name: vendorAddress.name,
              address: vendorAddress
            },
            recipient: {
              name: recipient_address.name || 'Customer',
              address: recipient_address
            },
            packages: productShipping.map(ps => ({
              length: parseFloat(ps.length),
              width: parseFloat(ps.width),
              height: parseFloat(ps.height),
              weight: parseFloat(ps.weight),
              dimension_unit: ps.dimension_unit,
              weight_unit: ps.weight_unit
            }))
          };

          // Calculate shipping rates
          const rates = await shippingService.calculateShippingRates(shipment);
          
          // Use the cheapest rate for cost, but return all rates for selection
          const cheapestRate = rates.length > 0 ? rates[0] : null;
          
          shippingResults.push({
            product_id: productId,
            ship_method: 'calculated',
            cost: cheapestRate ? cheapestRate.cost : 0,
            available_rates: rates,
            selected_rate: cheapestRate
          });
        }
      } catch (error) {
        console.error(`Error calculating shipping for product ${productId}:`, error);
        shippingResults.push({
          product_id: productId,
          ship_method: 'free',
          cost: 0,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      shipping_results: shippingResults,
      total_shipping: shippingResults.reduce((sum, result) => sum + result.cost, 0)
    });

  } catch (error) {
    console.error('Error calculating cart shipping:', error);
    res.status(500).json({ error: 'Failed to calculate cart shipping' });
  }
});

/**
 * Get available shipping services for a product
 * @route GET /api/shipping/services/:product_id
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.product_id - Product ID to get services for
 * @param {Object} res - Express response object
 * @returns {Object} Available shipping services and methods
 */
router.get('/services/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;
    
    // Get product shipping configuration
    const [productShipping] = await db.query(`
      SELECT ps.*, p.name as product_name
      FROM product_shipping ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.product_id = ? AND ps.package_number = 1
    `, [product_id]);

    if (!productShipping.length) {
      return res.status(404).json({ error: 'Product shipping configuration not found' });
    }

    const shipping = productShipping[0];
    
    let services = [];
    
    if (shipping.ship_method === 'free') {
      services = [{
        name: 'Free Shipping',
        cost: 0,
        estimated_delivery: '5-7 business days'
      }];
    } else if (shipping.ship_method === 'flat_rate') {
      services = [{
        name: 'Standard Shipping',
        cost: parseFloat(shipping.ship_rate),
        estimated_delivery: '3-5 business days'
      }];
    } else if (shipping.ship_method === 'calculated') {
      // For calculated shipping, we'd need a destination to provide accurate rates
      services = [{
        name: 'Calculated Shipping',
        cost: 'Varies by destination',
        estimated_delivery: 'Varies by service'
      }];
    }

    res.json({
      success: true,
      product_id: product_id,
      ship_method: shipping.ship_method,
      services: services,
      shipping_services_text: shipping.shipping_services
    });

  } catch (error) {
    console.error('Error getting shipping services:', error);
    res.status(500).json({ error: 'Failed to get shipping services' });
  }
});

/**
 * Get shipping address for a specific order
 * @param {number} orderId - Order ID to get shipping address for
 * @returns {Promise<Object>} Shipping address object
 * @throws {Error} If shipping address not found
 */
async function getShippingAddressForOrder(orderId) {
  try {
    const [addressData] = await db.query(`
      SELECT sa.recipient_name as name, sa.address_line_1 as street, sa.address_line_2, sa.city, sa.state, sa.postal_code as zip, sa.country
      FROM shipping_addresses sa
      JOIN orders o ON sa.order_id = o.id
      WHERE o.id = ?
    `, [orderId]);
    
    if (addressData.length > 0) {
      return addressData[0];
    }
    
    throw new Error('Shipping address not found for order');
  } catch (error) {
    console.error('Error getting shipping address:', error);
    throw error;
  }
}

/**
 * Get live shipping rates for label generation
 * @route POST /api/shipping/get-label-rates
 * @access Private
 * @param {Object} req - Express request object
 * @param {number} req.body.item_id - Order item ID
 * @param {Array} req.body.packages - Optional package specifications
 * @param {Object} res - Express response object
 * @returns {Object} Live shipping rates for label purchase
 */
router.post('/get-label-rates', verifyToken, async (req, res) => {
  try {
    const { item_id, packages } = req.body;
    console.log('DEBUG: get-label-rates called with:', { item_id, packages });
    
    const [itemData] = await db.query(`
      SELECT oi.*, ps.*, p.vendor_id
      FROM order_items oi
      JOIN product_shipping ps ON oi.product_id = ps.product_id
      JOIN products p ON oi.product_id = p.id
      WHERE oi.id = ? AND ps.package_number = 1
    `, [item_id]);
    
    if (!itemData.length) return res.status(404).json({ error: 'Item not found' });
    
    const item = itemData[0];
    const vendorAddress = await shippingService.getVendorAddress(item.vendor_id);
    const recipientAddress = await getShippingAddressForOrder(item.order_id);
    
    // Build packages array: use provided multi-packages or fallback to single with overrides/defaults
    const shipmentPackages = packages && packages.length > 0 
      ? packages.map(pkg => ({
          length: pkg.length || item.length,
          width: pkg.width || item.width,
          height: pkg.height || item.height,
          weight: pkg.weight || item.weight,
          dimension_unit: pkg.dimUnit || item.dimension_unit,
          weight_unit: pkg.weightUnit || item.weight_unit
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
    
    // Filter/prioritize
    const allowedServices = item.shipping_services ? JSON.parse(item.shipping_services) : [];
    if (allowedServices.length > 0) rates = rates.filter(r => allowedServices.includes(r.service));
    
    const preferred = rates.find(r => r.service === item.selected_shipping_service);
    const prioritizedRates = preferred ? [preferred, ...rates.filter(r => r.service !== preferred.service)] : rates;
    
    res.json({ success: true, rates: prioritizedRates });
  } catch (error) {
    console.error('Error getting label rates:', error);
    res.status(500).json({ error: 'Failed to get rates' });
  }
});

/**
 * Process batch operations for shipping (tracking updates and label creation)
 * @route POST /api/shipping/process-batch
 * @access Private
 * @param {Object} req - Express request object
 * @param {Array} req.body.batch - Array of batch operations
 * @param {Object} res - Express response object
 * @returns {Object} Results of batch processing operations
 */
router.post('/process-batch', verifyToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { batch } = req.body; // array of { id, isGroup, type, data }
    const userId = req.userId;

    // Check if user has shipping subscription for label creation
    const hasLabelCreation = batch.some(entry => entry.type === 'label');
    if (hasLabelCreation) {
      // Verify user has active shipping subscription
      const [subscriptions] = await connection.execute(`
        SELECT id, stripe_customer_id, prefer_connect_balance 
        FROM user_subscriptions 
        WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'active'
      `, [userId]);

      if (subscriptions.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Active shipping subscription required for label creation',
          requires_subscription: true
        });
      }
    }
    
    const results = [];
    for (const entry of batch) {
      const itemIds = entry.isGroup ? mergedGroups[entry.id] : [entry.id]; // Assume mergedGroups from frontend or fetch
      if (entry.type === 'tracking') {
        const { carrier, trackingNumber } = entry.data;
        let orderId = null;
        
        for (const itemId of itemIds) {
          // Get order_id from the item
          const [itemInfo] = await connection.execute(
            'SELECT order_id FROM order_items WHERE id = ?',
            [itemId]
          );
          if (itemInfo.length > 0) {
            orderId = itemInfo[0].order_id;
          }
          
          await connection.execute(
            'INSERT INTO order_item_tracking (item_id, carrier, tracking_number, updated_at) VALUES (?, ?, ?, NOW())',
            [itemId, carrier, trackingNumber]
          );
          await connection.execute(
            'UPDATE order_items SET status = "shipped", shipped_at = NOW() WHERE id = ?',
            [itemId]
          );
        }
        
        // After tracking is added, queue the vendor transfer (3-day delay)
        if (orderId) {
          const transferResult = await queueVendorTransferAfterTracking(orderId, connection);
          results.push({ 
            id: entry.id, 
            status: 'success', 
            tracking: trackingNumber,
            transfer_queued: transferResult 
          });
        } else {
        results.push({ id: entry.id, status: 'success', tracking: trackingNumber });
        }
      } else if (entry.type === 'label') {
        const { selected_rate, packages, force_card_payment = false } = entry.data;
        
        // Get user's subscription for payment processing
        const [subscriptions] = await connection.execute(`
          SELECT id, stripe_customer_id, prefer_connect_balance 
          FROM user_subscriptions 
          WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'active'
        `, [userId]);

        const subscription = subscriptions[0]; // Already verified exists above

        // Build shipment (use first item for details)
        const [itemData] = await connection.execute(`
          SELECT oi.*, ps.*, p.vendor_id
          FROM order_items oi
          JOIN product_shipping ps ON oi.product_id = ps.product_id
          JOIN products p ON oi.product_id = p.id
          WHERE oi.id = ? AND ps.package_number = 1
        `, [itemIds[0]]);
        const item = itemData[0];
        const vendorAddress = await shippingService.getVendorAddress(item.vendor_id);
        const recipientAddress = await getShippingAddressForOrder(item.order_id);
        
        // Build packages array from provided packages data
        const shipmentPackages = packages && packages.length > 0 
          ? packages.map(pkg => ({
              length: parseFloat(pkg.length) || parseFloat(item.length),
              width: parseFloat(pkg.width) || parseFloat(item.width),
              height: parseFloat(pkg.height) || parseFloat(item.height),
              weight: parseFloat(pkg.weight) || parseFloat(item.weight),
              dimension_unit: pkg.dimUnit || item.dimension_unit,
              weight_unit: pkg.weightUnit || item.weight_unit
            }))
          : [{
              length: parseFloat(item.length),
              width: parseFloat(item.width),
              height: parseFloat(item.height),
              weight: parseFloat(item.weight),
              dimension_unit: item.dimension_unit,
              weight_unit: item.weight_unit
            }];

        // PAYMENT PROCESSING FOR ORDER LABELS
        let paymentMethod = 'card';
        const stripeService = require('../services/stripeService');

        // Try Connect balance first if preferred and not forced to card (allow negative for order labels)
        if (!force_card_payment && subscription.prefer_connect_balance && req.permissions.includes('stripe_connect')) {
          try {
            const paymentResult = await stripeService.processSubscriptionPaymentWithConnectBalance(
              userId,
              null, // No Stripe subscription for shipping
              Math.round(selected_rate.cost * 100) // Convert to cents
            );

            if (paymentResult.success) {
              paymentMethod = 'connect_balance';
              
              // Create vendor transaction record
              const [vtResult] = await connection.execute(`
                INSERT INTO vendor_transactions (
                  vendor_id, transaction_type, amount, status, created_at
                ) VALUES (?, 'shipping_charge', ?, 'completed', CURRENT_TIMESTAMP)
              `, [userId, selected_rate.cost]);

              // Will link to shipping label after creation
              var vendorTransactionId = vtResult.insertId;
            }
          } catch (connectError) {
            console.error('Connect balance payment failed, falling back to card:', connectError);
            // Fall back to card payment
          }
        }

        // Fall back to card payment if Connect balance not used or failed
        if (paymentMethod === 'card') {
          const paymentIntent = await stripeService.stripe.paymentIntents.create({
            amount: Math.round(selected_rate.cost * 100), // Convert to cents
            currency: 'usd',
            customer: subscription.stripe_customer_id,
            payment_method_types: ['card'],
            confirmation_method: 'automatic',
            confirm: true,
            off_session: true, // Use saved payment method
            metadata: {
              user_id: userId.toString(),
              subscription_id: subscription.id.toString(),
              order_id: item.order_id.toString(),
              item_ids: itemIds.join(','),
              label_type: 'order',
              platform: 'beemeeart'
            }
          });

          if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`);
          }

          var paymentIntentId = paymentIntent.id;
        }
        
        // Build complete shipment object
        const shipment = {
          shipper: { name: vendorAddress.name, address: vendorAddress },
          recipient: { name: 'Customer', address: recipientAddress },
          packages: shipmentPackages,
          vendor_id: item.vendor_id,
          item_id: itemIds[0],
          order_id: item.order_id
        };
        const labelData = await shippingService.purchaseLabel(selected_rate.carrier, shipment, selected_rate);

        // Record payment in appropriate table
        if (paymentMethod === 'connect_balance') {
          // Link vendor transaction to shipping label
          await connection.execute(
            'UPDATE shipping_labels SET vendor_transaction_id = ? WHERE id = ?',
            [vendorTransactionId, labelData.labelId]
          );
        } else {
          // Create shipping label purchase record
          await connection.execute(`
            INSERT INTO shipping_label_purchases (
              subscription_id, shipping_label_id, stripe_payment_intent_id, 
              amount, status, payment_method
            ) VALUES (?, ?, ?, ?, 'succeeded', 'card')
          `, [subscription.id, labelData.labelId, paymentIntentId, selected_rate.cost]);
        }
        
        for (const itemId of itemIds) {
          await connection.execute(
            'UPDATE order_items SET status = "shipped", shipped_at = NOW() WHERE id = ?',
            [itemId]
          );
        }
        results.push({ 
          id: entry.id, 
          status: 'success', 
          tracking: labelData.trackingNumber, 
          labelUrl: labelData.labelUrl,
          payment_method: paymentMethod,
          amount: selected_rate.cost
        });
      }
    }
    
    await connection.commit();
    res.json({ success: true, results });
  } catch (error) {
    await connection.rollback();
    console.error('Batch process error:', error);
    res.status(500).json({ error: 'Failed to process batch' });
  } finally {
    connection.release();
  }
});

/**
 * Cancel shipping label and refund cost
 * @route POST /api/shipping/cancel-label
 * @access Vendor
 * @param {Object} req - Express request object
 * @param {string} req.body.trackingNumber - Tracking number of label to cancel
 * @param {string} req.body.carrier - Shipping carrier (UPS, FedEx, USPS)
 * @param {number} req.body.labelId - Optional label ID for database lookup
 * @param {Object} res - Express response object
 * @returns {Object} Cancellation confirmation and refund details
 */
router.post('/cancel-label', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { trackingNumber, carrier, labelId } = req.body;
    const userId = req.userId;
    
    // If labelId is provided, get carrier from database
    let actualCarrier = carrier;
    if (labelId && !carrier) {
      const [labelRecords] = await db.query(
        'SELECT carrier FROM shipping_labels WHERE id = ? AND vendor_id = ?',
        [labelId, userId]
      );
      
      if (labelRecords.length === 0) {
        return res.status(403).json({ error: 'Label not found or access denied' });
      }
      
      actualCarrier = labelRecords[0].carrier;
    }
    
    if (!trackingNumber || !actualCarrier) {
      return res.status(400).json({ 
        error: 'Missing required fields: trackingNumber and carrier are required' 
      });
    }
    
    // Cancel the label with the carrier
    const result = await shippingService.cancelLabel(actualCarrier, trackingNumber);
    
    if (result.success) {
      // Update database to mark label as voided
      const connection = await db.getConnection();
      try {
        // Find the shipping label record (with vendor ownership check)
        const [labelRecords] = await connection.execute(
          'SELECT * FROM shipping_labels WHERE tracking_number = ? AND vendor_id = ?',
          [trackingNumber, userId]
        );
        
        if (labelRecords.length > 0) {
          const label = labelRecords[0];
          
          // Update label status to voided
          await connection.execute(
            'UPDATE shipping_labels SET status = ?, updated_at = NOW() WHERE id = ?',
            ['voided', label.id]
          );
          
          // Reset order item status back to pending so it can be reshipped
          await connection.execute(
            'UPDATE order_items SET status = ? WHERE id = ?',
            ['pending', label.order_item_id]
          );
          
          // Remove tracking number from order_item_tracking if exists
          await connection.execute(
            'DELETE FROM order_item_tracking WHERE order_item_id = ? AND tracking_number = ?',
            [label.order_item_id, trackingNumber]
          );
        }
        
      } finally {
        connection.release();
      }
    }
    
    res.json({
      success: true,
      message: 'Label cancelled successfully and order reset for reshipping',
      trackingNumber,
      carrier,
      result
    });
    
  } catch (error) {
    console.error('Cancel label error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel label',
      details: error.message 
    });
  }
});

/**
 * Get vendor's shipping label library
 * @route GET /api/shipping/my-labels
 * @access Vendor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Array of vendor's shipping labels with details
 */
router.get('/my-labels', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId; // Use user ID directly
    
    const [labels] = await db.query(`
      SELECT 
        sl.id,
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
      JOIN shipping_addresses sa ON o.id = sa.order_id
      WHERE sl.vendor_id = ?
      ORDER BY sl.created_at DESC
    `, [vendorId]);
    
    res.json({ success: true, labels });
    
  } catch (error) {
    console.error('Error fetching label library:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

/**
 * Serve individual shipping label PDF file
 * @route GET /api/shipping/labels/:filename
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.filename - Label filename to serve
 * @param {Object} res - Express response object
 * @returns {File} PDF file of the shipping label
 */
router.get('/labels/:filename', verifyToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.userId;
    
    // Security: Only allow access to user's own labels
    if (!filename.includes(`user_${userId}`)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const filePath = path.join(__dirname, '../../../labels', filename);
    
    // Check if file exists
    const fs = require('fs').promises;
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Label not found' });
    }
    
    // Serve the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filename)}"`);
    res.sendFile(path.resolve(filePath));
    
  } catch (error) {
    console.error('Label serving error:', error);
    res.status(500).json({ error: 'Failed to serve label' });
  }
});

/**
 * Batch merge selected labels for printing
 * @route POST /api/shipping/batch-labels
 * @access Vendor
 * @param {Object} req - Express request object
 * @param {Array} req.body.labelIds - Array of label IDs to merge
 * @param {Object} res - Express response object
 * @returns {Object} Batch processing result with download URL
 */
router.post('/batch-labels', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { labelIds } = req.body;
    const vendorId = req.user.vendor_id || req.user.id;
    
    if (!labelIds || labelIds.length === 0) {
      return res.status(400).json({ error: 'No labels selected' });
    }
    
    // Get label file paths for security check
    const placeholders = labelIds.map(() => '?').join(',');
    const [labels] = await db.query(`
      SELECT label_file_path 
      FROM shipping_labels 
      WHERE id IN (${placeholders}) AND vendor_id = ?
    `, [...labelIds, vendorId]);
    
    if (labels.length === 0) {
      return res.status(404).json({ error: 'No valid labels found' });
    }
    
    // For now, return the first label (we'll implement PDF merging later)
    const firstLabel = labels[0];
    const filename = path.basename(firstLabel.label_file_path);
    
    res.json({ 
      success: true, 
      message: `Selected ${labels.length} labels`,
      downloadUrl: `/api/shipping/labels/${filename}`,
      note: 'PDF merging coming soon - showing first label for now'
    });
    
  } catch (error) {
    console.error('Batch labels error:', error);
    res.status(500).json({ error: 'Failed to process batch labels' });
  }
});

module.exports = router; 