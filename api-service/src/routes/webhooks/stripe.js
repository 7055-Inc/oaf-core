/**
 * Stripe Webhooks Routes
 * Comprehensive webhook handling for Stripe payment events
 * Handles payments, subscriptions, transfers, disputes, and account events
 * Provides secure webhook signature verification and event processing
 */

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
 * POST /api/webhooks/stripe
 * Main Stripe webhook handler with signature verification
 * Processes all Stripe webhook events including payments, subscriptions, and transfers
 * 
 * @route POST /api/webhooks/stripe
 * @param {Object} req.body - Raw webhook payload from Stripe
 * @param {string} req.headers['stripe-signature'] - Stripe webhook signature for verification
 * @returns {Object} Confirmation of webhook receipt
 * @note Requires valid Stripe webhook signature for security
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
 * Distributes Stripe webhook events to specialized handler functions
 * Supports comprehensive event types including payments, subscriptions, and disputes
 * 
 * @param {Object} event - Stripe webhook event object
 * @returns {Promise<void>} Resolves when event is processed
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
    
    // Payment method setup events (for shipping subscriptions)
    'setup_intent.succeeded': handleSetupIntentSucceeded,
    'setup_intent.setup_failed': handleSetupIntentFailed,
    
    // Payment method lifecycle events
    'customer.source.expired': handleSourceExpired,
  };

  const handler = handlers[event.type];
  if (handler) {
    await handler(event.data.object, event);
  }
}

// ===== PAYMENT EVENT HANDLERS =====

/**
 * Handle successful payment intent completion
 * Processes different payment types: booth fees, tickets, e-commerce, shipping labels
 * Updates database records and triggers email notifications
 * 
 * @param {Object} paymentIntent - Stripe PaymentIntent object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when payment is processed
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

    // Check if this is a shipping label purchase
    const shippingLabelId = paymentIntent.metadata.shipping_label_id;
    if (shippingLabelId) {
      await handleShippingLabelPayment(paymentIntent, shippingLabelId);
      return;
    }

    console.error('No order_id, application_id, or shipping_label_id in payment intent metadata');
    
  } catch (error) {
    console.error('Error handling payment success:', error);
    // TODO: Add admin notification for failed payment processing
  }
}

/**
 * Handle booth fee payment success for event applications
 * Updates application status and records payment transaction
 * Sends confirmation email to applicant
 * 
 * @param {Object} paymentIntent - Stripe PaymentIntent object
 * @param {string} applicationId - Event application ID from metadata
 * @returns {Promise<void>} Resolves when booth fee payment is processed
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
 * Handle e-commerce payment success for marketplace orders
 * Updates order status, processes vendor transfers, and records platform commission
 * Integrates with vendor payout system
 * 
 * @param {Object} paymentIntent - Stripe PaymentIntent object
 * @param {string} orderId - Order ID from metadata
 * @returns {Promise<void>} Resolves when e-commerce payment is processed
 */
async function handleEcommercePayment(paymentIntent, orderId) {
  try {
    // Update order status
    await updateOrderStatus(orderId, 'paid', paymentIntent.id);
    
    // Get the charge ID from the payment intent (required for source_transaction)
    // In newer Stripe API versions, latest_charge contains the charge ID
    const chargeId = paymentIntent.latest_charge || paymentIntent.charges?.data?.[0]?.id;
    
    if (!chargeId) {
      console.error(`No charge ID found for payment intent ${paymentIntent.id}`);
      return;
    }
    
    // Store the charge ID for later transfer (when tracking is added)
    // DON'T transfer immediately - wait for vendor to add tracking
    await db.execute(`
      UPDATE orders 
      SET stripe_charge_id = ?, 
          transfer_status = 'pending_fulfillment'
      WHERE id = ?
    `, [chargeId, orderId]);
    
    // Record platform commission (this happens immediately)
    await recordPlatformCommission(orderId, paymentIntent.id);
    
    console.log(`Order ${orderId} paid - transfer pending until tracking added`);
    
  } catch (error) {
    console.error('Error handling e-commerce payment:', error);
    // Don't throw - payment was successful, transfer issue should be logged for admin
  }
}

