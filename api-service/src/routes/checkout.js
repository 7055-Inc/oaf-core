const express = require('express');
const stripeService = require('../services/stripeService');
const shippingService = require('../services/shippingService');
const db = require('../../config/db');
const authenticateToken = require('../middleware/jwt');
const router = express.Router();

/**
 * Calculate totals for cart items including commissions
 * POST /api/checkout/calculate-totals
 */
router.post('/calculate-totals', authenticateToken, async (req, res) => {
  try {
    const { cart_items, shipping_address } = req.body;
    
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ error: 'Cart items are required' });
    }

    // Get detailed product information for cart items
    const itemsWithDetails = await getCartItemsWithDetails(cart_items);
    
    // Calculate shipping costs for all items (including calculated shipping)
    const itemsWithShipping = await calculateShippingCosts(itemsWithDetails, shipping_address);
    
    // Calculate commissions for each item
    const itemsWithCommissions = await stripeService.calculateCommissions(itemsWithShipping);
    
    // Group by vendor for display
    const vendorGroups = groupItemsByVendor(itemsWithCommissions);
    
    // Calculate totals
    const totals = calculateOrderTotals(itemsWithCommissions);
    
    res.json({
      success: true,
      vendor_groups: vendorGroups,
      totals: totals,
      items_with_commissions: itemsWithCommissions
    });
    
  } catch (error) {
    console.error('Error calculating totals:', error);
    res.status(500).json({ error: 'Failed to calculate totals' });
  }
});

/**
 * Create payment intent for order
 * POST /api/checkout/create-payment-intent
 */
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { cart_items, shipping_info, billing_info } = req.body;
    const userId = req.user.userId;
    
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ error: 'Cart items are required' });
    }

    // Get cart items with details and calculate shipping costs
    const itemsWithDetails = await getCartItemsWithDetails(cart_items);
    const itemsWithShipping = await calculateShippingCosts(itemsWithDetails, shipping_info);
    const itemsWithCommissions = await stripeService.calculateCommissions(itemsWithShipping);
    
    // Calculate totals
    const totals = calculateOrderTotals(itemsWithCommissions);
    
    // Create order record
    const orderId = await createOrder(userId, totals, itemsWithCommissions);
    
    // Create Stripe payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      total_amount: totals.total_amount,
      currency: 'usd',
      metadata: {
        order_id: orderId,
        user_id: userId,
        vendor_count: totals.vendor_count
      }
    });
    
    res.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount
      },
      order_id: orderId,
      totals: totals
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * Confirm payment and finalize order
 * POST /api/checkout/confirm-payment
 */
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { payment_intent_id, order_id } = req.body;
    const userId = req.user.userId;
    
    if (!payment_intent_id || !order_id) {
      return res.status(400).json({ error: 'Payment intent ID and order ID are required' });
    }

    // Verify order belongs to user
    const order = await getOrderById(order_id);
    if (!order || order.user_id !== userId) {
      return res.status(403).json({ error: 'Order not found or access denied' });
    }

    // Update order with payment intent ID
    await updateOrderPaymentIntent(order_id, payment_intent_id);
    
    // Clear user's cart
    await clearUserCart(userId);
    
    res.json({
      success: true,
      message: 'Payment confirmed, order processing',
      order_id: order_id
    });
    
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

/**
 * Get payment status
 * GET /api/checkout/payment-status/:order_id
 */
router.get('/payment-status/:order_id', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.params;
    const userId = req.user.userId;
    
    const order = await getOrderById(order_id);
    if (!order || order.user_id !== userId) {
      return res.status(403).json({ error: 'Order not found or access denied' });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        stripe_payment_intent_id: order.stripe_payment_intent_id
      }
    });
    
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * Get order details with items
 * GET /api/checkout/order/:order_id
 */
