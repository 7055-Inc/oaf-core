# Universal Subscription System

## Overview

This is a **universal, configuration-driven subscription system** that provides a consistent 5-step checklist-like gated entry for all subscription types. All subscriptions follow the same pattern, making it easy to add new types and maintain consistency.

---

## Architecture

```
components/subscriptions/
├── README.md                     # This file
├── ChecklistController.js        # Universal flow orchestrator
├── steps/                        # Reusable step components
│   ├── TierStep.js              # Pricing tier selection
│   ├── TermsStep.js             # Terms acceptance
│   ├── CardStep.js              # Payment method setup
│   └── ApplicationStep.js       # Application form
└── dashboards/                   # Subscription-specific content
    ├── ShippingDashboard.js     # Example: Shipping labels UI
    ├── WebsiteDashboard.js      # (future)
    └── VerifiedDashboard.js     # (future)
```

---

## The 5-Step Universal Flow

Every subscription follows this exact pattern:

### 1. **Tier Selection** 
- User selects pricing tier
- System creates/updates `user_subscriptions` record with `tier` and `tier_price`
- Auto-skips if tier already selected

### 2. **Terms Acceptance**
- System checks if user accepted latest subscription-specific terms
- Displays terms content if not accepted
- Records acceptance in `user_terms_acceptance` table
- Auto-skips if already accepted

### 3. **Card on File**
- System checks if user has valid payment method
- Creates Stripe Setup Intent for card collection
- Saves payment method to Stripe Customer
- Auto-skips if valid card exists

### 4. **Application**
- Displays subscription-specific application form
- Can be auto-approved (info collection) or require manual approval
- Stores application data via subscription-specific endpoint
- Auto-skips if already approved

### 5. **Dashboard Access**
- All gates passed → Show subscription dashboard
- Dashboard content is subscription-specific
- Displays active subscription features and management

---

## How It Works

### ChecklistController (The Orchestrator)

The `ChecklistController` is the brain of the system. It:

1. **Fetches subscription status** via `/api/subscriptions/{type}/my` endpoint
2. **Runs checks** to determine which steps are complete
3. **Renders the appropriate step** based on checklist state
4. **Shows the dashboard** when all steps pass

**Checklist Logic:**
```javascript
// Order matters - steps are checked in sequence
if (!checkState.tier) return <TierStep />;
if (!checkState.terms) return <TermsStep />;
if (!checkState.card) return <CardStep />;
if (!checkState.application) return <ApplicationStep />;

// All checks passed
return <DashboardComponent />;
```

### Configuration-Driven Development

Each subscription type provides a configuration object that defines its behavior:

```javascript
const mySubscriptionConfig = {
  // Display info
  displayName: "My Service Name",
  subtitle: "Short description of service",
  
  // Application behavior
  autoApprove: true,  // or false for manual approval
  
  // Pricing tiers (can be single tier or multiple)
  tiers: [
    {
      name: "Plan Name",
      description: "Plan description",
      price: "$0",  // or number for paid plans
      period: "/month",
      features: ["Feature 1", "Feature 2", ...],
      popular: true,
      buttonText: "Get Started"
    }
  ],
  
  // Application form fields (optional)
  applicationFields: [
    {
      section: "Section Name",
      fields: [
        {
          name: "field_name",
          label: "Field Label",
          type: "text|email|select|textarea",
          required: true,
          options: ["opt1", "opt2"]  // for select fields
        }
      ]
    }
  ],
  
  // Application submission
  applicationEndpoint: 'custom/endpoint/path',
  applicationMethod: 'POST',
  
  // Dashboard component
  dashboardComponent: MyDashboard
};
```

---

## Adding a New Subscription Type

Follow these steps to add a new subscription:

### 1. Backend Setup

