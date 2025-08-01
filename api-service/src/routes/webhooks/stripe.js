const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('../../services/stripeService');
const db = require('../../../config/db');
const router = express.Router();
const EmailService = require('../../services/emailService');

const emailService = new EmailService();

// Webhook endpoint secret for signature verification
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Raw body parser for webhook signature verification
// This must be applied BEFORE any JSON parsing middleware
router.use(express.raw({ type: 'application/json' }));

/**
 * Main Stripe webhook handler
 */
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
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
    'customer.subscription.created': handleSubscriptionCreated,
    'customer.subscription.updated': handleSubscriptionUpdated,
    'customer.subscription.deleted': handleSubscriptionDeleted,
    'invoice.created': handleInvoiceCreated,
    'invoice.payment_succeeded': handleSubscriptionPaymentSucceeded,
    'invoice.payment_failed': handleSubscriptionPaymentFailed,
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
  }
}

// ===== PAYMENT EVENT HANDLERS =====

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent, event) {
  try {
    // Check if this is a booth fee payment
    const applicationId = paymentIntent.metadata.application_id;
    if (applicationId) {
      await handleBoothFeePayment(paymentIntent, applicationId);
      return;
    }

    // Check if this is a ticket purchase
    const ticketEventId = paymentIntent.metadata.event_id;
    const ticketId = paymentIntent.metadata.ticket_id;
    if (ticketEventId && ticketId) {
      await handleTicketPayment(paymentIntent);
      return;
    }

    // Check if this is an e-commerce order
    const orderId = paymentIntent.metadata.order_id;
    if (orderId) {
      await handleEcommercePayment(paymentIntent, orderId);
      return;
    }

    console.error('No order_id or application_id in payment intent metadata');
    
  } catch (error) {
    console.error('Error handling payment success:', error);
    // TODO: Add admin notification for failed payment processing
  }
}

/**
 * Handle booth fee payment success
 */
async function handleBoothFeePayment(paymentIntent, applicationId) {
  try {
    // Update application status to paid
    await db.execute(`
      UPDATE event_applications 
      SET booth_fee_paid = 1, booth_fee_paid_at = NOW()
      WHERE id = ?
    `, [applicationId]);

    // Record the payment
    await db.execute(`
      INSERT INTO event_booth_payments (
        application_id, 
        stripe_payment_intent_id, 
        amount_paid, 
        payment_date, 
        payment_status,
        created_at
      ) VALUES (?, ?, ?, NOW(), 'completed', NOW())
    `, [
      applicationId,
      paymentIntent.id,
      paymentIntent.amount_received / 100 // Convert from cents
    ]);

    // Send confirmation email
    try {
      const EventEmailService = require('../../services/eventEmailService');
      const emailService = new EventEmailService();
      await emailService.sendBoothFeeConfirmation(applicationId, paymentIntent.id);
    } catch (emailError) {
      console.error(`Failed to send confirmation email for application ${applicationId}:`, emailError);
    }
    
  } catch (error) {
    console.error('Error handling booth fee payment:', error);
    throw error;
  }
}

/**
 * Handle e-commerce payment success
 */
async function handleEcommercePayment(paymentIntent, orderId) {
  try {
    // Update order status
    await updateOrderStatus(orderId, 'paid', paymentIntent.id);
    
    // Process vendor transfers
    const transfers = await stripeService.processVendorTransfers(orderId, paymentIntent.id);
    
    // Record platform commission
    await recordPlatformCommission(orderId, paymentIntent.id);
    
  } catch (error) {
    console.error('Error handling e-commerce payment:', error);
    throw error;
  }
}

/**
 * Handle ticket purchase payment success
 */
async function handleTicketPayment(paymentIntent) {
  try {
    // Update all ticket purchases for this payment intent
    await db.execute(`
      UPDATE ticket_purchases 
      SET status = 'confirmed', purchase_date = NOW()
      WHERE stripe_payment_intent_id = ? AND status = 'pending'
    `, [paymentIntent.id]);

    // Update ticket quantity sold
    const [purchases] = await db.execute(`
      SELECT ticket_id, COUNT(*) as quantity_purchased
      FROM ticket_purchases 
      WHERE stripe_payment_intent_id = ?
      GROUP BY ticket_id
    `, [paymentIntent.id]);

    for (const purchase of purchases) {
      await db.execute(`
        UPDATE event_tickets 
        SET quantity_sold = quantity_sold + ?
        WHERE id = ?
      `, [purchase.quantity_purchased, purchase.ticket_id]);
    }

    // Send ticket email with codes
    await sendTicketConfirmationEmail(paymentIntent);
    
  } catch (error) {
    console.error('Error handling ticket payment:', error);
    throw error;
  }
}

/**
 * Send ticket confirmation email with unique codes using the proper email service
 */
