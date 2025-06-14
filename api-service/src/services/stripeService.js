const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../../config/db');

class StripeService {
  constructor() {
    this.stripe = stripe;
  }

  // ===== VENDOR ACCOUNT MANAGEMENT =====
  
  /**
   * Create a Stripe Connect account for a vendor
   */
  async createVendorAccount(vendorId, email, businessInfo = {}) {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          vendor_id: vendorId.toString(),
          platform: 'oaf'
        }
      });

      // Save account ID to vendor settings
      await this.updateVendorStripeAccount(vendorId, account.id);

      return account;
    } catch (error) {
      console.error('Error creating vendor account:', error);
      throw error;
    }
  }

  /**
   * Generate onboarding link for vendor
   */
  async createAccountLink(stripeAccountId, vendorId) {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${process.env.FRONTEND_URL}/vendor/onboarding/refresh`,
        return_url: `${process.env.FRONTEND_URL}/vendor/onboarding/complete`,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      console.error('Error creating account link:', error);
      throw error;
    }
  }

  /**
   * Check vendor account verification status
   */
  async getAccountStatus(stripeAccountId) {
    try {
      const account = await this.stripe.accounts.retrieve(stripeAccountId);
      
      return {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        verification_status: account.charges_enabled && account.payouts_enabled ? 'verified' : 'pending'
      };
    } catch (error) {
      console.error('Error getting account status:', error);
      throw error;
    }
  }

  // ===== PAYMENT PROCESSING =====

  /**
   * Create payment intent for multi-vendor order
   */
  async createPaymentIntent(orderData) {
    try {
      const { total_amount, currency = 'usd', customer_id, metadata = {} } = orderData;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(total_amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customer_id,
        metadata: {
          order_id: metadata.order_id?.toString(),
          platform: 'oaf',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Process vendor transfers after successful payment
   */
  async processVendorTransfers(orderId, paymentIntentId) {
    try {
      // Get order items with vendor and commission info
      const orderItems = await this.getOrderItemsWithCommissions(orderId);
      const transfers = [];

      for (const item of orderItems) {
        const vendorAmount = item.price - item.commission_amount;
        
        if (vendorAmount > 0 && item.stripe_account_id) {
          const transfer = await this.stripe.transfers.create({
            amount: Math.round(vendorAmount * 100), // Convert to cents
            currency: 'usd',
            destination: item.stripe_account_id,
            source_transaction: paymentIntentId,
            metadata: {
              order_id: orderId.toString(),
              vendor_id: item.vendor_id.toString(),
              commission_rate: item.commission_rate.toString(),
              commission_amount: item.commission_amount.toString()
            }
          });

          transfers.push(transfer);

          // Record transaction in database
          await this.recordVendorTransaction({
            vendor_id: item.vendor_id,
            order_id: orderId,
            transaction_type: 'sale',
            amount: vendorAmount,
            commission_rate: item.commission_rate,
            commission_amount: item.commission_amount,
            stripe_transfer_id: transfer.id,
            status: 'completed'
          });
        }
      }

      return transfers;
    } catch (error) {
      console.error('Error processing vendor transfers:', error);
      throw error;
    }
  }

  // ===== COMMISSION CALCULATIONS =====

  /**
   * Calculate commission for order items
   */
  async calculateCommissions(orderItems) {
    const itemsWithCommissions = [];

    for (const item of orderItems) {
      // Get vendor commission rate
      const vendorSettings = await this.getVendorSettings(item.vendor_id);
      const commissionRate = vendorSettings?.commission_rate || 15.00;
      
      const commissionAmount = (item.price * commissionRate) / 100;
      const vendorAmount = item.price - commissionAmount;

      itemsWithCommissions.push({
        ...item,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        vendor_amount: vendorAmount
      });
    }

    return itemsWithCommissions;
  }

  // ===== DATABASE HELPERS =====

  /**
   * Update vendor Stripe account ID
   */
  async updateVendorStripeAccount(vendorId, stripeAccountId) {
    const query = `
      INSERT INTO vendor_settings (vendor_id, stripe_account_id) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE 
        stripe_account_id = VALUES(stripe_account_id),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    return db.execute(query, [vendorId, stripeAccountId]);
  }

  /**
   * Get vendor settings including commission rate
   */
  async getVendorSettings(vendorId) {
    const query = 'SELECT * FROM vendor_settings WHERE vendor_id = ?';
    const [rows] = await db.execute(query, [vendorId]);
    return rows[0] || null;
  }

  /**
   * Record vendor transaction
   */
  async recordVendorTransaction(transactionData) {
    const query = `
      INSERT INTO vendor_transactions 
      (vendor_id, order_id, transaction_type, amount, commission_rate, commission_amount, stripe_transfer_id, status, payout_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))
    `;
    
    // Calculate payout date based on vendor settings
    const vendorSettings = await this.getVendorSettings(transactionData.vendor_id);
    const payoutDays = vendorSettings?.payout_days || 15;
    
    return db.execute(query, [
      transactionData.vendor_id,
      transactionData.order_id,
      transactionData.transaction_type,
      transactionData.amount,
      transactionData.commission_rate,
      transactionData.commission_amount,
      transactionData.stripe_transfer_id,
      transactionData.status,
      payoutDays
    ]);
  }

  /**
   * Get order items with commission calculations
   */
  async getOrderItemsWithCommissions(orderId) {
    const query = `
      SELECT 
        oi.*,
        vs.stripe_account_id,
        vs.commission_rate,
        u.username as vendor_name
      FROM order_items oi
      LEFT JOIN vendor_settings vs ON oi.vendor_id = vs.vendor_id
      LEFT JOIN users u ON oi.vendor_id = u.id
      WHERE oi.order_id = ?
    `;
    
    const [rows] = await db.execute(query, [orderId]);
    return rows;
  }

  // ===== PAYOUT MANAGEMENT =====

  /**
   * Get pending payouts for a vendor
   */
  async getVendorPendingPayouts(vendorId) {
    const query = `
      SELECT 
        SUM(amount) as pending_amount,
        COUNT(*) as transaction_count,
        MIN(payout_date) as next_payout_date
      FROM vendor_transactions 
      WHERE vendor_id = ? 
        AND status = 'completed' 
        AND payout_date <= CURDATE()
        AND transaction_type IN ('sale', 'adjustment')
    `;
    
    const [rows] = await db.execute(query, [vendorId]);
    return rows[0] || { pending_amount: 0, transaction_count: 0, next_payout_date: null };
  }

  /**
   * Get platform financial overview
   */
  async getPlatformFinancialOverview() {
    const query = `
      SELECT 
        SUM(CASE WHEN transaction_type = 'commission' THEN amount ELSE 0 END) as total_commission_earned,
        SUM(CASE WHEN transaction_type = 'sale' AND status = 'completed' THEN amount ELSE 0 END) as total_vendor_sales,
        SUM(CASE WHEN status = 'completed' AND payout_date <= CURDATE() THEN amount ELSE 0 END) as pending_payouts,
        COUNT(DISTINCT vendor_id) as active_vendors
      FROM vendor_transactions 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    
    const [rows] = await db.execute(query);
    return rows[0];
  }
}

module.exports = new StripeService(); 