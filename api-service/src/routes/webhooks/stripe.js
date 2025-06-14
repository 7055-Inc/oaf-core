const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('../../services/stripeService');
const db = require('../../../config/db');
const router = express.Router();

// Webhook endpoint secret for signature verification
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Raw body parser for webhook signature verification
router.use('/stripe', express.raw({ type: 'application/json' }));

/**
 * Main Stripe webhook handler
 */
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log(`✅ Webhook verified: ${event.type}`);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error(`❌ Webhook handler error: ${error.message}`);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Route webhook events to appropriate handlers
 */
async function handleWebhookEvent(event) {
  const handlers = {
    // Payment events
    'payment_intent.succeeded': handlePaymentSuccess,
    'payment_intent.payment_failed': handlePaymentFailure,
    
    // Transfer events
    'transfer.created': handleTransferCreated,
    'transfer.reversed': handleTransferReversed,
    'transfer.updated': handleTransferUpdated,
    
    // Payout events
    'payout.paid': handlePayoutCompleted,
    'payout.failed': handlePayoutFailed,
    
    // Subscription events
    'invoice.payment_paid': handleSubscriptionPayment,
    
    // Account events
    'account.updated': handleAccountUpdate,
    
    // Dispute events
    'charge.dispute.created': handleDisputeCreated,
    'charge.dispute.closed': handleDisputeClosed,
  };

  const handler = handlers[event.type];
  if (handler) {
    await handler(event.data.object, event);
  } else {
    console.log(`⚠️ Unhandled event type: ${event.type}`);
  }
}