#### A. Update Database Schema
```sql
-- Add subscription type to ENUM
ALTER TABLE user_subscriptions 
MODIFY subscription_type ENUM('shipping_labels','websites','verified','marketplace','YOUR_NEW_TYPE');

-- Ensure tier columns exist (already done)
-- tier VARCHAR(100)
-- tier_price DECIMAL(10,2)
```

#### B. Create API Routes File
Create `api-service/src/routes/subscriptions/your-type.js`:

```javascript
const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const verifyToken = require('../../middleware/jwt');

// Required: Get subscription status
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Fetch subscription data
    const [subscription] = await db.query(`
      SELECT 
        id, status, tier, tier_price, 
        stripe_customer_id, 
        application_status
      FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'your_type'
      LIMIT 1
    `, [userId]);
    
    // Check terms acceptance
    const [termsCheck] = await db.query(`
      SELECT ut.version_accepted 
      FROM user_terms_acceptance ut
      WHERE ut.user_id = ? AND ut.subscription_type = 'your_type'
      ORDER BY ut.accepted_at DESC LIMIT 1
    `, [userId]);
    
    // Check card on file
    const [paymentMethods] = await db.query(`
      SELECT pm_id, card_last4 
      FROM user_payment_methods 
      WHERE user_id = ? AND is_default = 1
      LIMIT 1
    `, [userId]);
    
    // Build response
    res.json({
      subscription: {
        id: subscription[0]?.id || null,
        status: subscription[0]?.status || 'inactive',
        tier: subscription[0]?.tier || null,
        tierPrice: subscription[0]?.tier_price || null,
        termsAccepted: termsCheck.length > 0,
        cardLast4: paymentMethods[0]?.card_last4 || null,
        application_status: subscription[0]?.application_status || null
      },
      has_permission: true  // Check actual permission logic
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

// Required: Select tier
router.post('/select-tier', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { subscription_type, tier_name, tier_price } = req.body;
    
    const [existing] = await db.query(`
      SELECT id FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = ?
      LIMIT 1
    `, [userId, subscription_type]);
    
    if (existing.length > 0) {
      await db.query(`
        UPDATE user_subscriptions 
        SET tier = ?, tier_price = ?
        WHERE id = ?
      `, [tier_name, tier_price, existing[0].id]);
      
      return res.json({ success: true, action: 'updated' });
    } else {
      await db.query(`
        INSERT INTO user_subscriptions 
        (user_id, subscription_type, tier, tier_price, status)
        VALUES (?, ?, ?, ?, 'incomplete')
      `, [userId, subscription_type, tier_name, tier_price]);
      
      return res.json({ success: true, action: 'created' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to select tier' });
  }
});

// Required: Terms check
router.get('/terms-check', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get latest terms version for this subscription type
    const [latestTerms] = await db.query(`
      SELECT id, version, title, content 
      FROM terms_versions 
      WHERE subscription_type = 'your_type' AND is_current = 1
      ORDER BY created_at DESC LIMIT 1
    `, []);
    
    if (latestTerms.length === 0) {
      return res.json({ termsAccepted: true });  // No terms required
    }
    
    // Check if user accepted this version
    const [acceptance] = await db.query(`
      SELECT id 
      FROM user_terms_acceptance 
      WHERE user_id = ? 
        AND subscription_type = 'your_type'
        AND version_accepted = ?
      LIMIT 1
    `, [userId, latestTerms[0].version]);
    
    res.json({
      termsAccepted: acceptance.length > 0,
      latestTerms: latestTerms[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to check terms' });
  }
});

// Required: Accept terms
router.post('/terms-accept', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { terms_version_id } = req.body;
    
    const [termsVersion] = await db.query(`
      SELECT version FROM terms_versions WHERE id = ?
    `, [terms_version_id]);
    
    if (termsVersion.length === 0) {
      return res.status(404).json({ success: false, error: 'Terms not found' });
    }
    
    await db.query(`
      INSERT INTO user_terms_acceptance 
      (user_id, terms_version_id, version_accepted, subscription_type)
      VALUES (?, ?, ?, 'your_type')
    `, [userId, terms_version_id, termsVersion[0].version]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to accept terms' });
  }
});

module.exports = router;
```