/**
 * Handle ticket purchase payment success for events
 * Updates ticket purchase status, increments sold quantities, and sends confirmation
 * Generates unique ticket codes for event access
 * 
 * @param {Object} paymentIntent - Stripe PaymentIntent object
 * @returns {Promise<void>} Resolves when ticket payment is processed
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
 * Retrieves ticket details, formats confirmation data, and queues transactional email
 * Includes event details, ticket codes, and venue information
 * 
 * @param {Object} paymentIntent - Stripe PaymentIntent object with ticket metadata
 * @returns {Promise<void>} Resolves when email is queued (does not throw on email errors)
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
      event_url: `${process.env.FRONTEND_URL || 'https://beemeeart.com'}/events/${eventId}`,
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
 * Handle failed payment intent for various payment types
 * Updates order/shipping label status and prepares customer notifications
 * Handles different failure scenarios based on payment metadata
 * 
 * @param {Object} paymentIntent - Stripe PaymentIntent object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when payment failure is processed
 */
async function handlePaymentFailure(paymentIntent, event) {
  try {
    const orderId = paymentIntent.metadata.order_id;
    if (orderId) {
      await updateOrderStatus(orderId, 'error', paymentIntent.id);
      // TODO: Send customer notification about payment failure
      return;
    }

    // Check if this is a shipping label purchase failure
    const shippingLabelId = paymentIntent.metadata.shipping_label_id;
    if (shippingLabelId) {
      await handleShippingLabelPaymentFailure(paymentIntent, shippingLabelId);
      return;
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// ===== TRANSFER EVENT HANDLERS =====

/**
 * Handle Stripe transfer creation for vendor payouts
 * Updates transaction status when transfers are initiated to vendor accounts
 * Tracks transfer processing for marketplace transactions
 * 
 * @param {Object} transfer - Stripe Transfer object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when transfer creation is processed
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
 * Handle Stripe transfer reversal for failed vendor payouts
 * Updates transaction status and prepares admin notifications
 * Handles refund scenarios and vendor account issues
 * 
 * @param {Object} transfer - Stripe Transfer object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when transfer reversal is processed
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
 * Handle Stripe transfer status updates
 * Updates transaction status based on transfer completion or failure
 * Tracks vendor payout progress through Stripe's transfer lifecycle
 * 
 * @param {Object} transfer - Stripe Transfer object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when transfer update is processed
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
 * Handle completed Stripe payout to vendor bank accounts
 * Marks all associated transactions as paid out with arrival date
 * Finalizes vendor payment processing cycle
 * 
 * @param {Object} payout - Stripe Payout object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when payout completion is processed
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
 * Handle failed Stripe payout to vendor bank accounts
 * Prepares admin and vendor notifications for payout issues
 * Tracks payout failures for vendor account management
 * 
 * @param {Object} payout - Stripe Payout object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when payout failure is processed
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
 * Handle Stripe Connect account updates for vendor verification
 * Updates vendor verification status based on account capabilities
 * Tracks vendor onboarding progress and account status changes
 * 
 * @param {Object} account - Stripe Account object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when account update is processed
 */
async function handleAccountUpdate(account, event) {
  try {
    const vendorId = account.metadata.vendor_id;
    if (vendorId) {
      const isVerified = account.charges_enabled && account.payouts_enabled;
      await updateVendorVerificationStatus(vendorId, isVerified);
      
      // Process pending payouts when vendor becomes verified
      if (isVerified) {
        await processPendingVendorPayouts(vendorId, account.id);
      }
    }
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

/**
 * Process pending payouts for a newly verified vendor
 * Catches up any unpaid amounts from application fees, orders, etc.
 * @param {number} vendorId - Vendor user ID
 * @param {string} stripeAccountId - Vendor's Stripe Connect account ID
 */
async function processPendingVendorPayouts(vendorId, stripeAccountId) {
  try {
    // Process pending application fee payouts (for promoters)
    const [pendingAppFees] = await db.execute(`
      SELECT id, stripe_payment_intent_id, promoter_amount
      FROM application_fee_payments
      WHERE promoter_id = ?
        AND status = 'succeeded'
        AND stripe_transfer_id IS NULL
        AND promoter_amount > 0
    `, [vendorId]);

    for (const payment of pendingAppFees) {
      try {
        // Get the charge from the payment intent
        const charges = await stripe.charges.list({ 
          payment_intent: payment.stripe_payment_intent_id, 
          limit: 1 
        });
        
        if (charges.data.length > 0) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(payment.promoter_amount * 100),
            currency: 'usd',
            destination: stripeAccountId,
            source_transaction: charges.data[0].id,
            description: `Application fee payout (catch-up) - Payment #${payment.id}`
          });

          // Update the payment record with transfer ID
          await db.execute(`
            UPDATE application_fee_payments 
            SET stripe_transfer_id = ?, updated_at = NOW()
            WHERE id = ?
          `, [transfer.id, payment.id]);

          console.log(`Processed pending application fee payout: ${transfer.id} for vendor ${vendorId}`);
        }
      } catch (transferError) {
        console.error(`Failed to transfer application fee payment ${payment.id}:`, transferError.message);
      }
    }

    // Process pending order payouts (for marketplace sellers)
    const [pendingOrders] = await db.execute(`
      SELECT id, stripe_payment_intent_id, vendor_amount
      FROM orders
      WHERE vendor_id = ?
        AND payment_status = 'paid'
        AND stripe_transfer_id IS NULL
        AND vendor_amount > 0
    `, [vendorId]);

    for (const order of pendingOrders) {
      try {
        const charges = await stripe.charges.list({ 
          payment_intent: order.stripe_payment_intent_id, 
          limit: 1 
        });
        
        if (charges.data.length > 0) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(order.vendor_amount * 100),
            currency: 'usd',
            destination: stripeAccountId,
            source_transaction: charges.data[0].id,
            description: `Order payout (catch-up) - Order #${order.id}`
          });

          await db.execute(`
            UPDATE orders 
            SET stripe_transfer_id = ?, updated_at = NOW()
            WHERE id = ?
          `, [transfer.id, order.id]);

          console.log(`Processed pending order payout: ${transfer.id} for vendor ${vendorId}`);
        }
      } catch (transferError) {
        console.error(`Failed to transfer order ${order.id}:`, transferError.message);
      }
    }

  } catch (error) {
    console.error('Error processing pending vendor payouts:', error);
  }
}

