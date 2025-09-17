const db = require('../../config/db');

class DiscountService {
  
  /**
   * Apply all applicable discounts to cart items
   * @param {Array} cartItems - Cart items with product details
   * @param {number} userId - User ID for usage tracking
   * @param {Array} appliedCoupons - Array of coupon codes to apply
   * @returns {Array} Cart items with discounts applied
   */
  async applyDiscounts(cartItems, userId, appliedCoupons = []) {
    try {
      const itemsWithDiscounts = [];
      
      for (const item of cartItems) {
        // Get all applicable discounts for this item
        const availableDiscounts = await this.getApplicableDiscounts(item, userId, appliedCoupons);
        
        // Apply best discount (highest customer savings)
        const bestDiscount = this.calculateBestDiscount(availableDiscounts);
        
        // Apply discount to item
        const discountedItem = await this.applyDiscountToItem(item, bestDiscount, userId);
        
        itemsWithDiscounts.push(discountedItem);
      }
      
      return itemsWithDiscounts;
    } catch (error) {
      console.error('Error applying discounts:', error);
      throw error;
    }
  }

  /**
   * Get all applicable discounts for a specific item
   * @param {Object} item - Cart item with product details
   * @param {number} userId - User ID for usage validation
   * @param {Array} appliedCoupons - Coupon codes to check
   * @returns {Array} Available discounts for this item
   */
  async getApplicableDiscounts(item, userId, appliedCoupons = []) {
    const discounts = [];
    
    try {
      // 1. Get auto-apply sales for this product
      const autoSales = await this.getAutoApplySales(item.product_id, item.vendor_id);
      discounts.push(...autoSales);
      
      // 2. Validate and get coupon discounts
      for (const couponCode of appliedCoupons) {
        const couponDiscount = await this.validateCouponForItem(couponCode, item, userId);
        if (couponDiscount) {
          discounts.push(couponDiscount);
        }
      }
      
      // 3. Get applicable promotions
      const promotions = await this.getApplicablePromotions(item.product_id, item.vendor_id, userId);
      discounts.push(...promotions);
      
      return discounts;
    } catch (error) {
      console.error('Error getting applicable discounts:', error);
      return [];
    }
  }

