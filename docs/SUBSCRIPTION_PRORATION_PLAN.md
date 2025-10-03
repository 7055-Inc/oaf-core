# Subscription Proration Implementation Plan

## 🎯 **Overview**

This document outlines the implementation plan for adding prorated billing support to the Beemeeart subscription system. Currently, the system uses fixed monthly pricing without mid-cycle adjustments.

## 📊 **Current State Analysis**

### ✅ **What's Working**
- Multi-type subscriptions (Website, Shipping, Verification, Marketplace)
- Stripe integration with webhook handling
- Connect balance payment support
- Robust database schema (`user_subscriptions`, `subscription_payments`)
- Permission-based access control

### ❌ **What Needs Implementation**
- Prorated signup calculations for mid-cycle starts
- Plan upgrade/downgrade with fair billing adjustments
- Addon addition/removal with partial month pricing
- Billing cycle management and tracking

## 🏗️ **Implementation Plan**

### **Phase 1: Database Schema Enhancements**

#### 1.1 Add Proration Tracking Fields
```sql
-- Add to user_subscriptions table
ALTER TABLE user_subscriptions ADD COLUMN billing_cycle_start DATE;
ALTER TABLE user_subscriptions ADD COLUMN billing_cycle_end DATE;
ALTER TABLE user_subscriptions ADD COLUMN proration_enabled TINYINT(1) DEFAULT 1;
ALTER TABLE user_subscriptions ADD COLUMN plan_name VARCHAR(100);
ALTER TABLE user_subscriptions ADD COLUMN base_monthly_price DECIMAL(10,2);

-- Add to subscription_payments table  
ALTER TABLE subscription_payments ADD COLUMN prorated_amount DECIMAL(10,2);
ALTER TABLE subscription_payments ADD COLUMN proration_days INT;
ALTER TABLE subscription_payments ADD COLUMN billing_cycle_days INT;
ALTER TABLE subscription_payments ADD COLUMN proration_reason ENUM('signup', 'upgrade', 'downgrade', 'addon_add', 'addon_remove');
```

#### 1.2 Create Subscription Changes Log
```sql
CREATE TABLE subscription_changes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  subscription_id BIGINT NOT NULL,
  change_type ENUM('plan_change', 'addon_add', 'addon_remove', 'cancel') NOT NULL,
  old_plan_name VARCHAR(100),
  new_plan_name VARCHAR(100),
  old_monthly_price DECIMAL(10,2),
  new_monthly_price DECIMAL(10,2),
  proration_amount DECIMAL(10,2),
  effective_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  INDEX idx_subscription_changes (subscription_id),
  INDEX idx_change_date (effective_date)
);
```

### **Phase 2: Proration Service Layer**

#### 2.1 Create ProrationService Class
```javascript
// api-service/src/services/prorationService.js
class ProrationService {
  /**
   * Calculate prorated amount for subscription changes
   * @param {Object} params - Proration parameters
   * @param {number} params.oldPrice - Current monthly price
   * @param {number} params.newPrice - New monthly price  
   * @param {Date} params.changeDate - When change takes effect
   * @param {Date} params.billingCycleStart - Current billing cycle start
   * @param {Date} params.billingCycleEnd - Current billing cycle end
   * @returns {Object} Proration calculation result
   */
  calculateProration({
    oldPrice,
    newPrice,
    changeDate,
    billingCycleStart,
    billingCycleEnd
  }) {
    const totalCycleDays = this.getDaysBetween(billingCycleStart, billingCycleEnd);
    const remainingDays = this.getDaysBetween(changeDate, billingCycleEnd);
    
    // Calculate unused portion of old plan
    const unusedOldAmount = (oldPrice * remainingDays) / totalCycleDays;
    
    // Calculate prorated new plan amount
    const proratedNewAmount = (newPrice * remainingDays) / totalCycleDays;
    
    // Net proration (positive = charge, negative = credit)
    const prorationAmount = proratedNewAmount - unusedOldAmount;
    
    return {
      prorationAmount: Math.round(prorationAmount * 100) / 100, // Round to cents
      unusedOldAmount,
      proratedNewAmount,
      remainingDays,
      totalCycleDays,
      effectiveDate: changeDate
    };
  }

  /**
   * Calculate prorated amount for new subscription signup
   */
  calculateSignupProration(monthlyPrice, signupDate, billingCycleEnd) {
    const totalCycleDays = this.getDaysInMonth(signupDate);
    const remainingDays = this.getDaysBetween(signupDate, billingCycleEnd);
    
    return {
      prorationAmount: (monthlyPrice * remainingDays) / totalCycleDays,
      remainingDays,
      totalCycleDays,
      fullMonthPrice: monthlyPrice
    };
  }

  /**
   * Calculate addon proration
   */
  calculateAddonProration(addonPrice, addDate, billingCycleEnd, isRemoval = false) {
    const totalCycleDays = this.getDaysInMonth(addDate);
    const remainingDays = this.getDaysBetween(addDate, billingCycleEnd);
    
    const proratedAmount = (addonPrice * remainingDays) / totalCycleDays;
    
    return {
      prorationAmount: isRemoval ? -proratedAmount : proratedAmount,
      remainingDays,
      totalCycleDays,
      fullMonthPrice: addonPrice
    };
  }

  getDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysInMonth(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }
}

module.exports = new ProrationService();
```