// ===== DISPUTE EVENT HANDLERS =====

/**
 * Handle Stripe dispute creation for chargebacks
 * Records dispute details and prepares admin notifications
 * Initiates dispute management workflow and vendor payout holds
 * 
 * @param {Object} dispute - Stripe Dispute object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when dispute creation is processed
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
 * Handle Stripe dispute closure and resolution
 * Updates dispute status and processes fund adjustments
 * Handles dispute outcomes and vendor payout releases
 * 
 * @param {Object} dispute - Stripe Dispute object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when dispute closure is processed
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
 * Update order status in database
 * Updates order status and payment intent ID for e-commerce transactions
 * 
 * @param {string} orderId - Order ID to update
 * @param {string} status - New order status ('paid', 'error', etc.)
 * @param {string|null} paymentIntentId - Stripe PaymentIntent ID (optional)
 * @returns {Promise<Object>} Database execution result
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
 * Update vendor transaction status based on Stripe transfer
 * Updates transaction status for vendor payout tracking
 * 
 * @param {string} stripeTransferId - Stripe Transfer ID
 * @param {string} status - New transaction status ('processing', 'completed', 'failed')
 * @returns {Promise<Object>} Database execution result
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
 * Record platform commission from marketplace orders
 * Calculates and records platform commission from order items
 * 
 * @param {string} orderId - Order ID to calculate commission for
 * @param {string} paymentIntentId - Stripe PaymentIntent ID
 * @returns {Promise<Object>} Database execution result
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
 * Update vendor verification status based on Stripe account
 * Updates vendor verification status when Stripe account capabilities change
 * 
 * @param {string} vendorId - Vendor ID to update
 * @param {boolean} isVerified - Whether vendor account is verified
 * @returns {Promise<Object>} Database execution result
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
 * Update subscription status from Stripe webhook
 * Updates subscription status based on Stripe subscription events
 * 
 * @param {string} stripeSubscriptionId - Stripe Subscription ID
 * @param {string} status - New subscription status
 * @returns {Promise<Object>} Database execution result
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
 * Record subscription transaction from invoice payment
 * Records subscription payment transaction for vendor billing
 * 
 * @param {Object} invoice - Stripe Invoice object
 * @returns {Promise<Object>} Database execution result
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
 * Mark transactions as paid out after Stripe payout completion
 * Updates transaction status when vendor payouts are completed
 * 
 * @param {string} payoutId - Stripe Payout ID
 * @param {number} arrivalDate - Payout arrival date (Unix timestamp)
 * @returns {Promise<Object>} Database execution result
 */
