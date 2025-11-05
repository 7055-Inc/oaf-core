const express = require('express');
const stripeService = require('../services/stripeService');
const shippingService = require('../services/shippingService');
const discountService = require('../services/discountService');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { orderHistoryLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

/**
 * @fileoverview Checkout process management routes
 * 
 * Handles comprehensive checkout functionality including:
 * - Cart totals calculation with shipping, tax, and commissions
 * - Payment intent creation with Stripe integration
 * - Tax calculation using Stripe Tax API
 * - Order creation and management
 * - Payment confirmation and order finalization
 * - Order history and status tracking
 * - Coupon and discount management
 * - Multi-vendor order processing
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Calculate comprehensive totals for cart items including shipping, tax, and commissions
 * @route POST /api/checkout/calculate-totals
 * @access Private
 * @param {Object} req - Express request object
 * @param {Array} req.body.cart_items - Array of cart items with product_id and quantity
 * @param {Object} req.body.shipping_address - Shipping address for rate calculation
 * @param {Array} req.body.applied_coupons - Array of applied coupon codes
 * @param {Object} res - Express response object
 * @returns {Object} Comprehensive totals with vendor groups and commission details
 */
router.post('/calculate-totals', verifyToken, async (req, res) => {
  try {
    const { cart_items, shipping_address, applied_coupons = [] } = req.body;
    
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ error: 'Cart items are required' });
    }

    // Get detailed product information for cart items
    const itemsWithDetails = await getCartItemsWithDetails(cart_items);
    
    // Calculate shipping costs for all items (including calculated shipping)
    const itemsWithShipping = await calculateShippingCosts(itemsWithDetails, shipping_address);
    
    // **NEW: Apply discounts after shipping calculation**
    const itemsWithDiscounts = await discountService.applyDiscounts(itemsWithShipping, req.userId, applied_coupons);
    
    // Calculate commissions for each item (on discounted prices)
    const itemsWithCommissions = await stripeService.calculateCommissions(itemsWithDiscounts);
    
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
 * Create Stripe payment intent for order with tax calculation
 * @route POST /api/checkout/create-payment-intent
 * @access Private
 * @param {Object} req - Express request object
 * @param {Array} req.body.cart_items - Array of cart items
 * @param {Object} req.body.shipping_info - Shipping address information
 * @param {Object} req.body.billing_info - Billing address and customer information
 * @param {Object} res - Express response object
 * @returns {Object} Payment intent details, order ID, and calculated totals
 */
router.post('/create-payment-intent', verifyToken, async (req, res) => {
  try {
    const { cart_items, shipping_info, billing_info } = req.body;
    const userId = req.userId;
    
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
    
    // Calculate tax using Stripe Tax API
    let taxCalculation = null;
    let taxAmount = 0;
    
    if (billing_info && billing_info.address) {
      try {
        // Prepare line items for tax calculation
        const line_items = itemsWithCommissions.map((item, index) => ({
          amount: Math.round(item.price * 100), // Convert to cents
          reference: `L${index + 1}`
        }));

        // Calculate tax
        taxCalculation = await stripeService.calculateTax({
          line_items: line_items,
          customer_address: {
            line1: billing_info.address.line1,
            line2: billing_info.address.line2 || null,
            city: billing_info.address.city,
            state: billing_info.address.state,
            postal_code: billing_info.address.postal_code,
            country: billing_info.address.country || 'US'
          },
          currency: 'usd'
        });

        // Get tax amount from calculation
        taxAmount = taxCalculation.tax_amount_exclusive / 100; // Convert from cents
        
        console.log('Tax calculated:', {
          subtotal: totals.subtotal,
          tax_amount: taxAmount,
          total_with_tax: totals.subtotal + taxAmount
        });
        
        // Store tax calculation data in database
        try {
          const taxRecordId = await stripeService.storeTaxCalculation({
            order_id: orderId,
            stripe_tax_id: taxCalculation.id,
            stripe_payment_intent_id: null, // Will be updated after payment intent creation
            customer_state: billing_info.address.state,
            customer_zip: billing_info.address.postal_code,
            taxable_amount: totals.subtotal,
            tax_collected: taxAmount,
            tax_rate_used: taxCalculation.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal || 0,
            tax_breakdown: taxCalculation.tax_breakdown,
            order_date: new Date().toISOString().split('T')[0]
          });
          
          // Update order with tax amount
          await stripeService.updateOrderTaxAmount(orderId, taxAmount);
          
          // Create order tax summary for Phase 2 enhanced tracking
          try {
            await stripeService.createOrderTaxSummary(orderId, taxRecordId);
            console.log('Order tax summary created for order:', orderId);
          } catch (error) {
            console.error('Error creating order tax summary:', error);
            // Continue without order tax summary
          }
          
          console.log('Tax data stored in database for order:', orderId);
        } catch (error) {
          console.error('Error storing tax data:', error);
          // Continue without storing tax data
        }
        
      } catch (error) {
        console.error('Error calculating tax:', error);
        // Continue without tax calculation
      }
    }

    // Create or get Stripe customer
    let customerId = null;
    if (billing_info && billing_info.email) {
      try {
        const customer = await stripeService.createOrGetCustomer(userId, billing_info.email, billing_info.name);
        customerId = customer.id;
        
        // Update customer address
        if (billing_info.address) {
          await stripeService.updateCustomerAddress(customerId, billing_info.address);
        }
      } catch (error) {
        console.error('Error creating/updating customer:', error);
      }
    }
    
    // Update totals with tax
    const totalWithTax = totals.subtotal + totals.shipping_total + taxAmount;
    
    // Create Stripe payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      total_amount: totalWithTax,
      currency: 'usd',
      customer_id: customerId,
      metadata: {
        order_id: orderId,
        user_id: userId,
        vendor_count: totals.vendor_count,
        tax_calculation_id: taxCalculation?.id || null
      }
    });

    // Update tax record with payment intent ID if tax was calculated
    if (taxCalculation) {
      try {
        const updateQuery = `
          UPDATE stripe_tax_transactions 
          SET stripe_payment_intent_id = ? 
          WHERE order_id = ? AND stripe_tax_id = ?
        `;
        await db.execute(updateQuery, [paymentIntent.id, orderId, taxCalculation.id]);
      } catch (error) {
        console.error('Error updating tax record with payment intent ID:', error);
      }
    }
    
    res.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount
      },
      order_id: orderId,
      totals: {
        ...totals,
        tax_amount: taxAmount,
        total_with_tax: totalWithTax
      },
      tax_info: taxCalculation ? {
        calculation_id: taxCalculation.id,
        tax_amount: taxAmount,
        tax_breakdown: taxCalculation.tax_breakdown
      } : null
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * Confirm payment and finalize order processing
 * @route POST /api/checkout/confirm-payment
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.body.payment_intent_id - Stripe payment intent ID
 * @param {number} req.body.order_id - Order ID to confirm
 * @param {Object} res - Express response object
 * @returns {Object} Confirmation of payment and order processing status
 */
router.post('/confirm-payment', verifyToken, async (req, res) => {
  try {
    const { payment_intent_id, order_id } = req.body;
    const userId = req.userId;
    
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
    
    // Create tax transaction if tax was calculated
    try {
      const [taxRecords] = await db.execute(
        'SELECT stripe_tax_id FROM stripe_tax_transactions WHERE order_id = ?',
        [order_id]
      );
      
      if (taxRecords.length > 0 && taxRecords[0].stripe_tax_id) {
        await stripeService.createTaxTransaction(
          taxRecords[0].stripe_tax_id,
          `order_${order_id}`
        );
        console.log('Tax transaction created for order:', order_id);
      }
    } catch (error) {
      console.error('Error creating tax transaction:', error);
      // Continue without tax transaction
    }
    
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
 * Get payment status for a specific order
 * @route GET /api/checkout/payment-status/:order_id
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.order_id - Order ID to check status
 * @param {Object} res - Express response object
 * @returns {Object} Order payment status and basic details
 */
router.get('/payment-status/:order_id', verifyToken, async (req, res) => {
  try {
    const { order_id } = req.params;
    const userId = req.userId;
    
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
 * Get comprehensive order details with all items
 * @route GET /api/checkout/order/:order_id
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.order_id - Order ID to retrieve
 * @param {Object} res - Express response object
 * @returns {Object} Complete order details including items and vendor information
 */
router.get('/order/:order_id', verifyToken, async (req, res) => {
  try {
    const { order_id } = req.params;
    const userId = req.userId;
    
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

/**
 * Get customer's order history with pagination and filtering
 * @route GET /api/checkout/orders/my
 * @access Private
 * @param {Object} req - Express request object
 * @param {number} req.query.page - Page number for pagination (default: 1)
 * @param {number} req.query.limit - Items per page (default: 20)
 * @param {string} req.query.status - Filter by order status (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Paginated order history with tracking information
 */
router.get('/orders/my', orderHistoryLimiter, verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    
    // Build query with optional status filter
    let whereClause = 'WHERE o.user_id = ?';
    const params = [userId];
    
    if (status && status !== 'all') {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    // Get orders for this customer
    const ordersQuery = `
      SELECT 
        o.id,
        o.stripe_payment_intent_id,
        o.status,
        o.total_amount,
        o.shipping_amount,
        o.tax_amount,
        o.platform_fee_amount,
        o.created_at,
        o.updated_at,
        oi.id as item_id,
        oi.quantity,
        oi.price,
        oi.commission_rate,
        oi.commission_amount,
        oi.shipping_cost,
        oi.status as item_status,
        oi.shipped_at,
        oi.vendor_id,
        oi.selected_shipping_service,
        oi.shipping_rate,
        p.name as product_name,
        p.id as product_id,
        u.username as vendor_email,
        up.display_name as vendor_name,
        up.first_name as vendor_first_name,
        up.last_name as vendor_last_name,
        oit.carrier,
        oit.tracking_number,
        oit.updated_at as tracking_updated,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = oi.product_id 
          ORDER BY \`order\` ASC 
          LIMIT 1
        ) AS product_thumbnail
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON oi.vendor_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN order_item_tracking oit ON oi.id = oit.order_item_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [orders] = await db.execute(ordersQuery, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
    `;
    
    const [countResult] = await db.execute(countQuery, params);
    const totalOrders = countResult[0].total;
    
    // Group orders by order ID (customer perspective - showing what they bought)
    const groupedOrders = {};
    orders.forEach(order => {
      if (!groupedOrders[order.id]) {
        groupedOrders[order.id] = {
          id: order.id,
          stripe_payment_intent_id: order.stripe_payment_intent_id,
          status: order.status,
          total_amount: parseFloat(order.total_amount),
          shipping_amount: parseFloat(order.shipping_amount),
          tax_amount: parseFloat(order.tax_amount),
          platform_fee_amount: parseFloat(order.platform_fee_amount),
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: []
        };
      }
      
      groupedOrders[order.id].items.push({
        item_id: order.item_id,
        product_id: order.product_id,
        product_name: order.product_name,
        product_thumbnail: order.product_thumbnail,
        quantity: order.quantity,
        price: parseFloat(order.price),
        shipping_cost: parseFloat(order.shipping_cost),
        item_status: order.item_status,
        shipped_at: order.shipped_at,
        vendor_id: order.vendor_id,
        vendor_email: order.vendor_email,
        vendor_name: order.vendor_name || `${order.vendor_first_name || ''} ${order.vendor_last_name || ''}`.trim() || order.vendor_email,
        selected_shipping_service: order.selected_shipping_service,
        shipping_rate: parseFloat(order.shipping_rate || 0),
        tracking: order.tracking_number ? {
          carrier: order.carrier,
          tracking_number: order.tracking_number,
          updated_at: order.tracking_updated
        } : null,
        item_total: parseFloat(order.price) * order.quantity
      });
    });
    
    // Convert to array
    const ordersList = Object.values(groupedOrders);
    
    res.json({
      success: true,
      orders: ordersList,
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Get cart items with comprehensive product details
 * @param {Array} cartItems - Array of cart items with product_id and quantity
 * @returns {Promise<Array>} Array of items with product details and shipping info
 * @throws {Error} If product not found
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
 * Calculate shipping costs for cart items using various methods
 * @param {Array} items - Array of cart items with product details
 * @param {Object} shippingAddress - Destination shipping address
 * @returns {Promise<Array>} Items with calculated shipping costs and options
 */
async function calculateShippingCosts(items, shippingAddress) {
  const itemsWithShipping = [];
  
  for (const item of items) {
    let shippingCost = 0;
    let shippingOptions = []; // New: array of available options
    
    if (item.ship_method === 'free') {
      shippingCost = 0;
      shippingOptions = [{ service: 'Free Shipping', cost: 0 }];
    } else if (item.ship_method === 'flat_rate') {
      // Existing flat rate logic
      const [shippingData] = await db.execute(`
        SELECT ship_rate, shipping_services FROM product_shipping 
        WHERE product_id = ? AND package_number = 1
      `, [item.product_id]);
      
      if (shippingData.length > 0 && shippingData[0].ship_rate) {
        shippingCost = parseFloat(shippingData[0].ship_rate) * item.quantity;
        shippingOptions = [{ service: 'Flat Rate', cost: shippingCost }];
      }
    } else if (item.ship_method === 'calculated' && shippingAddress) {
      // Enhanced calculated logic
      try {
        const [productShipping] = await db.execute(`
          SELECT ps.*, p.vendor_id
          FROM product_shipping ps
          JOIN products p ON ps.product_id = p.id
          WHERE ps.product_id = ?
          ORDER BY ps.package_number ASC
        `, [item.product_id]);
        
        if (productShipping.length > 0) {
          const companyAddress = await shippingService.getCompanyAddress();
          
          const shipment = {
            shipper: {
              name: companyAddress.name,
              accountNumber: '',
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
          
          let rates = await shippingService.calculateShippingRates(shipment);
          
          // Filter by allowed shipping_services if specified
          const allowedServices = productShipping[0].shipping_services ? JSON.parse(productShipping[0].shipping_services) : null;
          if (allowedServices && allowedServices.length > 0) {
            rates = rates.filter(rate => allowedServices.includes(rate.service));
          }
          
          shippingOptions = rates.map(rate => ({
            service: rate.service,
            cost: rate.cost
          }));
          
          // Use cheapest for initial cost
          if (rates.length > 0) {
            shippingCost = Math.min(...rates.map(r => r.cost)) * item.quantity; // Multiply by quantity if applicable
          }
        }
      } catch (error) {
        console.error(`Error calculating shipping for product ${item.product_id}:`, error);
        shippingCost = 0;
        shippingOptions = [];
      }
    }
    
    itemsWithShipping.push({
      ...item,
      shipping_cost: shippingCost,
      shipping_options: shippingOptions // New field
    });
  }
  
  return itemsWithShipping;
}

/**
 * Group cart items by vendor for organized display
 * @param {Array} items - Array of cart items with vendor information
 * @returns {Array} Array of vendor groups with subtotals
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
 * Calculate comprehensive order totals including all fees
 * @param {Array} items - Array of cart items with pricing information
 * @returns {Object} Complete totals breakdown
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
 * Create order record with transaction safety
 * @param {number} userId - User ID creating the order
 * @param {Object} totals - Calculated order totals
 * @param {Array} items - Array of order items
 * @returns {Promise<number>} Created order ID
 * @throws {Error} If order creation fails
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
      (order_id, product_id, vendor_id, quantity, price, shipping_cost, commission_rate, commission_amount, selected_shipping_service, shipping_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        item.commission_amount || 0,
        item.selected_shipping_service || null, // New
        item.selected_shipping_rate || item.shipping_cost // New, fallback to calculated if not selected
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
 * Get order by ID with basic information
 * @param {number} orderId - Order ID to retrieve
 * @returns {Promise<Object|null>} Order object or null if not found
 */
async function getOrderById(orderId) {
  const query = 'SELECT * FROM orders WHERE id = ?';
  const [rows] = await db.execute(query, [orderId]);
  return rows[0] || null;
}

/**
 * Get order with complete item details and vendor information
 * @param {number} orderId - Order ID to retrieve
 * @returns {Promise<Object|null>} Order with items array or null if not found
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
 * Update order with Stripe payment intent ID and status
 * @param {number} orderId - Order ID to update
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @returns {Promise} Database update result
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
 * Clear all items from user's cart after successful order
 * @param {number} userId - User ID whose cart to clear
 * @returns {Promise} Database deletion result
 */
async function clearUserCart(userId) {
  const query = 'DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)';
  return db.execute(query, [userId]);
}

/**
 * Validate and apply coupon code to cart items
 * @route POST /api/checkout/apply-coupon
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.body.coupon_code - Coupon code to apply
 * @param {Array} req.body.cart_items - Array of cart items
 * @param {Object} res - Express response object
 * @returns {Object} Coupon validation result and discounted items
 */
router.post('/apply-coupon', verifyToken, async (req, res) => {
  try {
    const { coupon_code, cart_items } = req.body;
    
    if (!coupon_code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }
    
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ error: 'Cart items are required' });
    }
    
    // Get detailed product information for cart items
    const itemsWithDetails = await getCartItemsWithDetails(cart_items);
    
    // Validate coupon code
    const validation = await discountService.validateCouponCode(coupon_code, req.userId, itemsWithDetails);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      });
    }
    
    // Apply coupon to get preview of discounts
    const itemsWithDiscounts = await discountService.applyDiscounts(itemsWithDetails, req.userId, [coupon_code]);
    
    res.json({
      success: true,
      coupon: validation.coupon,
      items_with_discounts: itemsWithDiscounts,
      message: 'Coupon applied successfully'
    });
    
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
});

/**
 * Remove applied coupon from cart items
 * @route POST /api/checkout/remove-coupon
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.body.coupon_code - Coupon code to remove
 * @param {Array} req.body.cart_items - Array of cart items
 * @param {Object} res - Express response object
 * @returns {Object} Items without the removed coupon discount
 */
router.post('/remove-coupon', verifyToken, async (req, res) => {
  try {
    const { coupon_code, cart_items } = req.body;
    
    if (!coupon_code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }
    
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ error: 'Cart items are required' });
    }
    
    // Get detailed product information for cart items
    const itemsWithDetails = await getCartItemsWithDetails(cart_items);
    
    // Return items without the removed coupon (empty coupon array)
    const itemsWithoutCoupon = await discountService.applyDiscounts(itemsWithDetails, req.userId, []);
    
    res.json({
      success: true,
      items_without_coupon: itemsWithoutCoupon,
      message: 'Coupon removed successfully'
    });
    
  } catch (error) {
    console.error('Error removing coupon:', error);
    res.status(500).json({ error: 'Failed to remove coupon' });
  }
});

/**
 * Get applicable auto-apply discounts for cart items
 * @route POST /api/checkout/get-auto-discounts
 * @access Private
 * @param {Object} req - Express request object
 * @param {Array} req.body.cart_items - Array of cart items
 * @param {Object} res - Express response object
 * @returns {Object} Items with automatically applied discounts
 */
router.post('/get-auto-discounts', verifyToken, async (req, res) => {
  try {
    const { cart_items } = req.body;
    
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ error: 'Cart items are required' });
    }
    
    // Get detailed product information for cart items
    const itemsWithDetails = await getCartItemsWithDetails(cart_items);
    
    // Apply auto-discounts only (no coupon codes)
    const itemsWithAutoDiscounts = await discountService.applyDiscounts(itemsWithDetails, req.userId, []);
    
    // Filter to only items that have auto-applied discounts
    const autoDiscountedItems = itemsWithAutoDiscounts.filter(item => 
      item.discount_applied && 
      item.discount_details && 
      item.discount_details.source_type !== 'coupon'
    );
    
    res.json({
      success: true,
      auto_discounted_items: autoDiscountedItems,
      items_with_auto_discounts: itemsWithAutoDiscounts
    });
    
  } catch (error) {
    console.error('Error getting auto-discounts:', error);
    res.status(500).json({ error: 'Failed to get auto-discounts' });
  }
});

/**
 * Validate coupon code without applying it to cart
 * @route GET /api/checkout/validate-coupon/:code
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.code - Coupon code to validate
 * @param {string} req.query.cart_items - JSON string of cart items (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Coupon validation status and details
 */
router.get('/validate-coupon/:code', verifyToken, async (req, res) => {
  try {
    const { code } = req.params;
    const { cart_items } = req.query;
    
    let parsedCartItems = [];
    if (cart_items) {
      try {
        parsedCartItems = JSON.parse(cart_items);
      } catch (e) {
        // If parsing fails, continue with empty array
      }
    }
    
    // Get detailed product information if cart items provided
    let itemsWithDetails = [];
    if (parsedCartItems.length > 0) {
      itemsWithDetails = await getCartItemsWithDetails(parsedCartItems);
    }
    
    const validation = await discountService.validateCouponCode(code, req.userId, itemsWithDetails);
    
    res.json({
      success: validation.valid,
      coupon: validation.coupon || null,
      error: validation.error || null
    });
    
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

module.exports = router; 