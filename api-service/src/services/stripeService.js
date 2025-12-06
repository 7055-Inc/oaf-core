/**
 * Stripe Service
 * Comprehensive payment processing service for the Beemeeart platform
 * Handles vendor accounts, payment intents, tax calculations, subscriptions, and financial reporting
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../../config/db');

/**
 * StripeService Class
 * Provides enterprise-grade payment processing with Stripe Connect for multi-vendor marketplace,
 * tax calculation, subscription management, and comprehensive financial reporting
 */
class StripeService {
  /**
   * Initialize StripeService with Stripe SDK
   * Validates Stripe secret key configuration
   */
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.stripe = stripe;
  }

  // ===== VENDOR ACCOUNT MANAGEMENT =====
  
  /**
   * Create a Stripe Connect account for a vendor
   * Sets up Express account with card payments and transfers capability
   * 
   * @param {number} vendorId - Vendor user ID
   * @param {string} email - Vendor email address
   * @param {Object} businessInfo - Additional business information
   * @returns {Promise<Object>} Stripe account object
   * @throws {Error} If account creation fails
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
          platform: 'beemeeart'
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
   * Generate onboarding link for vendor Stripe Connect setup
   * Creates account link with proper return and refresh URLs
   * 
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @param {number} vendorId - Vendor user ID
   * @returns {Promise<Object>} Stripe account link object
   * @throws {Error} If link creation fails
   */
  async createAccountLink(stripeAccountId, vendorId) {
    try {
      // Use environment-configured frontend URL for Stripe Connect onboarding
      const baseUrl = process.env.FRONTEND_URL || 'https://beemeeart.com';
      
      const accountLink = await this.stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${baseUrl}/vendor/onboarding/refresh`,
        return_url: `${baseUrl}/vendor/onboarding/complete`,
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
   * Handles amount conversion and metadata for order tracking
   * 
   * @param {Object} orderData - Order data including amount, currency, customer
   * @param {number} orderData.total_amount - Total amount in dollars
   * @param {string} orderData.currency - Currency code (default: 'usd')
   * @param {string} orderData.customer_id - Stripe customer ID (optional)
   * @param {Object} orderData.metadata - Additional metadata
   * @returns {Promise<Object>} Stripe payment intent object
   * @throws {Error} If payment intent creation fails
   */
  async createPaymentIntent(orderData) {
    try {
      const { total_amount, currency = 'usd', customer_id, metadata = {} } = orderData;

      const paymentIntentParams = {
        amount: Math.round(total_amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          order_id: metadata.order_id?.toString(),
          platform: 'beemeeart',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
      };

      // Only add customer if it's provided
      if (customer_id) {
        paymentIntentParams.customer = customer_id;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Calculate tax using Stripe Tax API
   * Provides accurate tax calculation based on customer address and line items
   * 
   * @param {Object} taxData - Tax calculation data
   * @param {Array} taxData.line_items - Array of line items for tax calculation
   * @param {Object} taxData.customer_address - Customer shipping address
   * @param {string} taxData.currency - Currency code (default: 'usd')
   * @returns {Promise<Object>} Stripe tax calculation object
   * @throws {Error} If tax calculation fails
   */
  async calculateTax(taxData) {
    try {
      const { line_items, customer_address, currency = 'usd' } = taxData;

      const calculation = await this.stripe.tax.calculations.create({
        currency: currency.toLowerCase(),
        line_items: line_items,
        customer_details: {
          address: customer_address,
          address_source: 'shipping'
        }
      });

      return calculation;
    } catch (error) {
      console.error('Error calculating tax:', error);
      throw error;
    }
  }

  /**
   * Create tax transaction from calculation
   */
  async createTaxTransaction(calculationId, reference) {
    try {
      const transaction = await this.stripe.tax.transactions.createFromCalculation({
        calculation: calculationId,
        reference: reference
      });

      return transaction;
    } catch (error) {
      console.error('Error creating tax transaction:', error);
      throw error;
    }
  }

  /**
   * Store tax calculation data in database
   */
  async storeTaxCalculation(taxData) {
    try {
      const {
        order_id,
        stripe_tax_id,
        stripe_payment_intent_id,
        customer_state,
        customer_zip,
        taxable_amount,
        tax_collected,
        tax_rate_used,
        tax_breakdown,
        order_date
      } = taxData;

      const query = `
        INSERT INTO stripe_tax_transactions (
          order_id, stripe_tax_id, stripe_payment_intent_id,
          customer_state, customer_zip, taxable_amount,
          tax_collected, tax_rate_used, tax_breakdown, order_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        order_id,
        stripe_tax_id,
        stripe_payment_intent_id,
        customer_state,
        customer_zip,
        taxable_amount,
        tax_collected,
        tax_rate_used,
        JSON.stringify(tax_breakdown),
        order_date
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error storing tax calculation:', error);
      throw error;
    }
  }

  /**
   * Update order with tax amount
   */
  async updateOrderTaxAmount(orderId, taxAmount) {
    try {
      const query = `
        UPDATE orders 
        SET tax_amount = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await db.execute(query, [taxAmount, orderId]);
    } catch (error) {
      console.error('Error updating order tax amount:', error);
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
          platform: 'beemeeart',
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
   * Distributes payment to vendors based on commission structure
   * 
   * @param {number} orderId - Order ID for transfer processing
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Array>} Array of transfer objects
   * @throws {Error} If transfer processing fails
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

  /**
   * Process vendor transfers with delayed payout (after fulfillment)
   * Creates transfers to vendor Connect accounts with specified payout delay
   * This is the secure flow: payment → fulfillment → transfer → delayed payout
   * 
   * @param {number} orderId - Order ID for transfer processing
   * @param {string} chargeId - Stripe charge ID (ch_xxx) for source_transaction
   * @param {number} payoutDelayDays - Days to delay payout after transfer (default: 3)
   * @returns {Promise<Array>} Array of transfer objects
   * @throws {Error} If transfer processing fails
   */
  async processVendorTransfersWithDelay(orderId, chargeId, payoutDelayDays = 3) {
    try {
      // Get order items with vendor and commission info
      const orderItems = await this.getOrderItemsWithCommissions(orderId);
      const transfers = [];

      for (const item of orderItems) {
        const vendorAmount = item.price - item.commission_amount;
        
        if (vendorAmount > 0 && item.stripe_account_id) {
          // Create transfer to vendor's Connect account
          const transfer = await this.stripe.transfers.create({
            amount: Math.round(vendorAmount * 100), // Convert to cents
            currency: 'usd',
            destination: item.stripe_account_id,
            source_transaction: chargeId, // Use charge ID, not payment intent ID
            metadata: {
              order_id: orderId.toString(),
              vendor_id: item.vendor_id.toString(),
              commission_rate: (item.commission_rate || 0).toString(),
              commission_amount: (item.commission_amount || 0).toString(),
              payout_delay_days: payoutDelayDays.toString()
            }
          });

          transfers.push(transfer);

          // Record transaction with payout delay from TODAY (not from order date)
          await this.recordVendorTransactionWithDelay({
            vendor_id: item.vendor_id,
            order_id: orderId,
            transaction_type: 'sale',
            amount: vendorAmount,
            commission_rate: item.commission_rate || 0,
            commission_amount: item.commission_amount || 0,
            stripe_transfer_id: transfer.id,
            status: 'completed',
            payout_delay_days: payoutDelayDays
          });
        }
      }

      return transfers;
    } catch (error) {
      console.error('Error processing vendor transfers with delay:', error);
      throw error;
    }
  }

  /**
   * Record vendor transaction with specific payout delay
   * Used for fulfillment-triggered transfers
   */
  async recordVendorTransactionWithDelay(transactionData) {
    const query = `
      INSERT INTO vendor_transactions 
      (vendor_id, order_id, transaction_type, amount, commission_rate, commission_amount, stripe_transfer_id, status, payout_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))
    `;
    
    return db.execute(query, [
      transactionData.vendor_id,
      transactionData.order_id,
      transactionData.transaction_type,
      transactionData.amount,
      transactionData.commission_rate,
      transactionData.commission_amount,
      transactionData.stripe_transfer_id,
      transactionData.status,
      transactionData.payout_delay_days
    ]);
  }

  // ===== COMMISSION CALCULATIONS =====

  /**
   * Calculate commission for order items with proper Stripe fee handling
   * Supports both commission and pass-through fee structures
   * 
   * @param {Array} orderItems - Array of order items to calculate commissions for
   * @returns {Promise<Array>} Array of items with commission calculations
   * @throws {Error} If commission calculation fails
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
          // Customer not found in Stripe, will create new one
        }
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          user_id: userId.toString(),
          platform: 'beemeeart'
        }
      });

      return customer;
    } catch (error) {
      console.error('Error creating/getting Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Update customer address for tax calculation
   */
  async updateCustomerAddress(customerId, address) {
    try {
      await this.stripe.customers.update(customerId, {
        address: {
          line1: address.line1,
          line2: address.line2 || null,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country || 'US'
        }
      });
    } catch (error) {
      console.error('Error updating customer address:', error);
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
          platform: 'beemeeart'
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
          platform: 'beemeeart'
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
    
    // Ensure values are numbers, not strings from database
    const percentageRate = parseFloat(rates.percentage_rate);
    const fixedFee = parseFloat(rates.fixed_fee);
    
    const percentageFee = amount * percentageRate;
    const totalFee = percentageFee + fixedFee;
    
    return {
      percentage_fee: percentageFee,
      fixed_fee: fixedFee,
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

  // ===== PHASE 2: ENHANCED TAX TRACKING & REPORTING =====

  /**
   * Create order tax summary record from stripe_tax_transactions
   */
  async createOrderTaxSummary(orderId, stripeTaxTransactionId) {
    try {
      // Get the stripe tax transaction data
      const query = `
        SELECT 
          stt.customer_state,
          stt.customer_zip,
          stt.taxable_amount,
          stt.tax_collected,
          stt.tax_rate_used,
          stt.order_date,
          stt.tax_breakdown
        FROM stripe_tax_transactions stt
        WHERE stt.id = ? AND stt.order_id = ?
      `;
      
      const [rows] = await db.execute(query, [stripeTaxTransactionId, orderId]);
      
      if (rows.length === 0) {
        throw new Error('Stripe tax transaction not found');
      }

      const taxData = rows[0];
      
      // Extract jurisdiction from tax breakdown JSON
      let taxJurisdiction = 'Unknown';
      if (taxData.tax_breakdown) {
        try {
          const breakdown = JSON.parse(taxData.tax_breakdown);
          if (breakdown.tax_breakdown && breakdown.tax_breakdown.length > 0) {
            const firstBreakdown = breakdown.tax_breakdown[0];
            if (firstBreakdown.jurisdiction) {
              taxJurisdiction = `${firstBreakdown.jurisdiction.country || 'US'}-${firstBreakdown.jurisdiction.state || taxData.customer_state}`;
              if (firstBreakdown.jurisdiction.county) {
                taxJurisdiction += `-${firstBreakdown.jurisdiction.county}`;
              }
            }
          }
        } catch (e) {
          console.warn('Could not parse tax breakdown JSON:', e);
        }
      }

      // Insert into order_tax_summary
      const insertQuery = `
        INSERT INTO order_tax_summary (
          order_id, stripe_tax_transaction_id, customer_state, customer_zip,
          taxable_amount, tax_collected, tax_rate_used, tax_jurisdiction, order_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await db.execute(insertQuery, [
        orderId,
        stripeTaxTransactionId,
        taxData.customer_state,
        taxData.customer_zip,
        taxData.taxable_amount,
        taxData.tax_collected,
        taxData.tax_rate_used,
        taxJurisdiction,
        taxData.order_date
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating order tax summary:', error);
      throw error;
    }
  }

  /**
   * Generate vendor tax summary for a specific period
   */
  async generateVendorTaxSummary(vendorId, reportPeriod) {
    try {
      // Get all orders for this vendor in the period
      const query = `
        SELECT 
          o.id as order_id,
          o.total_amount,
          o.tax_amount,
          o.created_at,
          oi.product_id,
          p.vendor_id,
          ots.taxable_amount,
          ots.tax_collected,
          ots.customer_state,
          ots.tax_jurisdiction
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN order_tax_summary ots ON o.id = ots.order_id
        WHERE p.vendor_id = ?
        AND DATE_FORMAT(o.created_at, '%Y-%m') = ?
        AND o.status = 'paid'
      `;
      
      const [rows] = await db.execute(query, [vendorId, reportPeriod]);
      
      if (rows.length === 0) {
        return {
          vendor_id: vendorId,
          report_period: reportPeriod,
          total_sales: 0,
          total_taxable_amount: 0,
          total_tax_collected: 0,
          order_count: 0,
          states: []
        };
      }

      // Calculate totals
      const totalSales = rows.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
      const totalTaxableAmount = rows.reduce((sum, row) => sum + parseFloat(row.taxable_amount || 0), 0);
      const totalTaxCollected = rows.reduce((sum, row) => sum + parseFloat(row.tax_collected || 0), 0);
      const orderCount = new Set(rows.map(row => row.order_id)).size;

      // Group by state
      const stateBreakdown = {};
      rows.forEach(row => {
        if (row.customer_state) {
          if (!stateBreakdown[row.customer_state]) {
            stateBreakdown[row.customer_state] = {
              state: row.customer_state,
              sales: 0,
              taxable_amount: 0,
              tax_collected: 0,
              order_count: 0
            };
          }
          stateBreakdown[row.customer_state].sales += parseFloat(row.total_amount || 0);
          stateBreakdown[row.customer_state].taxable_amount += parseFloat(row.taxable_amount || 0);
          stateBreakdown[row.customer_state].tax_collected += parseFloat(row.tax_collected || 0);
          stateBreakdown[row.customer_state].order_count++;
        }
      });

      // Update or insert vendor tax summary
      const upsertQuery = `
        INSERT INTO vendor_tax_summary (
          vendor_id, report_period, total_sales, total_taxable_amount, 
          total_tax_collected, report_generated
        ) VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          total_sales = VALUES(total_sales),
          total_taxable_amount = VALUES(total_taxable_amount),
          total_tax_collected = VALUES(total_tax_collected),
          report_generated = 1,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await db.execute(upsertQuery, [
        vendorId,
        reportPeriod,
        totalSales,
        totalTaxableAmount,
        totalTaxCollected
      ]);

      return {
        vendor_id: vendorId,
        report_period: reportPeriod,
        total_sales: totalSales,
        total_taxable_amount: totalTaxableAmount,
        total_tax_collected: totalTaxCollected,
        order_count: orderCount,
        states: Object.values(stateBreakdown)
      };
    } catch (error) {
      console.error('Error generating vendor tax summary:', error);
      throw error;
    }
  }

  /**
   * Get vendor tax summary for a specific period
   */
  async getVendorTaxSummary(vendorId, reportPeriod) {
    try {
      const query = `
        SELECT 
          vts.*,
          u.username as vendor_name,
          u.username as vendor_email
        FROM vendor_tax_summary vts
        JOIN users u ON vts.vendor_id = u.id
        WHERE vts.vendor_id = ? AND vts.report_period = ?
      `;
      
      const [rows] = await db.execute(query, [vendorId, reportPeriod]);
      
      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      console.error('Error getting vendor tax summary:', error);
      throw error;
    }
  }

  /**
   * Get state-by-state tax breakdown for a vendor
   */
  async getVendorStateTaxBreakdown(vendorId, reportPeriod) {
    try {
      const query = `
        SELECT 
          ots.customer_state,
          COUNT(DISTINCT ots.order_id) as order_count,
          SUM(ots.taxable_amount) as total_taxable_amount,
          SUM(ots.tax_collected) as total_tax_collected,
          AVG(ots.tax_rate_used) as avg_tax_rate
        FROM order_tax_summary ots
        JOIN orders o ON ots.order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.vendor_id = ?
        AND DATE_FORMAT(o.created_at, '%Y-%m') = ?
        AND o.status = 'paid'
        GROUP BY ots.customer_state
        ORDER BY total_tax_collected DESC
      `;
      
      const [rows] = await db.execute(query, [vendorId, reportPeriod]);
      return rows;
    } catch (error) {
      console.error('Error getting vendor state tax breakdown:', error);
      throw error;
    }
  }

  /**
   * Populate order_tax_summary for existing orders (backfill)
   */
  async backfillOrderTaxSummaries() {
    try {
      const query = `
        SELECT 
          stt.id as stripe_tax_transaction_id,
          stt.order_id
        FROM stripe_tax_transactions stt
        LEFT JOIN order_tax_summary ots ON stt.order_id = ots.order_id
        WHERE ots.id IS NULL
        AND stt.tax_collected > 0
      `;
      
      const [rows] = await db.execute(query);
      
      let processed = 0;
      let errors = 0;
      
      for (const row of rows) {
        try {
          await this.createOrderTaxSummary(row.order_id, row.stripe_tax_transaction_id);
          processed++;
        } catch (error) {
          console.error(`Error processing order ${row.order_id}:`, error);
          errors++;
        }
        }
      
      return {
        processed,
        errors,
        total: rows.length
      };
    } catch (error) {
      console.error('Error backfilling order tax summaries:', error);
      throw error;
    }
  }
}

module.exports = new StripeService(); 