#### C. Register Routes in server.js
```javascript
app.use('/api/subscriptions/your_type', require('./routes/subscriptions/your-type'));
```

### 2. Frontend Setup

#### A. Create Dashboard Component
Create `components/subscriptions/dashboards/YourTypeDashboard.js`:

```javascript
import React from 'react';

export default function YourTypeDashboard({ subscriptionData, userData, onUpdate }) {
  return (
    <div className="your-type-dashboard">
      <h2>Welcome to Your Subscription!</h2>
      <p>Subscription ID: {subscriptionData?.subscription?.id}</p>
      <p>Current Tier: {subscriptionData?.subscription?.tier}</p>
      
      {/* Add your subscription-specific UI here */}
    </div>
  );
}
```

#### B. Create Subscription Component
Create `components/dashboard/my-subscriptions/components/YourTypeSubscription.js`:

```javascript
import React from 'react';
import ChecklistController from '../../../subscriptions/ChecklistController';
import YourTypeDashboard from '../../../subscriptions/dashboards/YourTypeDashboard';

export default function YourTypeSubscription({ userData }) {
  
  const yourTypeConfig = {
    displayName: "Your Service Name",
    subtitle: "Brief description of your service",
    autoApprove: true,  // or false for manual approval
    dashboardComponent: YourTypeDashboard,
    
    tiers: [
      {
        name: "Your Plan",
        description: "Plan description",
        price: "$19.99",  // or "$0" for free
        period: "/month",
        features: [
          "Feature 1",
          "Feature 2",
          "Feature 3"
        ],
        popular: true,
        buttonText: "Subscribe Now"
      }
    ],
    
    // Optional: If you need an application form
    applicationFields: [
      {
        section: "Your Information",
        fields: [
          {
            name: "business_name",
            label: "Business Name",
            type: "text",
            required: true
          }
        ]
      }
    ],
    applicationEndpoint: 'your-type/submit-application',
    applicationMethod: 'POST'
  };
  
  return (
    <ChecklistController 
      subscriptionType="your_type"
      userData={userData}
      config={yourTypeConfig}
    />
  );
}
```

#### C. Add to Dashboard Menu
In `components/dashboard/my-subscriptions/MySubscriptionsMenu.js`:

```javascript
// Add menu item
<div 
  className="menu-item" 
  onClick={() => handleMenuClick('your-type')}
>
  <div className="menu-icon">🎯</div>
  <div className="menu-text">
    <div className="menu-title">Your Service</div>
    <div className="menu-subtitle">Manage your subscription</div>
  </div>
</div>
```

In `pages/dashboard/index.js`:

```javascript
// Add import
import YourTypeSubscription from '../../components/dashboard/my-subscriptions/components/YourTypeSubscription';

// Add conditional render
{activeView === 'your-type' && (
  <YourTypeSubscription userData={userData} />
)}
```

---

## Example: Shipping Labels Implementation

The Shipping Labels subscription is the **reference implementation** and represents the **simplest pattern**. Key files:

- **Backend**: `api-service/src/routes/subscriptions/shipping.js`
- **Config**: `components/dashboard/my-subscriptions/components/ShippingLabelsSubscription.js`
- **Dashboard**: `components/subscriptions/dashboards/ShippingDashboard.js`

**Why Shipping is the Simplest:**
- ✅ **Auto-approved** - No manual review required
- ✅ **No application table** - Uses existing `vendor_ship_settings` table
- ✅ **Single tier** - Just one pricing option ($0/month pay-as-you-go)
- ✅ **Reuses existing endpoint** - `vendor/shipping-preferences` already existed