### **Phase 3: API Enhancements**

#### 3.1 Enhanced Subscription Creation with Proration
```javascript
// api-service/src/routes/subscriptions/websites.js

/**
 * Create subscription with prorated billing
 * POST /api/subscriptions/websites/signup-prorated
 */
router.post('/signup-prorated', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { 
      plan_name, 
      selected_addons = [], 
      payment_method_id,
      signup_date = new Date() // Allow custom signup date for testing
    } = req.body;

    // Get plan pricing
    const planPricing = getPlanPricing(plan_name);
    
    // Calculate billing cycle (signup date to end of month)
    const billingCycleStart = new Date(signup_date);
    const billingCycleEnd = new Date(billingCycleStart.getFullYear(), billingCycleStart.getMonth() + 1, 0);
    
    // Calculate prorated amounts
    const prorationService = require('../../services/prorationService');
    
    const planProration = prorationService.calculateSignupProration(
      planPricing.basePrice,
      billingCycleStart,
      billingCycleEnd
    );

    let totalProrationAmount = planProration.prorationAmount;
    const addonProrations = [];

    // Calculate addon prorations
    for (const addonId of selected_addons) {
      const addon = await getAddonById(addonId);
      const addonProration = prorationService.calculateAddonProration(
        addon.monthly_price,
        billingCycleStart,
        billingCycleEnd
      );
      addonProrations.push({
        addon_id: addonId,
        ...addonProration
      });
      totalProrationAmount += addonProration.prorationAmount;
    }

    // Create Stripe subscription with prorated amount
    const stripeSubscription = await stripeService.createProratedSubscription({
      customerId: customer.id,
      planName: plan_name,
      basePrice: planPricing.basePrice,
      prorationAmount: totalProrationAmount,
      billingCycleStart,
      billingCycleEnd,
      addons: addonProrations
    });

    // Save to database with proration details
    const [subscriptionResult] = await db.execute(`
      INSERT INTO user_subscriptions (
        user_id, stripe_subscription_id, stripe_customer_id, subscription_type,
        status, plan_name, base_monthly_price, billing_cycle_start, billing_cycle_end,
        current_period_start, current_period_end, proration_enabled
      ) VALUES (?, ?, ?, 'websites', 'active', ?, ?, ?, ?, ?, ?, 1)
    `, [
      userId, stripeSubscription.id, customer.id, plan_name, planPricing.basePrice,
      billingCycleStart, billingCycleEnd, billingCycleStart, billingCycleEnd
    ]);

    // Record initial payment with proration details
    await db.execute(`
      INSERT INTO subscription_payments (
        subscription_id, stripe_invoice_id, amount, prorated_amount,
        proration_days, billing_cycle_days, proration_reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'signup', 'succeeded')
    `, [
      subscriptionResult.insertId,
      stripeSubscription.latest_invoice,
      totalProrationAmount,
      totalProrationAmount,
      planProration.remainingDays,
      planProration.totalCycleDays
    ]);

    res.json({
      success: true,
      subscription_id: subscriptionResult.insertId,
      proration_details: {
        plan_proration: planProration,
        addon_prorations: addonProrations,
        total_amount: totalProrationAmount,
        billing_cycle: {
          start: billingCycleStart,
          end: billingCycleEnd,
          days: planProration.totalCycleDays
        }
      }
    });

  } catch (error) {
    console.error('Error creating prorated subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});
```