async function markTransactionsAsPaidOut(payoutId, arrivalDate) {
  try {
    // Convert Unix timestamp to MySQL date format
    const arrivalDateFormatted = new Date(arrivalDate * 1000).toISOString().split('T')[0];
    
    // Mark all completed transactions with payout_date <= arrival date as paid_out
    // This ensures vendors see their balance decrease after Stripe pays out
  const query = `
    UPDATE vendor_transactions 
      SET status = 'paid_out', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'completed' 
        AND payout_date IS NOT NULL 
        AND payout_date <= ?
  `;
  
    const result = await db.execute(query, [arrivalDateFormatted]);
    console.log(`Marked ${result[0].affectedRows} transactions as paid_out for payout ${payoutId}`);
    return result;
  } catch (error) {
    console.error('Error marking transactions as paid out:', error);
    throw error;
  }
}

/**
 * Record dispute details in database
 * Records Stripe dispute information for tracking and management
 * 
 * @param {Object} dispute - Stripe Dispute object
 * @returns {Promise<void>} Resolves when dispute is recorded
 * @note TODO: Create disputes table and implement dispute recording
 */
async function recordDispute(dispute) {
  // TODO: Create disputes table and record dispute details
}

/**
 * Update dispute status in database
 * Updates dispute status when Stripe dispute is resolved
 * 
 * @param {string} disputeId - Stripe Dispute ID
 * @param {string} status - New dispute status
 * @returns {Promise<void>} Resolves when dispute status is updated
 * @note TODO: Update dispute status in disputes table
 */
async function updateDisputeStatus(disputeId, status) {
  // TODO: Update dispute status in disputes table
}



/**
 * Handle invoice created - Try Connect balance payment first
 * Attempts to pay subscription invoices from vendor Connect balance
 * Provides automatic payment processing for vendors with sufficient balance
 * 
 * @param {Object} invoice - Stripe Invoice object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when invoice processing is complete
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
 * Handle subscription created event from Stripe
 * Updates database record with subscription details and billing periods
 * Tracks subscription lifecycle from creation
 * 
 * @param {Object} subscription - Stripe Subscription object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when subscription creation is processed
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
 * Handle subscription updated event from Stripe
 * Updates database record with current subscription status and billing periods
 * Tracks subscription changes and cancellation flags
 * 
 * @param {Object} subscription - Stripe Subscription object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when subscription update is processed
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
 * Handle subscription deleted event from Stripe
 * Updates database record to mark subscription as canceled
 * Finalizes subscription lifecycle when canceled
 * 
 * @param {Object} subscription - Stripe Subscription object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when subscription deletion is processed
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
 * Handle failed subscription payment from invoice
 * Records failed payment attempt and prepares customer notifications
 * Tracks subscription payment failures for account management
 * 
 * @param {Object} invoice - Stripe Invoice object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when subscription payment failure is recorded
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

/**
 * Handle shipping label payment success
 * Updates shipping label purchase status when payment is completed
 * Finalizes shipping label purchase workflow
 * 
 * @param {Object} paymentIntent - Stripe PaymentIntent object
 * @param {string} shippingLabelId - Shipping label ID from metadata
 * @returns {Promise<void>} Resolves when shipping label payment is processed
 */