  /**
   * Get auto-apply sales for a product
   * @param {number} productId - Product ID
   * @param {number} vendorId - Vendor ID
   * @returns {Array} Auto-apply sales
   */
  async getAutoApplySales(productId, vendorId) {
    try {
      const query = `
        SELECT 
          c.id,
          c.code,
          c.name,
          c.discount_type,
          c.discount_value,
          c.coupon_type,
          'coupon' as source_type,
          NULL as admin_discount_percentage,
          NULL as vendor_discount_percentage
        FROM coupons c
        LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
        WHERE c.is_active = 1
          AND c.application_type = 'auto_apply'
          AND (c.valid_from <= NOW())
          AND (c.valid_until IS NULL OR c.valid_until >= NOW())
          AND (
            -- Site-wide sale (no specific products)
            (c.coupon_type = 'site_sale' AND cp.coupon_id IS NULL)
            OR
            -- Specific product inclusion
            (cp.product_id = ? AND cp.vendor_id = ?)
            OR
            -- Vendor-wide coupon (all vendor products)
            (c.created_by_vendor_id = ? AND cp.coupon_id IS NULL)
          )
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
      
      const [results] = await db.execute(query, [productId, vendorId, vendorId]);
      
      return results.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        discount_type: row.discount_type,
        discount_value: row.discount_value,
        source_type: row.source_type,
        coupon_type: row.coupon_type,
        admin_discount_percentage: row.admin_discount_percentage,
        vendor_discount_percentage: row.vendor_discount_percentage
      }));
    } catch (error) {
      console.error('Error getting auto-apply sales:', error);
      return [];
    }
  }

  /**
   * Validate coupon code for specific item
   * @param {string} couponCode - Coupon code to validate
   * @param {Object} item - Cart item
   * @param {number} userId - User ID
   * @returns {Object|null} Coupon discount object or null
   */
  async validateCouponForItem(couponCode, item, userId) {
    try {
      // Get coupon details
      const query = `
        SELECT 
          c.id,
          c.code,
          c.name,
          c.discount_type,
          c.discount_value,
          c.coupon_type,
          c.usage_limit_per_user,
          c.total_usage_limit,
          c.current_usage_count,
          c.min_order_amount,
          c.created_by_vendor_id
        FROM coupons c
        WHERE c.code = ?
          AND c.is_active = 1
          AND c.application_type = 'coupon_code'
          AND (c.valid_from <= NOW())
          AND (c.valid_until IS NULL OR c.valid_until >= NOW())
      `;
      
      const [couponResults] = await db.execute(query, [couponCode]);
      
      if (couponResults.length === 0) {
        return null; // Invalid or expired coupon
      }
      
      const coupon = couponResults[0];
      
      // Check if coupon applies to this product
      const productEligible = await this.isCouponEligibleForProduct(coupon.id, item.product_id, item.vendor_id);
      if (!productEligible) {
        return null;
      }
      
      // Check usage limits
      const usageValid = await this.validateCouponUsage(coupon, userId);
      if (!usageValid) {
        return null;
      }
      
      return {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        source_type: 'coupon',
        coupon_type: coupon.coupon_type,
        admin_discount_percentage: null,
        vendor_discount_percentage: null
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return null;
    }
  }

  /**
   * Check if coupon is eligible for specific product
   * @param {number} couponId - Coupon ID
   * @param {number} productId - Product ID
   * @param {number} vendorId - Vendor ID
   * @returns {boolean} True if eligible
   */
  async isCouponEligibleForProduct(couponId, productId, vendorId) {
    try {
      // Check if coupon has specific product restrictions
      const query = `
        SELECT COUNT(*) as product_count
        FROM coupon_products cp
        WHERE cp.coupon_id = ?
      `;
      
      const [countResults] = await db.execute(query, [couponId]);
      const hasProductRestrictions = countResults[0].product_count > 0;
      
      if (!hasProductRestrictions) {
        // No product restrictions - applies to all products from coupon creator
        return true;
      }
      
      // Check if this specific product is included
      const productQuery = `
        SELECT COUNT(*) as matches
        FROM coupon_products cp
        WHERE cp.coupon_id = ? AND cp.product_id = ? AND cp.vendor_id = ?
      `;
      
      const [productResults] = await db.execute(productQuery, [couponId, productId, vendorId]);
      return productResults[0].matches > 0;
    } catch (error) {
      console.error('Error checking coupon eligibility:', error);
      return false;
    }
  }

  /**
   * Validate coupon usage limits
   * @param {Object} coupon - Coupon object
   * @param {number} userId - User ID
   * @returns {boolean} True if usage is valid
   */
  async validateCouponUsage(coupon, userId) {
    try {
      // Check total usage limit
      if (coupon.total_usage_limit && coupon.current_usage_count >= coupon.total_usage_limit) {
        return false;
      }
      
      // Check per-user usage limit
      if (coupon.usage_limit_per_user) {
        const userUsageQuery = `
          SELECT COUNT(*) as user_usage
          FROM coupon_usage cu
          WHERE cu.coupon_id = ? AND cu.user_id = ?
        `;
        
        const [usageResults] = await db.execute(userUsageQuery, [coupon.id, userId]);
        const userUsage = usageResults[0].user_usage;
        
        if (userUsage >= coupon.usage_limit_per_user) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error validating coupon usage:', error);
      return false;
    }
  }

  /**
   * Get applicable promotions for product
   * @param {number} productId - Product ID
   * @param {number} vendorId - Vendor ID
   * @param {number} userId - User ID
   * @returns {Array} Applicable promotions
   */
  async getApplicablePromotions(productId, vendorId, userId) {
    try {
      const query = `
        SELECT 
          p.id,
          p.name,
          p.coupon_code,
          pp.admin_discount_percentage,
          pp.vendor_discount_percentage,
          pp.total_customer_discount,
          p.usage_limit_per_user,
          p.total_usage_limit,
          p.current_usage_count
        FROM promotions p
        JOIN promotion_products pp ON p.id = pp.promotion_id
        JOIN promotion_invitations pi ON p.id = pi.promotion_id
        WHERE p.status = 'active'
          AND (p.valid_from <= NOW())
          AND (p.valid_until IS NULL OR p.valid_until >= NOW())
          AND pp.product_id = ?
          AND pp.vendor_id = ?
          AND pp.approval_status = 'approved'
          AND pi.vendor_id = ?
          AND pi.invitation_status = 'accepted'
      `;
      
      const [results] = await db.execute(query, [productId, vendorId, vendorId]);
      
      const validPromotions = [];
      
      for (const promo of results) {
        // Check usage limits
        const usageValid = await this.validatePromotionUsage(promo, userId);
        if (usageValid) {
          validPromotions.push({
            id: promo.id,
            code: promo.coupon_code,
            name: promo.name,
            discount_type: 'percentage',
            discount_value: promo.total_customer_discount,
            source_type: 'promotion',
            admin_discount_percentage: promo.admin_discount_percentage,
            vendor_discount_percentage: promo.vendor_discount_percentage
          });
        }
      }
      
      return validPromotions;
    } catch (error) {
      console.error('Error getting applicable promotions:', error);
      return [];
    }
  }

  /**
   * Validate promotion usage limits
   * @param {Object} promotion - Promotion object
   * @param {number} userId - User ID
   * @returns {boolean} True if usage is valid
   */
  async validatePromotionUsage(promotion, userId) {
    try {
      // Check total usage limit
      if (promotion.total_usage_limit && promotion.current_usage_count >= promotion.total_usage_limit) {
        return false;
      }
      
      // Check per-user usage limit
      if (promotion.usage_limit_per_user) {
        const userUsageQuery = `
          SELECT COUNT(*) as user_usage
          FROM promotion_usage pu
          WHERE pu.promotion_id = ? AND pu.user_id = ?
        `;
        
        const [usageResults] = await db.execute(userUsageQuery, [promotion.id, userId]);
        const userUsage = usageResults[0].user_usage;
        
        if (userUsage >= promotion.usage_limit_per_user) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error validating promotion usage:', error);
      return false;
    }
  }

  /**
   * Calculate best discount from available options
   * @param {Array} availableDiscounts - Array of discount options
   * @returns {Object|null} Best discount or null
   */
  calculateBestDiscount(availableDiscounts) {
    if (!availableDiscounts || availableDiscounts.length === 0) {
      return null;
    }
    
    // Sort by discount value (highest first) - assumes percentage discounts for now
    const sortedDiscounts = availableDiscounts.sort((a, b) => {
      if (a.discount_type === 'percentage' && b.discount_type === 'percentage') {
        return b.discount_value - a.discount_value;
      }
      // For mixed types, would need price to calculate - for now prefer percentage
      if (a.discount_type === 'percentage') return -1;
      if (b.discount_type === 'percentage') return 1;
      return b.discount_value - a.discount_value;
    });
    
    return sortedDiscounts[0];
  }

  /**
   * Apply discount to individual item
   * @param {Object} item - Cart item
   * @param {Object} discount - Discount to apply
   * @param {number} userId - User ID
   * @returns {Object} Item with discount applied
   */
  async applyDiscountToItem(item, discount, userId) {
    if (!discount) {
      return {
        ...item,
        discount_applied: false,
        original_price: item.price,
        discounted_price: item.price,
        discount_amount: 0,
        discount_details: null
      };
    }
    
    try {
      // Calculate discount amount
      let discountAmount = 0;
      if (discount.discount_type === 'percentage') {
        discountAmount = (item.price * discount.discount_value) / 100;
      } else if (discount.discount_type === 'fixed_amount') {
        discountAmount = Math.min(discount.discount_value, item.price);
      }
      
      const discountedPrice = Math.max(0, item.price - discountAmount);
      
      // Check commission safety rule for admin-funded discounts
      if (discount.coupon_type === 'site_sale') {
        const commissionSafe = await this.validateCommissionSafety(item, discountAmount);
        if (!commissionSafe) {
          // Exclude from discount
          return {
            ...item,
            discount_applied: false,
            original_price: item.price,
            discounted_price: item.price,
            discount_amount: 0,
            discount_details: null,
            discount_excluded: true,
            exclusion_reason: 'Commission safety rule - would reduce platform commission below 3%'
          };
        }
      }
      
      // Calculate cost allocation
      const costAllocation = this.calculateDiscountCostAllocation(discount, discountAmount);
      
      return {
        ...item,
        discount_applied: true,
        original_price: item.price,
        discounted_price: discountedPrice,
        discount_amount: discountAmount,
        discount_details: {
          id: discount.id,
          code: discount.code,
          name: discount.name,
          source_type: discount.source_type,
          discount_type: discount.discount_type,
          discount_value: discount.discount_value,
          admin_cost: costAllocation.admin_cost,
          vendor_cost: costAllocation.vendor_cost
        }
      };
    } catch (error) {
      console.error('Error applying discount to item:', error);
      return item;
    }
  }

  /**
   * Validate commission safety rule (3% minimum)
   * @param {Object} item - Cart item
   * @param {number} discountAmount - Discount amount
   * @returns {boolean} True if commission remains above 3%
   */
  async validateCommissionSafety(item, discountAmount) {
    try {
      // Get commission rate for this vendor
      const commissionQuery = `
        SELECT fee_structure
        FROM financial_settings fs
        JOIN users u ON fs.vendor_id = u.id
        WHERE u.id = ?
      `;
      
      const [results] = await db.execute(commissionQuery, [item.vendor_id]);
      
      if (results.length === 0) {
        return false; // No commission structure found
      }
      
      const feeStructure = JSON.parse(results[0].fee_structure);
      const commissionRate = feeStructure.commission_percentage || 15; // Default 15%
      
      const originalCommission = (item.price * commissionRate) / 100;
      const adjustedCommission = originalCommission - discountAmount;
      const minCommission = item.price * 0.03; // 3% minimum
      
      return adjustedCommission >= minCommission;
    } catch (error) {
      console.error('Error validating commission safety:', error);
      return false;
    }
  }

  /**
   * Calculate discount cost allocation between admin and vendor
   * @param {Object} discount - Discount object
   * @param {number} discountAmount - Total discount amount
   * @returns {Object} Cost allocation
   */
  calculateDiscountCostAllocation(discount, discountAmount) {
    let adminCost = 0;
    let vendorCost = 0;
    
    if (discount.source_type === 'coupon') {
      if (discount.coupon_type === 'vendor_coupon') {
        // Vendor pays 100%
        vendorCost = discountAmount;
      } else if (discount.coupon_type === 'admin_coupon' || discount.coupon_type === 'site_sale') {
        // Admin pays 100%
        adminCost = discountAmount;
      }
    } else if (discount.source_type === 'promotion') {
      // Split based on percentages
      const totalPercentage = discount.admin_discount_percentage + discount.vendor_discount_percentage;
      if (totalPercentage > 0) {
        adminCost = (discountAmount * discount.admin_discount_percentage) / totalPercentage;
        vendorCost = (discountAmount * discount.vendor_discount_percentage) / totalPercentage;
      }
    }
    
    return {
      admin_cost: Math.round(adminCost * 100) / 100, // Round to 2 decimal places
      vendor_cost: Math.round(vendorCost * 100) / 100
    };
  }

  /**
   * Record discount usage after successful order
   * @param {Array} appliedDiscounts - Discounts that were applied
   * @param {number} userId - User ID
   * @param {number} orderId - Order ID
   */
  async recordDiscountUsage(appliedDiscounts, userId, orderId) {
    try {
      for (const discount of appliedDiscounts) {
        if (discount.source_type === 'coupon') {
          // Record coupon usage
          await db.execute(
            'INSERT INTO coupon_usage (coupon_id, user_id, order_id, used_at) VALUES (?, ?, ?, NOW())',
            [discount.id, userId, orderId]
          );
          
          // Update coupon usage count
          await db.execute(
            'UPDATE coupons SET current_usage_count = current_usage_count + 1 WHERE id = ?',
            [discount.id]
          );
        } else if (discount.source_type === 'promotion') {
          // Record promotion usage
          await db.execute(
            'INSERT INTO promotion_usage (promotion_id, user_id, order_id, used_at) VALUES (?, ?, ?, NOW())',
            [discount.id, userId, orderId]
          );
          
          // Update promotion usage count
          await db.execute(
            'UPDATE promotions SET current_usage_count = current_usage_count + 1 WHERE id = ?',
            [discount.id]
          );
        }
      }
    } catch (error) {
      console.error('Error recording discount usage:', error);
      throw error;
    }
  }

  /**
   * Validate coupon code (without applying)
   * @param {string} couponCode - Coupon code to validate
   * @param {number} userId - User ID
   * @param {Array} cartItems - Cart items for validation
   * @returns {Object} Validation result
   */
  async validateCouponCode(couponCode, userId, cartItems = []) {
    try {
      const query = `
        SELECT 
          c.id,
          c.code,
          c.name,
          c.description,
          c.discount_type,
          c.discount_value,
          c.coupon_type,
          c.usage_limit_per_user,
          c.total_usage_limit,
          c.current_usage_count,
          c.min_order_amount,
          c.valid_from,
          c.valid_until
        FROM coupons c
        WHERE c.code = ? AND c.is_active = 1
      `;
      
      const [results] = await db.execute(query, [couponCode]);
      
      if (results.length === 0) {
        return {
          valid: false,
          error: 'Coupon code not found or inactive'
        };
      }
      
      const coupon = results[0];
      
      // Check expiration
      const now = new Date();
      if (new Date(coupon.valid_from) > now) {
        return {
          valid: false,
          error: 'Coupon is not yet active'
        };
      }
      
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return {
          valid: false,
          error: 'Coupon has expired'
        };
      }
      
      // Check usage limits
      const usageValid = await this.validateCouponUsage(coupon, userId);
      if (!usageValid) {
        return {
          valid: false,
          error: 'Coupon usage limit exceeded'
        };
      }
      
      // Check if applies to any cart items
      let applicableItems = 0;
      for (const item of cartItems) {
        const eligible = await this.isCouponEligibleForProduct(coupon.id, item.product_id, item.vendor_id);
        if (eligible) {
          applicableItems++;
        }
      }
      
      if (cartItems.length > 0 && applicableItems === 0) {
        return {
          valid: false,
          error: 'Coupon does not apply to any items in your cart'
        };
      }
      
      return {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          applicable_items: applicableItems
        }
      };
    } catch (error) {
      console.error('Error validating coupon code:', error);
      return {
        valid: false,
        error: 'Failed to validate coupon code'
      };
    }
  }
}

module.exports = new DiscountService();