**Config Example:**
```javascript
const shippingLabelsConfig = {
  displayName: "Shipping Labels Service",
  subtitle: "Create shipping labels on-demand with no monthly fees",
  autoApprove: true,
  dashboardComponent: ShippingDashboard,
  tiers: [
    {
      name: "Shipping Labels",
      description: "Pay-as-you-go shipping label service. Only pay for the labels you create.",
      price: "$0",
      period: "/month",
      features: [
        "No monthly fees",
        "Pay only for labels created",
        "USPS & UPS support",
        "Automatic tracking",
        // ...
      ],
      popular: true,
      buttonText: "Get Started"
    }
  ],
  applicationFields: [/* shipping preferences form */],
  applicationEndpoint: 'vendor/shipping-preferences',
  applicationMethod: 'POST'
};
```

---

## Database Requirements

### Core Table: `user_subscriptions`

**Actual schema (as of current implementation):**
```sql
CREATE TABLE user_subscriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  subscription_type ENUM('verification','shipping_labels','websites'),  -- Extend as needed
  tier VARCHAR(100),  -- Selected tier name
  tier_price DECIMAL(10,2),  -- Tier price for billing
  status ENUM('active','canceled','past_due','unpaid','trialing','incomplete') DEFAULT 'incomplete',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end TINYINT(1) DEFAULT 0,
  prefer_connect_balance TINYINT(1) DEFAULT 0,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Important Notes:**
- ⚠️ **NO `application_status` column** - Applications are tracked in separate tables (see below)
- ⚠️ **NO `next_billing_date` column yet** - Planned for future billing system
- ✅ `tier` and `tier_price` are the key columns for the new universal system

### Application Tables (For Manual Approval Subscriptions)

**Pattern**: Each subscription type that requires manual approval needs its own applications table.

**Existing Examples:**
- `wholesale_applications` - Wholesale subscription applications
- `marketplace_applications` - Marketplace vendor applications
- `artist_verification_applications` - Verified status applications

**Template for creating application tables:**
```sql
CREATE TABLE {subscription_type}_applications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  
  -- Application-specific fields (customize per subscription)
  business_name VARCHAR(255),
  contact_email VARCHAR(255),
  -- ... other fields ...
  
  -- Standard approval workflow fields
  status ENUM('pending','approved','denied','under_review') DEFAULT 'pending',
  reviewed_by BIGINT,  -- Admin user who reviewed
  review_date TIMESTAMP,
  admin_notes TEXT,
  denial_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

**In your `/my` endpoint**, join to the applications table:
```javascript
// For subscriptions with manual approval
const [subscription] = await db.query(`
  SELECT 
    us.id, us.status, us.tier, us.tier_price,
    app.status as application_status
  FROM user_subscriptions us
  LEFT JOIN {type}_applications app ON us.user_id = app.user_id
  WHERE us.user_id = ? AND us.subscription_type = ?
  ORDER BY app.created_at DESC
  LIMIT 1
`, [userId, subscriptionType]);
```

**Note**: Auto-approved subscriptions (like Shipping Labels) don't need an applications table.

### Terms System

- `terms_versions` - Stores terms content per subscription type
- `user_terms_acceptance` - Tracks user acceptances

### Payment Methods & Card on File

**Important**: Payment methods are **NOT** stored in a local `user_payment_methods` table.

**Actual Implementation:**
- Card data is stored in **Stripe** (PCI compliant)
- `user_subscriptions.stripe_customer_id` links to Stripe Customer
- Card retrieval uses **Stripe API**:

```javascript
// Get card on file from Stripe
const paymentMethods = await stripeService.stripe.paymentMethods.list({
  customer: stripe_customer_id,
  type: 'card',
  limit: 1
});

const cardLast4 = paymentMethods.data[0]?.card.last4;
```

**Stripe Customer Creation:**
- Happens automatically in `CardStep` component
- Uses `/api/payment-methods/create-setup-intent` endpoint
- Creates Stripe Customer if one doesn't exist
- Saves `stripe_customer_id` to `user_subscriptions` table