#### 3.2 Plan Change with Proration
```javascript
/**
 * Change subscription plan with proration
 * POST /api/subscriptions/websites/change-plan
 */
router.post('/change-plan', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { new_plan_name, change_date = new Date() } = req.body;

    // Get current subscription
    const [currentSub] = await db.execute(`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'websites' AND status = 'active'
    `, [userId]);

    if (currentSub.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = currentSub[0];
    const oldPlanPricing = getPlanPricing(subscription.plan_name);
    const newPlanPricing = getPlanPricing(new_plan_name);

    // Calculate proration
    const prorationResult = prorationService.calculateProration({
      oldPrice: oldPlanPricing.basePrice,
      newPrice: newPlanPricing.basePrice,
      changeDate: new Date(change_date),
      billingCycleStart: subscription.billing_cycle_start,
      billingCycleEnd: subscription.billing_cycle_end
    });

    // Update Stripe subscription
    await stripeService.updateSubscriptionPlan(
      subscription.stripe_subscription_id,
      new_plan_name,
      prorationResult.prorationAmount
    );

    // Update database
    await db.execute(`
      UPDATE user_subscriptions 
      SET plan_name = ?, base_monthly_price = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [new_plan_name, newPlanPricing.basePrice, subscription.id]);

    // Log the change
    await db.execute(`
      INSERT INTO subscription_changes (
        subscription_id, change_type, old_plan_name, new_plan_name,
        old_monthly_price, new_monthly_price, proration_amount, effective_date
      ) VALUES (?, 'plan_change', ?, ?, ?, ?, ?, ?)
    `, [
      subscription.id, subscription.plan_name, new_plan_name,
      oldPlanPricing.basePrice, newPlanPricing.basePrice,
      prorationResult.prorationAmount, change_date
    ]);

    res.json({
      success: true,
      proration_details: prorationResult,
      new_plan: new_plan_name,
      effective_date: change_date
    });

  } catch (error) {
    console.error('Error changing subscription plan:', error);
    res.status(500).json({ error: 'Failed to change plan' });
  }
});
```

### **Phase 4: Frontend Integration**

#### 4.1 Enhanced Pricing Display Component
```javascript
// components/dashboard/my-subscriptions/components/ProratedPricingDisplay.js
export default function ProratedPricingDisplay({ 
  planName, 
  basePrice, 
  addons = [], 
  signupDate = new Date() 
}) {
  const [pricingBreakdown, setPricingBreakdown] = useState(null);

  useEffect(() => {
    calculateProratedPricing();
  }, [planName, basePrice, addons, signupDate]);

  const calculateProratedPricing = () => {
    const billingCycleEnd = new Date(signupDate.getFullYear(), signupDate.getMonth() + 1, 0);
    const daysInMonth = billingCycleEnd.getDate();
    const remainingDays = Math.ceil((billingCycleEnd - signupDate) / (1000 * 60 * 60 * 24));

    const planProration = (basePrice * remainingDays) / daysInMonth;
    
    let addonTotal = 0;
    const addonBreakdown = addons.map(addon => {
      const addonProration = (addon.monthly_price * remainingDays) / daysInMonth;
      addonTotal += addonProration;
      return {
        ...addon,
        prorated_price: addonProration,
        full_price: addon.monthly_price
      };
    });

    setPricingBreakdown({
      plan: {
        name: planName,
        full_price: basePrice,
        prorated_price: planProration
      },
      addons: addonBreakdown,
      totals: {
        full_monthly: basePrice + addons.reduce((sum, addon) => sum + addon.monthly_price, 0),
        prorated_now: planProration + addonTotal,
        days_remaining: remainingDays,
        days_in_cycle: daysInMonth
      }
    });
  };

  if (!pricingBreakdown) return <div>Calculating pricing...</div>;

  return (
    <div className="prorated-pricing-display">
      <div className="pricing-header">
        <h4>Pricing Breakdown</h4>
        <div className="billing-cycle-info">
          <small>
            Billing cycle: {remainingDays} of {daysInMonth} days remaining
          </small>
        </div>
      </div>

      <div className="pricing-breakdown">
        {/* Plan Pricing */}
        <div className="pricing-item">
          <div className="item-name">{pricingBreakdown.plan.name}</div>
          <div className="item-pricing">
            <span className="prorated-price">
              ${pricingBreakdown.plan.prorated_price.toFixed(2)}
            </span>
            <small className="full-price">
              (${pricingBreakdown.plan.full_price.toFixed(2)}/month)
            </small>
          </div>
        </div>

        {/* Addon Pricing */}
        {pricingBreakdown.addons.map(addon => (
          <div key={addon.id} className="pricing-item addon">
            <div className="item-name">{addon.name}</div>
            <div className="item-pricing">
              <span className="prorated-price">
                ${addon.prorated_price.toFixed(2)}
              </span>
              <small className="full-price">
                (${addon.full_price.toFixed(2)}/month)
              </small>
            </div>
          </div>
        ))}

        {/* Total */}
        <div className="pricing-total">
          <div className="total-label">Total Today</div>
          <div className="total-amount">
            ${pricingBreakdown.totals.prorated_now.toFixed(2)}
          </div>
        </div>
        
        <div className="next-billing">
          <small>
            Next billing: ${pricingBreakdown.totals.full_monthly.toFixed(2)} on{' '}
            {new Date(signupDate.getFullYear(), signupDate.getMonth() + 1, 1).toLocaleDateString()}
          </small>
        </div>
      </div>
    </div>
  );
}
```

### **Phase 5: Testing & Validation**

#### 5.1 Unit Tests for Proration Logic
```javascript
// api-service/tests/prorationService.test.js
describe('ProrationService', () => {
  test('calculates correct proration for mid-month signup', () => {
    const result = prorationService.calculateSignupProration(
      30.00, // $30/month plan
      new Date('2024-01-15'), // Signup on 15th
      new Date('2024-01-31')  // Month end
    );
    
    // 17 days remaining in 31-day month = 17/31 * $30 = $16.45
    expect(result.prorationAmount).toBeCloseTo(16.45, 2);
    expect(result.remainingDays).toBe(17);
  });

  test('calculates correct proration for plan upgrade', () => {
    const result = prorationService.calculateProration({
      oldPrice: 20.00,
      newPrice: 40.00,
      changeDate: new Date('2024-01-15'),
      billingCycleStart: new Date('2024-01-01'),
      billingCycleEnd: new Date('2024-01-31')
    });

    // Unused old: (20 * 17) / 31 = $10.97
    // New prorated: (40 * 17) / 31 = $21.94
    // Net charge: $21.94 - $10.97 = $10.97
    expect(result.prorationAmount).toBeCloseTo(10.97, 2);
  });
});
```

#### 5.2 Integration Tests
```javascript
// Test prorated subscription creation
// Test plan changes with proration
// Test addon additions/removals
// Test edge cases (month boundaries, leap years)
```

## 🚀 **Implementation Timeline**

### **Week 1-2: Database & Service Layer**
- [ ] Implement database schema changes
- [ ] Create ProrationService class
- [ ] Unit tests for proration calculations

### **Week 3-4: API Integration**
- [ ] Enhance subscription creation endpoints
- [ ] Implement plan change endpoints
- [ ] Addon management with proration

### **Week 5-6: Frontend Integration**
- [ ] Update pricing display components
- [ ] Implement plan change UI
- [ ] Enhanced subscription management page

### **Week 7-8: Testing & Deployment**
- [ ] Comprehensive testing
- [ ] Edge case validation
- [ ] Production deployment

## 📋 **Success Criteria**

1. **Accurate Proration**: All calculations match expected mathematical results
2. **Stripe Integration**: Seamless integration with Stripe's proration system
3. **User Experience**: Clear pricing displays and smooth upgrade/downgrade flows
4. **Data Integrity**: All proration events properly logged and auditable
5. **Performance**: No significant impact on existing subscription workflows

## 🔧 **Technical Considerations**

### **Edge Cases to Handle**
- Month boundary changes (e.g., Jan 31 → Feb 28)
- Leap year calculations
- Same-day plan changes
- Multiple changes within billing cycle
- Subscription cancellations mid-cycle

### **Stripe Integration Notes**
- Use Stripe's `proration_behavior: 'create_prorations'`
- Handle Stripe invoice line items for proration
- Sync proration amounts with Stripe metadata

### **Performance Optimizations**
- Cache proration calculations for repeated requests
- Batch process multiple addon changes
- Optimize database queries for billing cycle lookups

This implementation plan provides a comprehensive roadmap for adding prorated billing to your subscription system while maintaining compatibility with existing functionality.
