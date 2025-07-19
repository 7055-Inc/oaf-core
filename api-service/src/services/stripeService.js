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
   * Create payment intent for event booth fees with custom expiration
   */
  async createEventPaymentIntent(eventPaymentData) {
    try {
      const { amount, currency = 'usd', expires_at, metadata = {} } = eventPaymentData;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        expires_at: expires_at, // Custom expiration timestamp
        metadata: {
          platform: 'oaf',
          payment_type: 'event_booth_fee',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating event payment intent:', error);
      throw error;
    }
  }

  /**
   * Get payment intent details from Stripe
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error getting payment intent:', error);
      throw error;
    }
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error canceling payment intent:', error);
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

  // ===== SUBSCRIPTION MANAGEMENT =====

  /**
   * Create or retrieve subscription products in Stripe
   */
  async setupSubscriptionProducts() {
    try {
      const products = [];

      // Base Verification Product - $50/year
      let baseProduct;
      try {
        baseProduct = await this.stripe.products.retrieve('verification_base');
      } catch (error) {
        if (error.code === 'resource_missing') {
          baseProduct = await this.stripe.products.create({
            id: 'verification_base',
            name: 'Artist Verification - Base',
            description: 'Annual verified artist status with enhanced application features',
            metadata: {
              type: 'verification_base',
              platform: 'oaf'
            }
          });
        } else {
          throw error;
        }
      }

      // Create or retrieve base verification price
      let basePrice;
      try {
        const prices = await this.stripe.prices.list({ product: 'verification_base', active: true });
        basePrice = prices.data.find(p => p.unit_amount === 5000);
        
        if (!basePrice) {
          basePrice = await this.stripe.prices.create({
            product: baseProduct.id,
            unit_amount: 5000, // $50.00 in cents
            currency: 'usd',
            recurring: {
              interval: 'year',
              interval_count: 1
            },
            metadata: {
              type: 'verification_base',
              platform: 'oaf'
            }
          });
        }
      } catch (error) {
        throw error;
      }

      products.push({ product: baseProduct, price: basePrice });

      // Additional Persona Product - $10/year
      let personaProduct;
      try {
        personaProduct = await this.stripe.products.retrieve('verification_persona');
      } catch (error) {
        if (error.code === 'resource_missing') {
          personaProduct = await this.stripe.products.create({
            id: 'verification_persona',
            name: 'Artist Verification - Additional Persona',
            description: 'Additional verified persona/packet for multi-identity artists',
            metadata: {
              type: 'verification_persona',
              platform: 'oaf'
            }
          });
        } else {
          throw error;
        }
      }

      // Create or retrieve persona price
      let personaPrice;
      try {
        const prices = await this.stripe.prices.list({ product: 'verification_persona', active: true });
        personaPrice = prices.data.find(p => p.unit_amount === 1000);
        
        if (!personaPrice) {
          personaPrice = await this.stripe.prices.create({
            product: personaProduct.id,
            unit_amount: 1000, // $10.00 in cents
            currency: 'usd',
            recurring: {
              interval: 'year',
              interval_count: 1
            },
            metadata: {
              type: 'verification_persona',
              platform: 'oaf'
            }
          });
        }
      } catch (error) {
        throw error;
      }

      products.push({ product: personaProduct, price: personaPrice });

      return products;
    } catch (error) {
      console.error('Error setting up subscription products:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe customer if not exists
   */
  async createOrGetCustomer(userId, email, name = null) {
    try {
      // Check if customer already exists in our database
      const [existing] = await db.execute(
        'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1',
        [userId]
      );

      if (existing.length > 0 && existing[0].stripe_customer_id) {
        try {
          const customer = await this.stripe.customers.retrieve(existing[0].stripe_customer_id);
          return customer;
        } catch (error) {
          console.log('Customer not found in Stripe, creating new one');
        }
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          user_id: userId.toString(),
          platform: 'oaf'
        }
      });

      return customer;
    } catch (error) {
      console.error('Error creating/getting Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create a subscription for verification
   */
  async createVerificationSubscription(userId, email, name, priceIds = [], paymentMethodId = null) {
    try {
      // Create or get customer
      const customer = await this.createOrGetCustomer(userId, email, name);

      // Prepare subscription items
      const items = priceIds.map(priceId => ({ price: priceId }));

      // Create subscription parameters
      const subscriptionParams = {
        customer: customer.id,
        items: items,
        metadata: {
          user_id: userId.toString(),
          type: 'verification',
          platform: 'oaf'
        },
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription' 
        },
        expand: ['latest_invoice.payment_intent']
      };

      // Add payment method if provided
      if (paymentMethodId) {
        subscriptionParams.default_payment_method = paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      return subscription;
    } catch (error) {
      console.error('Error creating verification subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription items (add/remove personas)
   */
  async updateVerificationSubscription(subscriptionId, priceIds) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      // Build new subscription items
      const items = priceIds.map(priceId => ({ price: priceId }));

      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: items,
        proration_behavior: 'create_prorations'
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error updating verification subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a verification subscription
   */
  async cancelVerificationSubscription(subscriptionId, immediately = false) {
    try {
      if (immediately) {
        const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
        return subscription;
      } else {
        const subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
        return subscription;
      }
    } catch (error) {
      console.error('Error canceling verification subscription:', error);
      throw error;
    }
  }

  /**
   * Check Connect account balance for a user
   */
  async getConnectAccountBalance(userId) {
    try {
      const [vendorSettings] = await db.execute(
        'SELECT stripe_account_id FROM vendor_settings WHERE vendor_id = ?',
        [userId]
      );

      if (!vendorSettings.length || !vendorSettings[0].stripe_account_id) {
        return { available: 0, pending: 0, connect_account_id: null };
      }

      const connectAccountId = vendorSettings[0].stripe_account_id;

      // Get Connect account balance
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: connectAccountId
      });

      const availableBalance = balance.available.reduce((total, b) => total + b.amount, 0);
      const pendingBalance = balance.pending.reduce((total, b) => total + b.amount, 0);

      return {
        available: availableBalance / 100, // Convert to dollars
        pending: pendingBalance / 100,
        connect_account_id: connectAccountId
      };
    } catch (error) {
      console.error('Error getting Connect account balance:', error);
      return { available: 0, pending: 0, connect_account_id: null };
    }
  }

  /**
   * Process subscription payment with Connect balance priority
   */
  async processSubscriptionPaymentWithConnectBalance(userId, subscriptionId, amountCents) {
    try {
      const amountDollars = amountCents / 100;
      
      // Check if user prefers Connect balance payments
      const [userPrefs] = await db.execute(
        'SELECT prefer_connect_balance FROM user_subscriptions WHERE user_id = ? AND stripe_subscription_id = ?',
        [userId, subscriptionId]
      );

      if (!userPrefs.length || !userPrefs[0].prefer_connect_balance) {
        return { 
          success: false, 
          reason: 'User does not prefer Connect balance payments',
          use_stripe_default: true 
        };
      }

      // Get Connect balance
      const balanceInfo = await this.getConnectAccountBalance(userId);
      
      if (!balanceInfo.connect_account_id) {
        return { 
          success: false, 
          reason: 'No Connect account found',
          use_stripe_default: true 
        };
      }

      if (balanceInfo.available < amountDollars) {
        return { 
          success: false, 
          reason: `Insufficient balance. Available: $${balanceInfo.available.toFixed(2)}, Required: $${amountDollars.toFixed(2)}`,
          available_balance: balanceInfo.available,
          use_stripe_default: true 
        };
      }

      // Process transfer from Connect balance
      const transfer = await this.stripe.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: process.env.STRIPE_PLATFORM_ACCOUNT_ID || 'default', // Platform account
        source_transaction: balanceInfo.connect_account_id,
        metadata: {
          user_id: userId.toString(),
          subscription_id: subscriptionId,
          type: 'verification_payment',
          platform: 'oaf'
        }
      });

      return { 
        success: true, 
        transfer_id: transfer.id,
        amount_processed: amountDollars,
        remaining_balance: balanceInfo.available - amountDollars,
        payment_method: 'connect_balance'
      };

    } catch (error) {
      console.error('Error processing subscription from Connect balance:', error);
      return { 
        success: false, 
        reason: error.message,
        use_stripe_default: true 
      };
    }
  }

  /**
   * Process subscription payment from Connect balance (legacy method)
   */
  async processSubscriptionFromConnectBalance(userId, amount, subscriptionId) {
    const result = await this.processSubscriptionPaymentWithConnectBalance(userId, subscriptionId, amount);
    
    if (result.success) {
      return { transfer_id: result.transfer_id };
    } else {
      throw new Error(result.reason);
    }
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