### Permission Granting

**Pattern**: Auto-grant permissions when subscription is complete.

**In your `/my` endpoint**, add this logic:
```javascript
// Auto-grant permission when all conditions are met
if (hasAcceptedTerms && hasCard && (autoApprove || applicationApproved)) {
  await db.query(`
    INSERT INTO user_permissions (user_id, {permission_name}) 
    VALUES (?, 1) 
    ON DUPLICATE KEY UPDATE {permission_name} = 1
  `, [userId]);
}
```

**Permission columns** in `user_permissions` table:
- `shipping` - For shipping_labels subscription
- `sites` - For websites subscription
- `verified` - For verification subscription
- `marketplace` - For marketplace subscription
- etc.

---

## Step Components (Reusable)

All step components are in `components/subscriptions/steps/`:

### TierStep.js
- Displays pricing tiers
- Handles tier selection
- Calls `/api/subscriptions/{type}/select-tier`

### TermsStep.js
- Fetches latest terms for subscription type
- Displays terms content
- Records acceptance via `/api/subscriptions/{type}/terms-accept`

### CardStep.js
- Checks for valid payment method
- Creates Stripe Setup Intent
- Collects card via Stripe Elements
- Saves to Stripe Customer

### ApplicationStep.js
- Dynamically renders form from `config.applicationFields`
- Submits to `config.applicationEndpoint`
- Handles approval status

---

## Key Principles

1. **Separation of Concerns**
   - Steps are universal and reusable
   - Dashboards are subscription-specific
   - Configuration drives behavior

2. **Progressive Enhancement**
   - Each step checks its own state
   - Auto-skips completed steps
   - Re-fetches status after each step

3. **Consistent Pattern**
   - Same flow for all subscriptions
   - Same API structure
   - Same user experience

4. **Configuration Over Code**
   - Add new subscriptions via config
   - Minimal code changes
   - Easy to maintain

---

## Payment Methods API

Shared payment method endpoints (already implemented):

- `GET /api/users/payment-methods` - Get user's saved cards
- `POST /api/payment-methods/create-setup-intent` - Start card collection
- `POST /api/payment-methods/confirm-setup` - Save card to Stripe

These are used by `CardStep.js` and work for all subscription types.

---

## Special Case: Unified Backend, Split Frontend

### Verified + Marketplace (Single Backend, Two Entry Points)

**Backend Reality:**
- Single `verification` subscription type in `user_subscriptions`
- Single `marketplace_applications` table
- Two tiers determine permissions:
  - **"Verified Artist"** ($50/year) → grants `verified` permission
  - **"Marketplace Seller"** (free) → grants `verified` + `marketplace` permissions

**Frontend Experience:**
- Two separate menu items (Verified Artist, Marketplace Seller)
- Each shows only one tier
- Appears as independent systems to users
- Same 5-step flow, same application form

**Why This Works:**
- Marketplace sellers need verification anyway
- Free marketplace tier (revenue from commissions)
- Paid verification for non-sellers
- Manual admin review for both
- Single approval process, different permission grants

**Implementation:**
- `VerifiedArtistSubscription.js` → Shows annual $50 tier only
- `MarketplaceSellerSubscription.js` → Shows free tier only
- Both use `subscriptionType="verified"` in ChecklistController
- Backend `/my` endpoint checks `tier` to determine which permissions to grant
- Backend uses `subscription_type = 'verification'` in database (note the different spelling!)

**Admin Approval Flow:**
1. User submits application (same form, different tier selected)
2. Admin reviews in admin panel
3. Admin approves/denies by updating `marketplace_applications.marketplace_status` OR `verification_status`
4. On next load, `/my` endpoint checks `application_status === 'approved'`
5. Backend auto-grants permissions based on tier
6. Subscription status set to 'active'

---