async function handleShippingLabelPayment(paymentIntent, shippingLabelId) {
  try {
    // Update the shipping_label_purchases record
    await db.execute(`
      UPDATE shipping_label_purchases 
      SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP
      WHERE stripe_payment_intent_id = ?
    `, [paymentIntent.id]);

    console.log(`✅ Shipping label payment succeeded: ${paymentIntent.id} for label ${shippingLabelId}`);
  } catch (error) {
    console.error('❌ Error handling shipping label payment:', error);
  }
}

/**
 * Handle shipping label payment failure
 * Updates shipping label purchase status with failure reason
 * Records payment decline information for troubleshooting
 * 
 * @param {Object} paymentIntent - Stripe PaymentIntent object
 * @param {string} shippingLabelId - Shipping label ID from metadata
 * @returns {Promise<void>} Resolves when shipping label payment failure is processed
 */
async function handleShippingLabelPaymentFailure(paymentIntent, shippingLabelId) {
  try {
    const declineReason = paymentIntent.last_payment_error?.decline_code || 
                         paymentIntent.last_payment_error?.code || 
                         'payment_failed';

    // Update the shipping_label_purchases record
    await db.execute(`
      UPDATE shipping_label_purchases 
      SET status = 'failed', decline_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE stripe_payment_intent_id = ?
    `, [declineReason, paymentIntent.id]);

    console.log(`❌ Shipping label payment failed: ${paymentIntent.id} for label ${shippingLabelId} - ${declineReason}`);
  } catch (error) {
    console.error('❌ Error handling shipping label payment failure:', error);
  }
}

// ===== SHIPPING SUBSCRIPTION EVENT HANDLERS =====

/**
 * Handle successful setup intent for shipping subscription payment method
 * Activates shipping subscription and grants shipping permissions
 * Completes shipping subscription onboarding process
 * 
 * @param {Object} setupIntent - Stripe SetupIntent object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when setup intent success is processed
 */