async function sendTicketConfirmationEmail(paymentIntent) {
  try {
    const eventId = paymentIntent.metadata.event_id;
    const buyerEmail = paymentIntent.metadata.buyer_email;
    const buyerName = paymentIntent.metadata.buyer_name;

    // Find user by email (since username = email in this system)
    const [userRows] = await db.execute(
      'SELECT id FROM users WHERE username = ?',
      [buyerEmail]
    );

    if (userRows.length === 0) {
      console.error('No user found for email:', buyerEmail);
      return;
    }

    const userId = userRows[0].id;

    // Get ticket codes and details
    const [tickets] = await db.execute(`
      SELECT tp.unique_code, tp.unit_price, et.ticket_type, et.description
      FROM ticket_purchases tp
      JOIN event_tickets et ON tp.ticket_id = et.id
      WHERE tp.stripe_payment_intent_id = ? AND tp.status = 'confirmed'
      ORDER BY et.ticket_type
    `, [paymentIntent.id]);

    if (tickets.length === 0) {
      console.error('No confirmed tickets found for email');
      return;
    }

    // Get event details  
    const [eventDetails] = await db.execute(`
      SELECT title, start_date, end_date, venue_name, venue_address, venue_city, venue_state
      FROM events WHERE id = ?
    `, [eventId]);

    if (eventDetails.length === 0) {
      console.error('Event not found for ticket email');
      return;
    }

    const event = eventDetails[0];
    const totalAmount = tickets.reduce((sum, ticket) => sum + parseFloat(ticket.unit_price), 0);

    // Format ticket list for email template
    const ticketList = tickets.map(ticket => 
      `${ticket.ticket_type} - Code: ${ticket.unique_code} ($${parseFloat(ticket.unit_price).toFixed(2)})`
    ).join('<br>');

    const templateData = {
      buyer_name: buyerName || 'Valued Customer',
      event_title: event.title,
      event_start_date: new Date(event.start_date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      event_end_date: new Date(event.end_date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      venue_name: event.venue_name,
      venue_address: event.venue_address || '',
      venue_city: event.venue_city,
      venue_state: event.venue_state,
      ticket_list: ticketList,
      ticket_count: tickets.length,
      total_amount: totalAmount.toFixed(2),
      event_url: `https://onlineartfestival.com/events/${eventId}`,
      unique_codes: tickets.map(t => t.unique_code).join(', ')
    };

    // Queue the email using the template system
    const result = await emailService.queueEmail(userId, 'ticket_purchase_confirmation', templateData, {
      priority: 2 // High priority for transactional emails
    });

    if (!result.success) {
      console.error('Failed to queue ticket confirmation email:', result.error);
    }

  } catch (error) {
    console.error('Error sending ticket confirmation email:', error);
    // Don't throw - payment was successful, email is secondary
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(paymentIntent, event) {
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
  try {
    const vendorId = account.metadata.vendor_id;
    if (vendorId) {
      const isVerified = account.charges_enabled && account.payouts_enabled;
      await updateVendorVerificationStatus(vendorId, isVerified);
      
      // TODO: Send vendor notification about successful verification if verified
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
}

/**
 * Update dispute status
 */
async function updateDisputeStatus(disputeId, status) {
  // TODO: Update dispute status in disputes table
}



/**
 * Handle invoice created - Try Connect balance payment first
 */
async function handleInvoiceCreated(invoice, event) {
  try {
    // Only process subscription invoices
    if (!invoice.subscription || invoice.amount_due <= 0) {
      return;
    }

    // Get subscription info
    const [subscriptionRows] = await db.execute(
      'SELECT id, user_id, prefer_connect_balance FROM user_subscriptions WHERE stripe_subscription_id = ?',
      [invoice.subscription]
    );

    if (subscriptionRows.length === 0) {
      return;
    }

    const subscription = subscriptionRows[0];

    // Skip if user doesn't prefer Connect balance
    if (!subscription.prefer_connect_balance) {
      return;
    }

    // Try to pay from Connect balance
    const stripeService = require('../../services/stripeService');
    const paymentResult = await stripeService.processSubscriptionPaymentWithConnectBalance(
      subscription.user_id,
      invoice.subscription,
      invoice.amount_due
    );

    if (paymentResult.success) {
      // Mark the invoice as paid by Connect balance
      await stripe.invoices.pay(invoice.id, {
        metadata: {
          paid_via_connect_balance: 'true',
          connect_transfer_id: paymentResult.transfer_id
        }
      });

      // Record the payment in our database
      await db.execute(`
        INSERT INTO subscription_payments (
          subscription_id, stripe_invoice_id, amount, currency, status, 
          payment_method, connect_transfer_id, billing_period_start, billing_period_end
        ) VALUES (?, ?, ?, ?, 'succeeded', 'connect_balance', ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))
      `, [
        subscription.id,
        invoice.id,
        paymentResult.amount_processed,
        invoice.currency,
        paymentResult.transfer_id,
        invoice.period_start,
        invoice.period_end
      ]);
    }

  } catch (error) {
    console.error('❌ Error handling invoice created:', error);
    // Don't throw - let Stripe handle with normal payment method
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription, event) {
  try {
    // Extract user ID from metadata
    const userId = subscription.metadata?.user_id;
    if (!userId) {
      return;
    }

    // Update our database record
    await db.execute(`
      UPDATE user_subscriptions 
      SET 
        status = ?, 
        current_period_start = FROM_UNIXTIME(?),
        current_period_end = FROM_UNIXTIME(?)
      WHERE stripe_subscription_id = ? OR (user_id = ? AND status = 'incomplete')
    `, [
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.id,
      userId
    ]);
  } catch (error) {
    console.error('❌ Error handling subscription created:', error);
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription, event) {
  try {
    // Update our database record
    await db.execute(`
      UPDATE user_subscriptions 
      SET 
        status = ?, 
        current_period_start = FROM_UNIXTIME(?),
        current_period_end = FROM_UNIXTIME(?),
        cancel_at_period_end = ?
      WHERE stripe_subscription_id = ?
    `, [
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.cancel_at_period_end || false,
      subscription.id
    ]);

    // Subscription canceled handling removed
  } catch (error) {
    console.error('❌ Error handling subscription updated:', error);
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription, event) {
  try {
    // Update our database record
    await db.execute(`
      UPDATE user_subscriptions 
      SET status = 'canceled', canceled_at = NOW()
      WHERE stripe_subscription_id = ?
    `, [subscription.id]);
  } catch (error) {
    console.error('❌ Error handling subscription deleted:', error);
  }
}

/**
 * Handle successful subscription payment
 */
async function handleSubscriptionPaymentSucceeded(invoice, event) {
  try {
    if (!invoice.subscription) {
      return;
    }

    // Record the payment
    const [subscriptionRows] = await db.execute(
      'SELECT id, user_id FROM user_subscriptions WHERE stripe_subscription_id = ?',
      [invoice.subscription]
    );

    if (subscriptionRows.length === 0) {
      return;
    }

    const subscription = subscriptionRows[0];

    // Determine payment method used (default to 'card' unless we detect Connect transfer)
    let paymentMethod = 'card';
    let connectTransferId = null;

    // Check if this was paid via Connect balance
    // This would be triggered by a prior webhook or manual transfer
    if (invoice.metadata && invoice.metadata.paid_via_connect_balance) {
      paymentMethod = 'connect_balance';
      connectTransferId = invoice.metadata.connect_transfer_id;
    }

    // Insert payment record
    await db.execute(`
      INSERT INTO subscription_payments (
        subscription_id, stripe_invoice_id, stripe_payment_intent_id,
        amount, currency, status, payment_method, connect_transfer_id,
        billing_period_start, billing_period_end
      ) VALUES (?, ?, ?, ?, ?, 'succeeded', ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))
    `, [
      subscription.id,
      invoice.id,
      invoice.payment_intent,
      invoice.amount_paid / 100, // Convert from cents
      invoice.currency,
      paymentMethod,
      connectTransferId,
      invoice.period_start,
      invoice.period_end
    ]);
  } catch (error) {
    console.error('❌ Error handling subscription payment succeeded:', error);
  }
}

/**
 * Handle failed subscription payment
 */
async function handleSubscriptionPaymentFailed(invoice, event) {
  try {
    if (!invoice.subscription) {
      return;
    }

    // Record the failed payment
    const [subscriptionRows] = await db.execute(
      'SELECT id, user_id FROM user_subscriptions WHERE stripe_subscription_id = ?',
      [invoice.subscription]
    );

    if (subscriptionRows.length === 0) {
      return;
    }

    const subscription = subscriptionRows[0];

    // Insert payment record as failed
    await db.execute(`
      INSERT INTO subscription_payments (
        subscription_id, stripe_invoice_id, stripe_payment_intent_id,
        amount, currency, status, payment_method,
        billing_period_start, billing_period_end
      ) VALUES (?, ?, ?, ?, ?, 'failed', 'card', FROM_UNIXTIME(?), FROM_UNIXTIME(?))
    `, [
      subscription.id,
      invoice.id,
      invoice.payment_intent,
      invoice.amount_due / 100, // Convert from cents
      invoice.currency,
      invoice.period_start,
      invoice.period_end
    ]);

    // TODO: Send email notification about failed payment
    // TODO: Consider grace period before removing verification
  } catch (error) {
    console.error('❌ Error handling subscription payment failed:', error);
  }
}



module.exports = router; 