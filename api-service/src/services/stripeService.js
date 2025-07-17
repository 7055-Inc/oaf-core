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
   * Calculate commission for order items with proper Stripe fee handling
   */
  async calculateCommissions(orderItems) {
    const itemsWithCommissions = [];

    for (const item of orderItems) {
      // Get vendor commission rate from integrated financial settings
      const financialSettings = await this.getFinancialSettings(item.vendor_id);
      const commissionRate = financialSettings.commission_rate;
      
      // Calculate Stripe fee for this transaction (platform always pays)
      const stripeFeeCalc = await this.calculateStripeFee(item.price, 'standard');
      
      let commissionAmount, vendorAmount, platformNet;
      
      if (financialSettings.fee_structure === 'pass_through') {
        // Pass-through: Vendor pays equivalent of Stripe fee, platform gets $0
        commissionAmount = 0.00;
        vendorAmount = item.price - stripeFeeCalc.total_fee;
        platformNet = 0.00;  // Platform breaks even (vendor pays Stripe fee equivalent)
      } else {
        // Commission: Platform takes commission and absorbs Stripe fees
        commissionAmount = (item.price * commissionRate) / 100;
        vendorAmount = item.price - commissionAmount;
        platformNet = commissionAmount - stripeFeeCalc.total_fee;  // Commission minus Stripe fees
      }

      itemsWithCommissions.push({
        ...item,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        vendor_amount: vendorAmount,
        fee_structure: financialSettings.fee_structure,
        stripe_fee: stripeFeeCalc.total_fee,
        platform_net: platformNet,
        stripe_rate_used: stripeFeeCalc.rate_used
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

  /**
   * Get integrated financial settings (financial_settings + vendor_settings)
   * Checks financial_settings first, falls back to vendor_settings
   */
  async getFinancialSettings(vendorId) {
    // First check the new financial_settings table
    const financialQuery = `
      SELECT fee_structure, commission_rate, notes 
      FROM financial_settings 
      WHERE user_id = ?
    `;
    const [financialRows] = await db.execute(financialQuery, [vendorId]);
    
    if (financialRows.length > 0) {
      const financial = financialRows[0];
      
      // Handle pass-through structure
      if (financial.fee_structure === 'pass_through') {
        return {
          commission_rate: 0.00,
          fee_structure: 'pass_through',
          notes: financial.notes,
          source: 'financial_settings'
        };
      }
      
      return {
        commission_rate: financial.commission_rate || 15.00,
        fee_structure: financial.fee_structure || 'commission',
        notes: financial.notes,
        source: 'financial_settings'
      };
    }
    
    // Fall back to vendor_settings table
    const vendorSettings = await this.getVendorSettings(vendorId);
    
    return {
      commission_rate: vendorSettings?.commission_rate || 15.00,
      fee_structure: 'commission',
      notes: null,
      source: 'vendor_settings'
    };
  }

  /**
   * Get current Stripe rates for a given transaction type
   */
  async getStripeRates(rateType = 'standard', currency = 'USD', region = 'US') {
    const query = `
      SELECT percentage_rate, fixed_fee, rate_name
      FROM stripe_rates 
      WHERE rate_type = ? 
        AND currency = ? 
        AND region = ?
        AND is_active = TRUE
        AND effective_date <= CURDATE()
        AND (end_date IS NULL OR end_date >= CURDATE())
      ORDER BY effective_date DESC
      LIMIT 1
    `;
    
    const [rows] = await db.execute(query, [rateType, currency, region]);
    
    if (rows.length === 0) {
      // Fallback to default rates if no database entry found
      return {
        percentage_rate: 0.0290,  // 2.9%
        fixed_fee: 0.30,          // 30 cents
        rate_name: 'Default Standard Rate'
      };
    }
    
    return rows[0];
  }

  /**
   * Calculate Stripe fee for a given amount and rate type
   */
  async calculateStripeFee(amount, rateType = 'standard', currency = 'USD', region = 'US') {
    const rates = await this.getStripeRates(rateType, currency, region);
    
    const percentageFee = amount * rates.percentage_rate;
    const totalFee = percentageFee + rates.fixed_fee;
    
    return {
      percentage_fee: percentageFee,
      fixed_fee: rates.fixed_fee,
      total_fee: totalFee,
      rate_used: rates.rate_name
    };
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