router.get('/order/:order_id', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.params;
    const userId = req.user.userId;
    
    const order = await getOrderWithItems(order_id);
    if (!order || order.user_id !== userId) {
      return res.status(403).json({ error: 'Order not found or access denied' });
    }

    res.json({
      success: true,
      order: order
    });
    
  } catch (error) {
    console.error('Error getting order details:', error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Get cart items with product details
 */
async function getCartItemsWithDetails(cartItems) {
  const productIds = cartItems.map(item => item.product_id);
  
  const query = `
    SELECT 
      p.id,
      p.name as title,
      p.price,
      p.vendor_id,
      u.username as vendor_name,
      ps.ship_method,
      ps.ship_rate,
      ps.shipping_services
    FROM products p
    LEFT JOIN users u ON p.vendor_id = u.id
    LEFT JOIN product_shipping ps ON p.id = ps.product_id AND ps.package_number = 1
    WHERE p.id IN (${productIds.map(() => '?').join(',')})
  `;
  
  const [products] = await db.execute(query, productIds);
  
  // Merge cart quantities with product details 
  return cartItems.map(cartItem => {
    const product = products.find(p => p.id === cartItem.product_id);
    if (!product) {
      throw new Error(`Product ${cartItem.product_id} not found`);
    }
    
    return {
      product_id: product.id,
      vendor_id: product.vendor_id,
      vendor_name: product.vendor_name,
      title: product.title,
      quantity: cartItem.quantity,
      price: product.price * cartItem.quantity,
      shipping_cost: 0, // Will be calculated in calculateShippingCosts
      ship_method: product.ship_method || 'free'
    };
  });
}

/**
 * Calculate shipping costs for cart items
 */
async function calculateShippingCosts(items, shippingAddress) {
  const itemsWithShipping = [];
  
  for (const item of items) {
    let shippingCost = 0;
    
    if (item.ship_method === 'free') {
      shippingCost = 0;
    } else if (item.ship_method === 'flat_rate') {
      // Get the flat rate for this product
      const [shippingData] = await db.execute(`
        SELECT ship_rate FROM product_shipping 
        WHERE product_id = ? AND package_number = 1
      `, [item.product_id]);
      
      if (shippingData.length > 0 && shippingData[0].ship_rate) {
        shippingCost = parseFloat(shippingData[0].ship_rate) * item.quantity;
      }
    } else if (item.ship_method === 'calculated' && shippingAddress) {
      // Use calculated shipping with carrier APIs
      try {
        const [productShipping] = await db.execute(`
          SELECT ps.*, p.vendor_id
          FROM product_shipping ps
          JOIN products p ON ps.product_id = p.id
          WHERE ps.product_id = ?
          ORDER BY ps.package_number ASC
        `, [item.product_id]);
        
        if (productShipping.length > 0) {
          // Get company address
          const companyAddress = await shippingService.getCompanyAddress();
          
          // Build shipment object
          const shipment = {
            shipper: {
              name: companyAddress.name,
              accountNumber: '', // TODO: Get from vendor settings
              address: companyAddress
            },
            recipient: {
              name: shippingAddress.name || 'Customer',
              address: shippingAddress
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
          
          // Use the cheapest rate
          if (rates.length > 0) {
            shippingCost = rates[0].cost;
          }
        }
      } catch (error) {
        console.error(`Error calculating shipping for product ${item.product_id}:`, error);
        // Fall back to free shipping if calculation fails
        shippingCost = 0;
      }
    }
    
    itemsWithShipping.push({
      ...item,
      shipping_cost: shippingCost
    });
  }
  
  return itemsWithShipping;
}

/**
 * Group items by vendor for display
 */
function groupItemsByVendor(items) {
  const groups = {};
  
  items.forEach(item => {
    if (!groups[item.vendor_id]) {
      groups[item.vendor_id] = {
        vendor_id: item.vendor_id,
        vendor_name: item.vendor_name,
        items: [],
        subtotal: 0,
        shipping_total: 0,
        commission_total: 0
      };
    }
    
    groups[item.vendor_id].items.push(item);
    groups[item.vendor_id].subtotal += item.price;
    groups[item.vendor_id].shipping_total += item.shipping_cost;
    groups[item.vendor_id].commission_total += item.commission_amount;
  });
  
  return Object.values(groups);
}

/**
 * Calculate order totals
 */
function calculateOrderTotals(items) {
  const totals = {
    subtotal: 0,
    shipping_total: 0,
    tax_total: 0, // TODO: Implement tax calculation
    platform_fee_total: 0,
    total_amount: 0,
    vendor_count: new Set(items.map(item => item.vendor_id)).size
  };
  
  items.forEach(item => {
    totals.subtotal += item.price;
    totals.shipping_total += item.shipping_cost;
    totals.platform_fee_total += item.commission_amount;
  });
  
  totals.total_amount = totals.subtotal + totals.shipping_total + totals.tax_total;
  
  return totals;
}

/**
 * Create order record
 */
async function createOrder(userId, totals, items) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Create order
    const orderQuery = `
      INSERT INTO orders 
      (user_id, total_amount, shipping_amount, tax_amount, platform_fee_amount, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `;
    
    const [orderResult] = await connection.execute(orderQuery, [
      userId,
      totals.total_amount,
      totals.shipping_total,
      totals.tax_total,
      totals.platform_fee_total
    ]);
    
    const orderId = orderResult.insertId;
    
    // Create order items
    const itemQuery = `
      INSERT INTO order_items 
      (order_id, product_id, vendor_id, quantity, price, shipping_cost, commission_rate, commission_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    for (const item of items) {
      await connection.execute(itemQuery, [
        orderId,
        item.product_id,
        item.vendor_id,
        item.quantity,
        item.price,
        item.shipping_cost || 0,
        item.commission_rate || 15.00,
        item.commission_amount || 0
      ]);
    }
    
    await connection.commit();
    return orderId;
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get order by ID
 */
async function getOrderById(orderId) {
  const query = 'SELECT * FROM orders WHERE id = ?';
  const [rows] = await db.execute(query, [orderId]);
  return rows[0] || null;
}

/**
 * Get order with items
 */
async function getOrderWithItems(orderId) {
  const orderQuery = 'SELECT * FROM orders WHERE id = ?';
  const [orderRows] = await db.execute(orderQuery, [orderId]);
  
  if (orderRows.length === 0) {
    return null;
  }
  
  const order = orderRows[0];
  
  const itemsQuery = `
    SELECT 
      oi.*,
      p.title as product_title,
      u.username as vendor_name
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN users u ON oi.vendor_id = u.id
    WHERE oi.order_id = ?
  `;
  
  const [itemRows] = await db.execute(itemsQuery, [orderId]);
  
  order.items = itemRows;
  return order;
}

/**
 * Update order with payment intent ID
 */
async function updateOrderPaymentIntent(orderId, paymentIntentId) {
  const query = `
    UPDATE orders 
    SET stripe_payment_intent_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  return db.execute(query, [paymentIntentId, orderId]);
}

/**
 * Clear user's cart
 */
async function clearUserCart(userId) {
  const query = 'DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)';
  return db.execute(query, [userId]);
}

module.exports = router; 