## Subscription Complexity Guide

When building a new subscription, determine its complexity level:

### Level 1: Simple (Like Shipping Labels)
- ✅ Auto-approved (no manual review)
- ✅ Single tier
- ✅ Reuses existing data storage
- **Pattern**: Minimal backend work, focus on dashboard UI

### Level 2: Standard (Like Websites - Multiple Tiers)
- ✅ Auto-approved OR simple approval
- ✅ Multiple pricing tiers
- ✅ May need new data tables
- **Pattern**: Follow documented template, create application table if needed

### Level 3: Complex (Like Verification - Manual Review)
- ⚠️ Requires manual approval
- ⚠️ Multiple tiers with different features
- ⚠️ Complex application form
- ⚠️ Admin review workflow required
- **Pattern**: Create application table, build admin review interface

**Start simple, add complexity only as needed!**

---

## Testing Checklist

When adding a new subscription, test:

- [ ] Tier selection creates/updates subscription record
- [ ] Terms acceptance is recorded correctly
- [ ] Card setup saves payment method
- [ ] Application submission works (if applicable)
- [ ] Dashboard displays after all steps complete
- [ ] Refreshing page maintains progress
- [ ] `/my` endpoint returns correct status
- [ ] Auto-skip works for completed steps

---

## Future Enhancements

Planned improvements:

- **Billing System**: Add cron job for monthly/annual billing
- **Failed Payments**: Retry logic and suspension handling
- **Upgrades/Downgrades**: Tier change flow with proration
- **Cancellation**: User-initiated cancellation flow
- **Webhooks**: Stripe webhook handlers for subscription events

---

## Tier-Based Feature Gating

**Important**: Use **single permission + tier levels** instead of multiple permissions.

### ❌ OLD WAY (Don't Do This):
```javascript
// Multiple permissions for different feature levels
if (userData.permissions.includes('manage_sites')) {
  // Can use custom domains
}
if (userData.permissions.includes('professional_sites')) {
  // Can create multiple sites
}
```

### ✅ NEW WAY (Universal Pattern):
```javascript
// Single permission + tier check
const hasSitesAccess = userData.permissions.includes('sites');
const userTier = subscriptionData?.subscription?.tier;

// Feature gating by tier
const canUseCustomDomain = userTier === 'Professional Plan' || 
                          userTier === 'Business Plan' ||
                          userTier === 'Promoter Plan' ||
                          userTier === 'Promoter Business Plan';

const canCreateMultipleSites = userTier === 'Business Plan' ||
                               userTier === 'Promoter Business Plan';

const canAccessPremiumAddons = userTier !== 'Starter Plan';
```

### Benefits:
- ✅ **Single source of truth**: Tier stored in `user_subscriptions.tier`
- ✅ **Cleaner permissions**: Just yes/no access, not feature-level permissions
- ✅ **Flexible upgrades**: Change tier without touching permissions
- ✅ **Addon compatibility**: Addons check `tier_required` vs user's tier
- ✅ **Easier to maintain**: Feature logic in one place, not scattered

### Backend Pattern:
```javascript
// /my endpoint - Always grant single permission
if (subscription && termsAccepted && cardLast4) {
  await db.query(`
    INSERT INTO user_permissions (user_id, sites) 
    VALUES (?, 1) 
    ON DUPLICATE KEY UPDATE sites = 1
  `, [userId]);
}

// Return tier for frontend feature gating
res.json({
  subscription: {
    tier: "Professional Plan",
    tierPrice: 24.95
  }
});
```

---

## Questions?

This system is designed to be simple and consistent. If you're adding a new subscription:

1. **Copy the Shipping Labels implementation** as a template
2. **Customize the config** with your tiers and fields
3. **Build your dashboard component** with your features
4. **Follow the 5-step pattern** exactly as documented
5. **Use tier-based feature gating** instead of multiple permissions

The system handles the rest! 🚀