// ===== PAYMENT EVENT HANDLERS =====

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent, event) {
  console.log(`💰 Payment succeeded: ${paymentIntent.id}`);
  
  try {
    const orderId = paymentIntent.metadata.order_id;
    if (!orderId) {
      console.error('No order_id in payment intent metadata');
      return;
    }

    // Update order status
    await updateOrderStatus(orderId, 'paid', paymentIntent.id);
    
    // Process vendor transfers
    const transfers = await stripeService.processVendorTransfers(orderId, paymentIntent.id);
    
    console.log(`✅ Processed ${transfers.length} vendor transfers for order ${orderId}`);
    
    // Record platform commission
    await recordPlatformCommission(orderId, paymentIntent.id);
    
  } catch (error) {
    console.error('Error handling payment success:', error);
    // TODO: Add admin notification for failed payment processing
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(paymentIntent, event) {
  console.log(`❌ Payment failed: ${paymentIntent.id}`);
  
  try {
    const orderId = paymentIntent.metadata.order_id;
    if (orderId) {
      await updateOrderStatus(orderId, 'error', paymentIntent.id);
      // TODO: Send customer notification about payment failure
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// ===== TRANSFER EVENT HANDLERS =====

/**
 * Handle transfer creation
 */
async function handleTransferCreated(transfer, event) {
  console.log(`📤 Transfer created: ${transfer.id}`);
  
  try {
    const vendorId = transfer.metadata.vendor_id;
    const orderId = transfer.metadata.order_id;
    
    if (vendorId && orderId) {
      // Update transaction status
      await updateTransactionStatus(transfer.id, 'processing');
    }
  } catch (error) {
    console.error('Error handling transfer creation:', error);
  }
}

/**
 * Handle transfer reversal
 */
async function handleTransferReversed(transfer, event) {
  console.log(`🔄 Transfer reversed: ${transfer.id}`);
  
  try {
    const vendorId = transfer.metadata.vendor_id;
    
    // Update transaction status
    await updateTransactionStatus(transfer.id, 'failed');
    
    // TODO: Admin notification for reversed transfer
    // TODO: Handle refund scenarios
    
  } catch (error) {
    console.error('Error handling transfer reversal:', error);
  }
}

/**
 * Handle transfer updates
 */
async function handleTransferUpdated(transfer, event) {
  console.log(`📝 Transfer updated: ${transfer.id} - Status: ${transfer.status}`);
  
  try {
    // Update transaction status based on transfer status
    const status = transfer.status === 'paid' ? 'completed' : 'processing';
    await updateTransactionStatus(transfer.id, status);
    
  } catch (error) {
    console.error('Error handling transfer update:', error);
  }
}

// ===== PAYOUT EVENT HANDLERS =====

/**
 * Handle completed payout
 */
async function handlePayoutCompleted(payout, event) {
  console.log(`💸 Payout completed: ${payout.id}`);
  
  try {
    // Update all transactions for this payout
    await markTransactionsAsPaidOut(payout.id, payout.arrival_date);
  } catch (error) {
    console.error('Error handling payout completion:', error);
  }
}

/**
 * Handle failed payout
 */
async function handlePayoutFailed(payout, event) {
  console.log(`❌ Payout failed: ${payout.id}`);
  
  try {
    // TODO: Admin notification for failed payout
    // TODO: Vendor notification about payout issue
  } catch (error) {
    console.error('Error handling payout failure:', error);
  }
}

// ===== SUBSCRIPTION EVENT HANDLERS =====

/**
 * Handle successful subscription payment
 */
async function handleSubscriptionPayment(invoice, event) {
  console.log(`💳 Subscription payment succeeded: ${invoice.id}`);
  
  try {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    // Update subscription status
    await updateSubscriptionStatus(subscriptionId, 'active');
    
    // Record subscription transaction
    await recordSubscriptionTransaction(invoice);
    
  } catch (error) {
    console.error('Error handling subscription payment:', error);
  }
}



// ===== ACCOUNT EVENT HANDLERS =====

/**
 * Handle account updates (verification status changes)
 */
async function handleAccountUpdate(account, event) {
  console.log(`🔄 Account updated: ${account.id}`);
  
  try {
    const vendorId = account.metadata.vendor_id;
    if (vendorId) {
      const isVerified = account.charges_enabled && account.payouts_enabled;
      await updateVendorVerificationStatus(vendorId, isVerified);
      
      if (isVerified) {
        console.log(`✅ Vendor ${vendorId} account verified`);
        // TODO: Send vendor notification about successful verification
      }
    }
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

// ===== DISPUTE EVENT HANDLERS =====

/**
 * Handle dispute creation
 */
async function handleDisputeCreated(dispute, event) {
  console.log(`⚠️ Dispute created: ${dispute.id}`);
  
  try {
    // Record dispute in database
    await recordDispute(dispute);
    
    // TODO: Admin notification for new dispute
    // TODO: Hold vendor payouts for disputed amount
    
  } catch (error) {
    console.error('Error handling dispute creation:', error);
  }
}

/**
 * Handle dispute closure
 */
async function handleDisputeClosed(dispute, event) {
  console.log(`✅ Dispute closed: ${dispute.id} - Status: ${dispute.status}`);
  
  try {
    // Update dispute status
    await updateDisputeStatus(dispute.id, dispute.status);
    
    // TODO: Release held funds if dispute won
    // TODO: Process refund adjustments if dispute lost
    
  } catch (error) {
    console.error('Error handling dispute closure:', error);
  }
}

// ===== DATABASE HELPER FUNCTIONS =====

/**
 * Update order status
 */
async function updateOrderStatus(orderId, status, paymentIntentId = null) {
  const query = `
    UPDATE orders 
    SET status = ?, stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  return db.execute(query, [status, paymentIntentId, orderId]);
}

/**
 * Update transaction status
 */
async function updateTransactionStatus(stripeTransferId, status) {
  const query = `
    UPDATE vendor_transactions 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE stripe_transfer_id = ?
  `;
  
  return db.execute(query, [status, stripeTransferId]);
}

/**
 * Record platform commission
 */
async function recordPlatformCommission(orderId, paymentIntentId) {
  const query = `
    INSERT INTO vendor_transactions 
    (vendor_id, order_id, transaction_type, amount, status)
    SELECT 
      1 as vendor_id, -- Platform admin user ID
      oi.order_id,
      'commission' as transaction_type,
      SUM(oi.commission_amount) as amount,
      'completed' as status
    FROM order_items oi
    WHERE oi.order_id = ?
    GROUP BY oi.order_id
  `;
  
  return db.execute(query, [orderId]);
}

/**
 * Update vendor verification status
 */
async function updateVendorVerificationStatus(vendorId, isVerified) {
  const query = `
    UPDATE vendor_settings 
    SET stripe_account_verified = ?, updated_at = CURRENT_TIMESTAMP
    WHERE vendor_id = ?
  `;
  
  return db.execute(query, [isVerified, vendorId]);
}

/**
 * Update subscription status
 */
async function updateSubscriptionStatus(stripeSubscriptionId, status) {
  const query = `
    UPDATE vendor_subscriptions 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE stripe_subscription_id = ?
  `;
  
  return db.execute(query, [status, stripeSubscriptionId]);
}

/**
 * Record subscription transaction
 */
async function recordSubscriptionTransaction(invoice) {
  // Find vendor by customer ID
  const vendorQuery = `
    SELECT vendor_id FROM vendor_subscriptions 
    WHERE stripe_customer_id = ? AND stripe_subscription_id = ?
  `;
  
  const [vendorRows] = await db.execute(vendorQuery, [invoice.customer, invoice.subscription]);
  
  if (vendorRows.length > 0) {
    const vendorId = vendorRows[0].vendor_id;
    
    const transactionQuery = `
      INSERT INTO vendor_transactions 
      (vendor_id, transaction_type, amount, status)
      VALUES (?, 'subscription_charge', ?, 'completed')
    `;
    
    return db.execute(transactionQuery, [vendorId, invoice.amount_paid / 100]);
  }
}

/**
 * Mark transactions as paid out
 */
async function markTransactionsAsPaidOut(payoutId, arrivalDate) {
  // This would need more complex logic to match transactions to specific payouts
  // For now, we'll update based on payout date
  const query = `
    UPDATE vendor_transactions 
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'processing' AND payout_date <= ?
  `;
  
  return db.execute(query, [arrivalDate]);
}

/**
 * Record dispute
 */
async function recordDispute(dispute) {
  // TODO: Create disputes table and record dispute details
  console.log('Recording dispute:', dispute.id);
}

/**
 * Update dispute status
 */
async function updateDisputeStatus(disputeId, status) {
  // TODO: Update dispute status in disputes table
  console.log('Updating dispute status:', disputeId, status);
}

module.exports = router; 