async function handleSetupIntentSucceeded(setupIntent, event) {
  try {
    const customerId = setupIntent.customer;
    const paymentMethodId = setupIntent.payment_method;
    
    // Find shipping subscription by customer ID
    const [subscriptionRows] = await db.execute(
      'SELECT id, user_id FROM user_subscriptions WHERE stripe_customer_id = ? AND subscription_type = "shipping_labels"',
      [customerId]
    );
    
    if (subscriptionRows.length > 0) {
      const subscription = subscriptionRows[0];
      
      // Check if user has accepted shipping terms before activation
      const [termsAcceptance] = await db.execute(`
        SELECT uta.id
        FROM user_terms_acceptance uta
        JOIN terms_versions tv ON uta.terms_version_id = tv.id
        WHERE uta.user_id = ? AND uta.subscription_type = 'shipping_labels' AND tv.is_current = TRUE
      `, [subscription.user_id]);

      if (termsAcceptance.length === 0) {
        console.log(`⚠️ Shipping subscription activation skipped for user ${subscription.user_id} - terms not accepted`);
        return;
      }
      
      // Use transaction to ensure atomic activation
      await db.execute('START TRANSACTION');
      
      try {
        // Use atomic operation to prevent race conditions with frontend activation
        // This will only activate if status is still 'incomplete'
        const [result] = await db.execute(
          'UPDATE user_subscriptions SET status = "active" WHERE id = ? AND status = "incomplete"',
          [subscription.id]
        );
        
        if (result.affectedRows > 0) {
          // Successfully activated - grant shipping permission (idempotent operation)
          await db.execute(`
            INSERT INTO user_permissions (user_id, shipping) 
            VALUES (?, 1) 
            ON DUPLICATE KEY UPDATE shipping = 1
          `, [subscription.user_id]);
          
          // Commit the transaction
          await db.execute('COMMIT');
          
          console.log(`✅ Shipping subscription activated via webhook for user ${subscription.user_id}`);
          
          // Send email notification (outside transaction)
          try {
            await emailService.queueEmail(subscription.user_id, 'shipping_subscription_activated', { /* template data */ });
          } catch (notifyError) {
            console.error('Failed to send activation notification:', notifyError);
          }
        } else {
          // Already activated (likely by frontend) - this is normal
          await db.execute('ROLLBACK');
          console.log(`ℹ️ Shipping subscription already activated for user ${subscription.user_id} (processed by frontend)`);
        }
        
      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error handling setup intent succeeded:', error);
  }
}

/**
 * Handle failed setup intent for shipping subscription payment method
 * Keeps subscription as incomplete and revokes shipping permissions
 * Handles shipping subscription setup failures
 * 
 * @param {Object} setupIntent - Stripe SetupIntent object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when setup intent failure is processed
 */
async function handleSetupIntentFailed(setupIntent, event) {
  try {
    const customerId = setupIntent.customer;
    
    // Find shipping subscription by customer ID
    const [subscriptionRows] = await db.execute(
      'SELECT id, user_id FROM user_subscriptions WHERE stripe_customer_id = ? AND subscription_type = "shipping_labels"',
      [customerId]
    );
    
    if (subscriptionRows.length > 0) {
      const subscription = subscriptionRows[0];
      
      // Keep subscription as incomplete
      await db.execute(
        'UPDATE user_subscriptions SET status = "incomplete" WHERE id = ?',
        [subscription.id]
      );
      
      // Revoke shipping permission
      await db.execute(
        'UPDATE user_permissions SET shipping = 0 WHERE user_id = ?',
        [subscription.user_id]
      );
      
      console.log(`❌ Shipping subscription setup failed for user ${subscription.user_id}`);
      // Send failure notification
      try {
        await emailService.queueEmail(subscription.user_id, 'shipping_setup_failed', { reason: setupIntent.last_setup_error?.message || 'Unknown error' });
      } catch (notifyError) {
        console.error('Failed to send failure notification:', notifyError);
      }
    }
  } catch (error) {
    console.error('❌ Error handling setup intent failed:', error);
  }
}

/**
 * Handle expired payment source for shipping subscriptions
 * Deactivates shipping subscriptions and revokes permissions when payment method expires
 * Handles payment method lifecycle management for shipping access
 * 
 * @param {Object} source - Stripe Source object
 * @param {Object} event - Full Stripe webhook event
 * @returns {Promise<void>} Resolves when source expiration is processed
 */
async function handleSourceExpired(source, event) {
  try {
    const customerId = source.customer;
    
    // Find all shipping subscriptions for this customer
    const [subscriptionRows] = await db.execute(
      'SELECT id, user_id FROM user_subscriptions WHERE stripe_customer_id = ? AND subscription_type = "shipping_labels"',
      [customerId]
    );
    
    for (const subscription of subscriptionRows) {
      // Deactivate subscription
      await db.execute(
        'UPDATE user_subscriptions SET status = "incomplete" WHERE id = ?',
        [subscription.id]
      );
      
      // Revoke shipping permission
      await db.execute(
        'UPDATE user_permissions SET shipping = 0 WHERE user_id = ?',
        [subscription.user_id]
      );
      
      console.log(`🔒 Shipping access revoked for user ${subscription.user_id} - payment method expired`);
      // Send expiration notification
      try {
        await emailService.queueEmail(subscription.user_id, 'payment_method_expired', { /* details */ });
      } catch (notifyError) {
        console.error('Failed to send expiration notification:', notifyError);
      }
    }
  } catch (error) {
    console.error('❌ Error handling source expired:', error);
  }
}

module.exports = router; 