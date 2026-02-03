/**
 * Admin Refunds Service
 * Handles all incoming payments and refund processing across the platform
 * 
 * Based on the live ApplicationRefunds pattern but expanded to support multiple payment types
 */

const db = require('../../../../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Get all payments from the past N days with filters
 * Queries each payment type separately and combines results
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function listPayments(options = {}) {
  const { 
    days = 90, 
    type = 'all', 
    search = '', 
    page = 1, 
    limit = 50,
    sort = 'created_at',
    order = 'desc'
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

  let allPayments = [];

  // Query Orders (checkout)
  if (type === 'all' || type === 'checkout') {
    try {
      const [orders] = await db.query(`
        SELECT 
          o.id as payment_id,
          'checkout' as payment_type,
          o.user_id,
          CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as customer_name,
          u.username as customer_email,
          o.total_amount as original_amount,
          o.stripe_payment_intent_id,
          o.stripe_charge_id,
          o.status as payment_status,
          o.created_at,
          NULL as event_title,
          NULL as subscription_type
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE o.created_at >= ?
          AND o.stripe_payment_intent_id IS NOT NULL
          AND o.status IN ('paid', 'processing', 'shipped', 'refunded')
        ORDER BY o.created_at DESC
      `, [cutoffStr]);

      // Calculate refunded amounts for orders
      for (const order of orders) {
        const [refunds] = await db.query(
          'SELECT COALESCE(SUM(amount), 0) as refunded FROM stripe_refunds WHERE payment_intent_id = ?',
          [order.stripe_payment_intent_id]
        );
        order.refunded_amount = parseFloat(refunds[0]?.refunded || 0);
        order.original_amount = parseFloat(order.original_amount || 0);
        order.eligible_refund = Math.max(0, order.original_amount - order.refunded_amount);
      }
      allPayments = allPayments.concat(orders);
    } catch (err) {
      console.error('Error fetching orders:', err.message);
    }
  }

  // Query Application fees
  if (type === 'all' || type === 'app_fee') {
    try {
      const [appFees] = await db.query(`
        SELECT 
          afp.id as payment_id,
          'app_fee' as payment_type,
          afp.artist_id as user_id,
          CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as customer_name,
          u.username as customer_email,
          afp.amount_total as original_amount,
          afp.stripe_payment_intent_id,
          NULL as stripe_charge_id,
          afp.status as payment_status,
          afp.created_at,
          e.title as event_title,
          NULL as subscription_type,
          CASE WHEN afp.refunded_at IS NOT NULL THEN afp.amount_total ELSE 0 END as refunded_amount
        FROM application_fee_payments afp
        JOIN users u ON afp.artist_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN events e ON afp.event_id = e.id
        WHERE afp.created_at >= ?
          AND afp.status IN ('succeeded', 'refunded')
        ORDER BY afp.created_at DESC
      `, [cutoffStr]);

      for (const fee of appFees) {
        fee.original_amount = parseFloat(fee.original_amount || 0);
        fee.refunded_amount = parseFloat(fee.refunded_amount || 0);
        fee.eligible_refund = Math.max(0, fee.original_amount - fee.refunded_amount);
      }
      allPayments = allPayments.concat(appFees);
    } catch (err) {
      console.error('Error fetching app fees:', err.message);
    }
  }

  // Query Booth fees
  if (type === 'all' || type === 'booth_fee') {
    try {
      const [boothFees] = await db.query(`
        SELECT 
          ebp.id as payment_id,
          'booth_fee' as payment_type,
          ea.artist_id as user_id,
          CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as customer_name,
          u.username as customer_email,
          ebp.amount_paid as original_amount,
          ebp.stripe_payment_intent_id,
          NULL as stripe_charge_id,
          'succeeded' as payment_status,
          ebp.created_at,
          e.title as event_title,
          NULL as subscription_type
        FROM event_booth_payments ebp
        JOIN event_applications ea ON ebp.application_id = ea.id
        JOIN users u ON ea.artist_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN events e ON ea.event_id = e.id
        WHERE ebp.created_at >= ?
        ORDER BY ebp.created_at DESC
      `, [cutoffStr]);

      for (const fee of boothFees) {
        // Check for existing refunds
        const [refunds] = await db.query(
          'SELECT COALESCE(SUM(amount), 0) as refunded FROM stripe_refunds WHERE payment_intent_id = ?',
          [fee.stripe_payment_intent_id]
        );
        fee.original_amount = parseFloat(fee.original_amount || 0);
        fee.refunded_amount = parseFloat(refunds[0]?.refunded || 0);
        fee.eligible_refund = Math.max(0, fee.original_amount - fee.refunded_amount);
      }
      allPayments = allPayments.concat(boothFees);
    } catch (err) {
      console.error('Error fetching booth fees:', err.message);
    }
  }

  // Query Subscription payments
  if (type === 'all' || type === 'subscription') {
    try {
      const [subPayments] = await db.query(`
        SELECT 
          sp.id as payment_id,
          'subscription' as payment_type,
          us.user_id,
          CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as customer_name,
          u.username as customer_email,
          sp.amount as original_amount,
          sp.stripe_payment_intent_id,
          NULL as stripe_charge_id,
          sp.status as payment_status,
          sp.created_at,
          NULL as event_title,
          us.subscription_type
        FROM subscription_payments sp
        JOIN user_subscriptions us ON sp.subscription_id = us.id
        JOIN users u ON us.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE sp.created_at >= ?
          AND sp.status IN ('succeeded', 'refunded')
        ORDER BY sp.created_at DESC
      `, [cutoffStr]);

      for (const payment of subPayments) {
        payment.original_amount = parseFloat(payment.original_amount || 0);
        payment.refunded_amount = payment.payment_status === 'refunded' ? payment.original_amount : 0;
        payment.eligible_refund = Math.max(0, payment.original_amount - payment.refunded_amount);
      }
      allPayments = allPayments.concat(subPayments);
    } catch (err) {
      console.error('Error fetching subscription payments:', err.message);
    }
  }

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    allPayments = allPayments.filter(p => 
      (p.customer_name && p.customer_name.toLowerCase().includes(searchLower)) ||
      (p.customer_email && p.customer_email.toLowerCase().includes(searchLower)) ||
      (p.stripe_payment_intent_id && p.stripe_payment_intent_id.toLowerCase().includes(searchLower)) ||
      (p.event_title && p.event_title.toLowerCase().includes(searchLower))
    );
  }

  // Sort
  const sortCol = ['created_at', 'original_amount', 'customer_name', 'payment_type'].includes(sort) ? sort : 'created_at';
  allPayments.sort((a, b) => {
    let aVal = a[sortCol];
    let bVal = b[sortCol];
    if (sortCol === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  // Paginate
  const total = allPayments.length;
  const offset = (page - 1) * limit;
  const paginatedPayments = allPayments.slice(offset, offset + limit);

  return {
    payments: paginatedPayments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get a single payment by ID and type
 * @param {string} paymentType - Type of payment (checkout, app_fee, booth_fee, subscription)
 * @param {number} paymentId - Payment ID
 * @returns {Promise<Object>}
 */
async function getPayment(paymentType, paymentId) {
  let query;
  const params = [paymentId];

  switch (paymentType) {
    case 'checkout':
      query = `
        SELECT 
          o.*,
          CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as customer_name,
          u.username as customer_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE o.id = ?
      `;
      break;

    case 'app_fee':
      query = `
        SELECT 
          afp.*,
          CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as customer_name,
          u.username as customer_email,
          e.title as event_title
        FROM application_fee_payments afp
        JOIN users u ON afp.artist_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN events e ON afp.event_id = e.id
        WHERE afp.id = ?
      `;
      break;

    case 'booth_fee':
      query = `
        SELECT 
          ebp.*,
          ea.artist_id as user_id,
          CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as customer_name,
          u.username as customer_email,
          e.title as event_title
        FROM event_booth_payments ebp
        JOIN event_applications ea ON ebp.application_id = ea.id
        JOIN users u ON ea.artist_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN events e ON ea.event_id = e.id
        WHERE ebp.id = ?
      `;
      break;

    case 'subscription':
      query = `
        SELECT 
          sp.*,
          us.user_id,
          CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as customer_name,
          u.username as customer_email,
          us.subscription_type
        FROM subscription_payments sp
        JOIN user_subscriptions us ON sp.subscription_id = us.id
        JOIN users u ON us.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE sp.id = ?
      `;
      break;

    default:
      throw new Error('Invalid payment type');
  }

  const [results] = await db.query(query, params);
  if (results.length === 0) {
    const error = new Error('Payment not found');
    error.status = 404;
    throw error;
  }

  return results[0];
}

/**
 * Process a refund for any payment type
 * @param {string} paymentType - Type of payment
 * @param {number} paymentId - Payment ID
 * @param {number} amount - Refund amount
 * @param {string} reason - Refund reason
 * @param {number} adminId - Admin user ID processing the refund
 * @returns {Promise<Object>}
 */
async function processRefund(paymentType, paymentId, amount, reason, adminId) {
  // Get payment details
  const payment = await getPayment(paymentType, paymentId);
  
  // Calculate original and already refunded
  let originalAmount, paymentIntentId;
  
  switch (paymentType) {
    case 'checkout':
      originalAmount = parseFloat(payment.total_amount);
      paymentIntentId = payment.stripe_payment_intent_id;
      break;
    case 'app_fee':
      originalAmount = parseFloat(payment.amount_total);
      paymentIntentId = payment.stripe_payment_intent_id;
      break;
    case 'booth_fee':
      originalAmount = parseFloat(payment.amount_paid);
      paymentIntentId = payment.stripe_payment_intent_id;
      break;
    case 'subscription':
      originalAmount = parseFloat(payment.amount);
      paymentIntentId = payment.stripe_payment_intent_id;
      break;
    default:
      throw new Error('Invalid payment type');
  }

  // Get already refunded amount
  const [refundedRows] = await db.query(
    'SELECT COALESCE(SUM(amount), 0) as refunded FROM stripe_refunds WHERE payment_intent_id = ?',
    [paymentIntentId]
  );
  const refundedAmount = parseFloat(refundedRows[0]?.refunded || 0);
  const eligibleRefund = originalAmount - refundedAmount;

  // Validate refund amount
  if (amount <= 0) {
    throw new Error('Refund amount must be greater than 0');
  }
  if (amount > eligibleRefund) {
    throw new Error(`Refund amount ($${amount.toFixed(2)}) exceeds eligible refund amount ($${eligibleRefund.toFixed(2)})`);
  }
  if (!paymentIntentId) {
    throw new Error('No Stripe payment intent found for this payment');
  }

  // Process Stripe refund
  let stripeRefund;
  try {
    stripeRefund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        payment_type: paymentType,
        payment_id: paymentId.toString(),
        admin_id: adminId.toString(),
        admin_reason: reason || 'Admin refund'
      }
    });
  } catch (stripeError) {
    throw new Error(`Stripe refund failed: ${stripeError.message}`);
  }

  // Record refund in our database
  await db.query(`
    INSERT INTO stripe_refunds (
      payment_intent_id,
      stripe_refund_id,
      amount,
      status,
      reason,
      payment_type,
      payment_id,
      processed_by,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [
    paymentIntentId,
    stripeRefund.id,
    amount,
    stripeRefund.status,
    reason || 'Admin refund',
    paymentType,
    paymentId,
    adminId
  ]);

  // Update payment record based on type
  switch (paymentType) {
    case 'checkout':
      if (amount >= eligibleRefund) {
        await db.query('UPDATE orders SET status = ? WHERE id = ?', ['refunded', paymentId]);
      }
      break;
    case 'app_fee':
      await db.query(
        'UPDATE application_fee_payments SET status = ?, refunded_at = NOW(), refund_reason = ? WHERE id = ?',
        ['refunded', reason, paymentId]
      );
      break;
    case 'subscription':
      await db.query('UPDATE subscription_payments SET status = ? WHERE id = ?', ['refunded', paymentId]);
      break;
    // booth_fee doesn't have refund tracking currently
  }

  return {
    success: true,
    refund_id: stripeRefund.id,
    amount_refunded: amount,
    status: stripeRefund.status,
    message: `Refund of $${amount.toFixed(2)} processed successfully`
  };
}

/**
 * Get list of processed refunds
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function listRefunds(options = {}) {
  const { page = 1, limit = 50, search = '' } = options;
  const offset = (page - 1) * limit;

  // Get refunds with admin info
  const [refunds] = await db.query(`
    SELECT 
      sr.*,
      u.username as admin_email,
      CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as admin_name
    FROM stripe_refunds sr
    LEFT JOIN users u ON sr.processed_by = u.id
    LEFT JOIN user_profiles up ON sr.processed_by = up.user_id
    ORDER BY sr.created_at DESC
    LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
  `);

  // Apply search filter in JS if needed
  let filteredRefunds = refunds;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredRefunds = refunds.filter(r =>
      (r.admin_email && r.admin_email.toLowerCase().includes(searchLower)) ||
      (r.admin_name && r.admin_name.toLowerCase().includes(searchLower)) ||
      (r.stripe_refund_id && r.stripe_refund_id.toLowerCase().includes(searchLower))
    );
  }

  // Get total count
  const [countResult] = await db.query('SELECT COUNT(*) as total FROM stripe_refunds');
  const total = countResult[0]?.total || 0;

  // Get stats
  const [statsResult] = await db.query(`
    SELECT 
      COUNT(*) as total_refunds,
      COALESCE(SUM(amount), 0) as total_amount
    FROM stripe_refunds
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
  `);

  return {
    refunds: filteredRefunds,
    stats: {
      total_refunds: statsResult[0]?.total_refunds || 0,
      total_amount: parseFloat(statsResult[0]?.total_amount || 0)
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

module.exports = {
  listPayments,
  getPayment,
  processRefund,
  listRefunds
};
