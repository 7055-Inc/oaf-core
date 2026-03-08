# Affiliate System - Design Document

## Overview

A comprehensive affiliate program that allows promoters, artists, and community members to earn commissions by driving sales to the platform. Commissions are calculated as a percentage of platform commission (not sale price), with attribution locked at cart-add time.

---

## Core Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Commission Base** | % of platform commission | Adjusts automatically for vendors with custom rates |
| **Default Rate** | 20% of platform commission | Admin adjustable per-affiliate or globally |
| **Attribution Method** | Per-item at cart-add | Survives cookie clears, fair to all affiliates |
| **Attribution Window** | Locked at cart-add | No cookie expiry concerns |
| **Self-Referral** | Allowed | Encourages traffic driving, a sale is a sale |
| **Payout Delay** | 30 days from order | Return/dispute window |
| **Minimum Payout** | None | Good UX, makes users feel valued |
| **Promoter Enrollment** | Automatic | All promoters are affiliates by default |
| **Community Payout** | Site credit | No Stripe Connect for community members |
| **Artist/Promoter Payout** | Stripe Connect | Uses existing account if available |

---

## User Types & Affiliate Behavior

| User Type | Auto-Enrolled | Payout Method | Notes |
|-----------|---------------|---------------|-------|
| **Promoter** | ✅ Yes | Stripe Connect | Existing account reused |
| **Artist** | ❌ Opt-in | Stripe Connect | Existing vendor account reused |
| **Community** | ❌ Opt-in | Site Credit | Credits usable for purchases |
| **Community + Professional** | ❌ Opt-in | Stripe Connect | Has `professional_affiliate` permission |
| **Admin** | N/A | N/A | Can adjust rates, view all data |

### Professional Affiliate Permission

The `professional_affiliate` permission in `user_permissions` allows community members to:
- Receive cash payouts via Stripe Connect instead of site credit
- Set up a Stripe Connect account (normally not available to community)
- Function like artist/promoter affiliates for payout purposes

**Use Case:** Power affiliates, influencers, or marketing partners who are not artists/promoters but need cash payouts.

**Payout Logic:**
```
IF user.user_type = 'community' AND user_permissions.professional_affiliate = 1:
    payout_method = 'stripe'
ELSE IF user.user_type = 'community':
    payout_method = 'site_credit'
ELSE:
    payout_method = 'stripe'
```

---

## Commission Calculation

```
Order Item: $100 product
Vendor Commission Rate: 15% (platform keeps $15)
Affiliate Rate: 20% of platform commission

Platform Commission: $100 × 15% = $15.00
Affiliate Commission: $15.00 × 20% = $3.00
Platform Net: $15.00 - $3.00 = $12.00
Vendor Gets: $100 - $15 = $85.00 (unchanged)
```

**Key Point:** Affiliate commission comes FROM platform's share, never affects vendor payout.

---

## Attribution Flow

### 1. Affiliate Link Click
```
User clicks: brakebee.com/product/123?ref=ABC123
   └── Cookie set: brakebee_affiliate = { code: 'ABC123', timestamp: now }
   └── Session/localStorage also stores for redundancy
```

### 2. Promoter Site Visit
```
User visits: coolartshow.brakebee.com
   └── Subdomain router detects promoter site
   └── Cookie set: brakebee_affiliate = { promoter_site_id: 45, user_id: 123, timestamp: now }
```

### 3. Add to Cart (ATTRIBUTION LOCKED HERE)
```
User clicks "Add to Cart"
   └── Frontend reads current affiliate context (cookie/session)
   └── Cart item created with: { product_id, quantity, affiliate_id, affiliate_source }
   └── Attribution is NOW PERMANENT for this item
```

### 4. User Returns Later (Different Affiliate)
```
User clicks new affiliate link: ?ref=XYZ789
   └── Cookie updated to XYZ789
   └── EXISTING cart items UNCHANGED (still attributed to ABC123)
   └── NEW items added will be attributed to XYZ789
```

### 5. Checkout
```
Cart contains:
   - Item A: affiliate_id = 123 (ABC123)
   - Item B: affiliate_id = 456 (XYZ789)
   - Item C: affiliate_id = NULL (direct visit)

Order created → Each item's affiliate recorded in order_items
```

### 6. Payment Success (Webhook)
```
Stripe webhook: payment_intent.succeeded
   └── For each order_item with affiliate_id:
       └── Calculate: (item.commission_amount × affiliate_rate)
       └── Create affiliate_commissions record
       └── Status: 'pending' (30-day hold)
       └── eligible_date: order_date + 30 days
```

### 7. Payout Processing (Daily Cron)
```
Cron job checks affiliate_commissions where:
   - status = 'pending'
   - eligible_date <= today
   - order.status = 'shipped' (completed)

For each eligible commission:
   - If order still pending/processing → skip (dispute delay)
   - If order cancelled/refunded → mark 'cancelled', skip
   - If order shipped → process payout
```

---

## Refund/Dispute Handling

### Scenario A: Refund BEFORE Payout (within 30 days)
```
Order refunded while commission status = 'pending'
   └── Commission status → 'cancelled'
   └── No money moves
   └── Affiliate sees in dashboard: "Commission cancelled - Order refunded"
```

### Scenario B: Refund AFTER Payout
```
Order refunded after commission was paid out
   └── Create negative affiliate_commissions record (type: 'clawback')
   └── Debit affiliate balance
   └── Future commissions offset the negative balance first
   └── For community: site_credit balance reduced (can go negative)
   └── For Stripe users: next payout reduced, or separate recovery transfer
```

### Scenario C: Order Stuck in Processing
```
At payout time, order.status NOT IN ('shipped', 'cancelled', 'refunded')
   └── Commission stays 'pending'
   └── Affiliate sees: "Payout delayed - Order awaiting fulfillment"
   └── Re-checked daily until order resolves
```

---

## Database Schema

### New Tables

```sql
-- =====================================================
-- AFFILIATE CORE TABLES
-- =====================================================

-- Affiliate accounts (one per user who opts in or is auto-enrolled)
CREATE TABLE affiliates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  affiliate_code VARCHAR(20) NOT NULL UNIQUE,  -- e.g., 'ABC123', auto-generated
  affiliate_type ENUM('promoter', 'artist', 'community') NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 20.00,  -- % of platform commission
  status ENUM('active', 'suspended', 'pending') DEFAULT 'active',
  payout_method ENUM('stripe', 'site_credit') NOT NULL,
  stripe_account_id VARCHAR(255) NULL,         -- NULL for community, copied from vendor_settings
  total_earnings DECIMAL(10,2) DEFAULT 0.00,   -- Lifetime total
  pending_balance DECIMAL(10,2) DEFAULT 0.00,  -- Awaiting payout
  paid_balance DECIMAL(10,2) DEFAULT 0.00,     -- Already paid out
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_affiliate_code (affiliate_code),
  INDEX idx_status (status),
  INDEX idx_user_id (user_id)
);

-- Track referral visits (for analytics, not attribution)
CREATE TABLE affiliate_referrals (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  session_id VARCHAR(255) NULL,                -- For tracking unique visitors
  referred_user_id BIGINT NULL,                -- If they create account
  source_type ENUM('link', 'promoter_site') NOT NULL,
  promoter_site_id BIGINT NULL,                -- If from promoter site
  landing_url VARCHAR(500),
  referrer_url VARCHAR(500),
  user_agent VARCHAR(500),
  ip_hash VARCHAR(64),                         -- Hashed for privacy
  converted BOOLEAN DEFAULT FALSE,             -- Did they purchase?
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  INDEX idx_affiliate_id (affiliate_id),
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
);

-- Commission records per order item
CREATE TABLE affiliate_commissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  order_item_id BIGINT NOT NULL,
  
  -- Financial
  order_item_amount DECIMAL(10,2) NOT NULL,    -- Item price
  platform_commission DECIMAL(10,2) NOT NULL,  -- Platform's cut from this item
  affiliate_rate DECIMAL(5,2) NOT NULL,        -- Rate at time of order (snapshot)
  gross_amount DECIMAL(10,2) NOT NULL,         -- Commission earned (before any deductions)
  net_amount DECIMAL(10,2) NOT NULL,           -- Final payout amount
  
  -- Status tracking
  status ENUM('pending', 'eligible', 'processing', 'paid', 'cancelled', 'clawback') DEFAULT 'pending',
  status_reason VARCHAR(255) NULL,             -- e.g., "Order refunded", "Dispute pending"
  eligible_date DATE NOT NULL,                 -- When 30-day hold ends
  paid_date DATE NULL,
  
  -- Payout linkage
  payout_id BIGINT NULL,                       -- Links to affiliate_payouts batch
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  
  INDEX idx_affiliate_id (affiliate_id),
  INDEX idx_order_id (order_id),
  INDEX idx_status (status),
  INDEX idx_eligible_date (eligible_date),
  INDEX idx_payout_id (payout_id)
);

-- Batched payouts
CREATE TABLE affiliate_payouts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  
  -- Financial
  total_amount DECIMAL(10,2) NOT NULL,
  commission_count INT NOT NULL,               -- How many commissions in this batch
  
  -- Payout details
  payout_method ENUM('stripe', 'site_credit') NOT NULL,
  stripe_transfer_id VARCHAR(255) NULL,        -- For Stripe payouts
  site_credit_transaction_id BIGINT NULL,      -- For site credit payouts
  
  -- Status
  status ENUM('scheduled', 'processing', 'completed', 'failed') DEFAULT 'scheduled',
  failure_reason VARCHAR(500) NULL,
  
  scheduled_for DATETIME NOT NULL,
  processed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  INDEX idx_affiliate_id (affiliate_id),
  INDEX idx_status (status),
  INDEX idx_scheduled_for (scheduled_for)
);

-- =====================================================
-- SITE CREDIT TABLES (Gift Card Prep)
-- =====================================================

-- User credit balances
CREATE TABLE user_credits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  lifetime_earned DECIMAL(10,2) DEFAULT 0.00,  -- Total ever credited
  lifetime_spent DECIMAL(10,2) DEFAULT 0.00,   -- Total ever used
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Credit transaction ledger
CREATE TABLE user_credit_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  
  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,               -- Positive = credit, Negative = debit
  balance_after DECIMAL(10,2) NOT NULL,        -- Running balance
  transaction_type ENUM(
    'affiliate_commission',                     -- Earned from affiliate program
    'affiliate_clawback',                       -- Deducted due to refund
    'purchase',                                 -- Used for purchase
    'gift_card_load',                           -- Future: gift card redemption
    'admin_adjustment',                         -- Manual adjustment
    'refund_credit'                             -- Refund issued as credit
  ) NOT NULL,
  
  -- Reference to source
  reference_type VARCHAR(50) NULL,             -- 'affiliate_commission', 'order', 'gift_card', etc.
  reference_id BIGINT NULL,                    -- ID in reference table
  
  description VARCHAR(255),
  created_by BIGINT NULL,                      -- User who initiated (for admin adjustments)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created_at (created_at)
);

-- =====================================================
-- ADMIN SETTINGS
-- =====================================================

-- Global affiliate settings (single row table)
CREATE TABLE affiliate_settings (
  id INT PRIMARY KEY DEFAULT 1,
  default_commission_rate DECIMAL(5,2) DEFAULT 20.00,  -- % of platform commission
  payout_delay_days INT DEFAULT 30,
  min_payout_amount DECIMAL(10,2) DEFAULT 0.00,        -- Set to 0 per requirements
  auto_enroll_promoters BOOLEAN DEFAULT TRUE,
  auto_enroll_artists BOOLEAN DEFAULT FALSE,
  auto_enroll_community BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by BIGINT NULL,
  
  CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize default settings
INSERT INTO affiliate_settings (id) VALUES (1);
```

### Modified Tables

```sql
-- Add affiliate tracking to order_items
ALTER TABLE order_items ADD COLUMN affiliate_id BIGINT NULL;
ALTER TABLE order_items ADD COLUMN affiliate_source ENUM('link', 'promoter_site', 'direct') DEFAULT 'direct';
ALTER TABLE order_items ADD INDEX idx_order_items_affiliate_id (affiliate_id);
-- Note: FK added after affiliates table exists

-- Add affiliate tracking to cart_items
ALTER TABLE cart_items ADD COLUMN affiliate_id BIGINT NULL;
ALTER TABLE cart_items ADD COLUMN affiliate_source ENUM('link', 'promoter_site', 'direct') DEFAULT 'direct';
ALTER TABLE cart_items ADD INDEX idx_cart_items_affiliate_id (affiliate_id);
-- Note: FK added after affiliates table exists

-- Add professional_affiliate permission for community cash payouts
ALTER TABLE user_permissions ADD COLUMN professional_affiliate TINYINT(1) DEFAULT 0;
```

---

## API Endpoints

> **Note:** All affiliate routes are under `/api/affiliates` including admin endpoints.

### Public Endpoints

```
GET  /api/affiliates/resolve/:code        - Resolve affiliate code to ID (for frontend attribution)
GET  /api/affiliates/resolve-site/:siteId - Resolve promoter site to affiliate ID
POST /api/affiliates/track-visit          - Record referral visit (analytics)
```

### Authenticated Endpoints

```
GET  /api/affiliates/me                - Get current user's affiliate account
POST /api/affiliates/enroll            - Enroll as affiliate (artists/community)
GET  /api/affiliates/stats             - Dashboard stats (earnings, clicks, conversions)
GET  /api/affiliates/commissions       - List commission history (supports ?status=, ?page=, ?limit=)
GET  /api/affiliates/payouts           - List payout history (supports ?page=, ?limit=)
GET  /api/affiliates/links             - Get shareable affiliate links
```

### Admin Endpoints

```
GET    /api/affiliates/admin/settings     - Get global affiliate settings
PATCH  /api/affiliates/admin/settings     - Update global settings (rate, delay, auto-enroll flags)
GET    /api/affiliates/admin/list         - List all affiliates (supports ?status=, ?type=, ?search=)
GET    /api/affiliates/admin/:id          - Get affiliate details with commission summary
PATCH  /api/affiliates/admin/:id          - Update affiliate (commission_rate, status)
GET    /api/affiliates/admin/report       - Program-wide statistics (supports ?period=YYYY-MM)
```

---

## Frontend Components

### Dashboard Structure

```
components/dashboard/
└── affiliates/
    ├── AffiliatesMenu.js              # Menu section for affiliates
    └── components/
        ├── AffiliateOverview.js       # Summary: earnings, pending, clicks
        ├── AffiliateLinks.js          # Generate/copy referral links
        ├── AffiliateCommissions.js    # Transaction history table
        ├── AffiliatePayouts.js        # Payout history table
        └── AffiliateEnroll.js         # Enrollment form (artists/community)
```

### Admin Components

```
components/dashboard/admin/components/
└── AffiliateAdmin.js                  # Admin panel for affiliate management
    ├── Global settings adjustment
    ├── Per-affiliate rate adjustment
    ├── Affiliate list with search/filter
    └── Manual payout trigger
```

### Cart Integration

```javascript
// When adding to cart, capture affiliate context
const addToCart = (product, quantity) => {
  const affiliateContext = getAffiliateContext(); // Read from cookie/session
  
  cartItems.push({
    product_id: product.id,
    quantity,
    affiliate_id: affiliateContext?.affiliate_id || null,
    affiliate_source: affiliateContext?.source || 'direct'
  });
};
```

### Affiliate Context Hook

```javascript
// hooks/useAffiliateContext.js
const useAffiliateContext = () => {
  // Read from URL params on mount
  // Store in cookie + localStorage
  // Provide current context for cart operations
};
```

---

## Cron Jobs

### 1. Process Affiliate Payouts
**File:** `api-service/cron/process-affiliate-payouts.js`
**Schedule:** Daily at 2:00 AM

```javascript
// Pseudocode
async function processAffiliatePayouts() {
  // 1. Find eligible commissions
  const eligible = await db.query(`
    SELECT ac.*, a.payout_method, a.stripe_account_id, o.status as order_status
    FROM affiliate_commissions ac
    JOIN affiliates a ON ac.affiliate_id = a.id
    JOIN orders o ON ac.order_id = o.id
    WHERE ac.status = 'pending'
      AND ac.eligible_date <= CURDATE()
  `);
  
  for (const commission of eligible) {
    // 2. Check order status
    if (commission.order_status === 'cancelled' || commission.order_status === 'refunded') {
      await markCommissionCancelled(commission.id, 'Order was refunded');
      continue;
    }
    
    if (commission.order_status !== 'shipped') {
      await updateCommissionReason(commission.id, 'Order awaiting fulfillment');
      continue; // Skip, re-check tomorrow
    }
    
    // 3. Process payout based on method
    if (commission.payout_method === 'stripe') {
      await processStripePayou(commission);
    } else {
      await processSiteCreditPayout(commission);
    }
  }
}
```

### 2. Auto-Enroll Promoters
**File:** `api-service/cron/auto-enroll-promoter-affiliates.js`
**Schedule:** Hourly

```javascript
// Find promoters without affiliate accounts and create them
```

---

## Email Templates

### 1. Commission Earned
**Template Key:** `affiliate_commission_earned`
**Trigger:** On payment success (after commission record created)

```
Subject: You earned a commission! 🎉

Hi {first_name},

Great news! You just earned ${commission_amount} from a sale.

Commission Details:
• Sale Date: {order_date}
• Your Rate: {affiliate_rate}%
• Commission: ${commission_amount}

This commission will be eligible for payout on {eligible_date} (30-day hold for returns).

View all your earnings: {dashboard_link}

Keep sharing and earning!
```

### 2. Payout Processed
**Template Key:** `affiliate_payout_processed`
**Trigger:** After successful payout

```
Subject: Your affiliate payout is on the way! 💰

Hi {first_name},

We've processed your affiliate payout.

Payout Details:
• Amount: ${payout_amount}
• Commissions Included: {commission_count}
• Method: {Stripe Transfer / Site Credit}

{For Stripe: Funds will arrive in 2-3 business days.}
{For Site Credit: Your balance is now ${new_balance}. Use it on your next purchase!}

View your payout history: {dashboard_link}
```

### 3. Commission Cancelled
**Template Key:** `affiliate_commission_cancelled`
**Trigger:** When order is refunded before payout

```
Subject: Commission update for order #{order_id}

Hi {first_name},

A commission you earned has been cancelled because the associated order was refunded.

Details:
• Original Commission: ${commission_amount}
• Reason: {Order refunded by customer}

This doesn't affect any other commissions you've earned.

Questions? Contact support.
```

---

## Build Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Database migration (all tables) - **COMPLETE 2026-01-16**
- [x] Affiliate routes (`api-service/src/routes/affiliates.js`) - **COMPLETE 2026-01-16**
- [x] Admin settings endpoints (GET/PATCH /api/affiliates/admin/settings)
- [x] Auto-enroll cron job (`api-service/cron/auto-enroll-promoter-affiliates.js`)
- [x] Basic affiliate CRUD endpoints
- [x] Route registered in server.js

**API Endpoints Created:**
- `GET /api/affiliates/resolve/:code` - Public: resolve affiliate code
- `GET /api/affiliates/resolve-site/:siteId` - Public: resolve promoter site
- `GET /api/affiliates/me` - Get user's affiliate account
- `POST /api/affiliates/enroll` - Enroll as affiliate
- `GET /api/affiliates/stats` - Dashboard stats
- `GET /api/affiliates/commissions` - Commission history
- `GET /api/affiliates/payouts` - Payout history
- `GET /api/affiliates/links` - Get shareable links
- `POST /api/affiliates/track-visit` - Track referral visit
- `GET /api/affiliates/admin/settings` - Admin: get settings
- `PATCH /api/affiliates/admin/settings` - Admin: update settings
- `GET /api/affiliates/admin/list` - Admin: list all affiliates
- `GET /api/affiliates/admin/:id` - Admin: affiliate details
- `PATCH /api/affiliates/admin/:id` - Admin: update affiliate
- `GET /api/affiliates/admin/report` - Admin: program report

**Cron Job Setup (add to crontab):**
```bash
# Auto-enroll promoter affiliates (hourly)
0 * * * * cd /var/www/main/api-service && /usr/bin/node cron/auto-enroll-promoter-affiliates.js >> /var/www/main/logs/affiliate-enroll.log 2>&1

# Process affiliate payouts (daily at 2:00 AM)
0 2 * * * cd /var/www/main/api-service && /usr/bin/node cron/process-affiliate-payouts.js >> /var/www/main/logs/affiliate-payouts.log 2>&1
```

**Initial Test Run:** 18 existing promoters auto-enrolled successfully (see Initial Data section below).

### Phase 2: Tracking ✅ COMPLETE
- [x] Affiliate context hook (frontend) - `hooks/useAffiliateContext.js`
- [x] URL param detection (`?ref=CODE`)
- [x] Promoter site detection (subdomain router)
- [x] localStorage storage with persistence
- [x] Cart integration (affiliate_id on items)
- [x] Checkout: persist affiliate_id to order_items

### Phase 3: Commission Recording ✅ COMPLETE
- [x] Stripe webhook enhancement (`charge.refunded` handler added)
- [x] Commission calculation on payment success (`affiliateCommissionService`)
- [x] affiliate_commissions record creation (with 30-day hold)
- [x] Referral conversion tracking (marks referrals as converted)

### Phase 4: Payouts ✅ COMPLETE
- [x] Payout eligibility checking (order must be 'shipped')
- [x] Stripe transfer integration (`stripe.transfers.create`)
- [x] Site credit integration (`user_credits` + ledger)
- [x] Refund/clawback handling (Phase 3)
- [x] Cron job: `process-affiliate-payouts.js`

### Phase 5: Dashboard ✅ COMPLETE
- [x] AffiliatesMenu.js - Sidebar menu with enrollment detection
- [x] AffiliateOverview.js - Stats, earnings summary, code display
- [x] AffiliateLinks.js - Link generator with copy functionality
- [x] AffiliateCommissions.js - Commission history with filtering/pagination
- [x] AffiliatePayouts.js - Payout history and status
- [x] AffiliateEnroll.js - Enrollment flow for artists/community

### Phase 6: Polish ✅ COMPLETE
- [x] Admin: AffiliateAdmin.js - Admin panel for managing affiliates and global settings
- [x] Admin menu integration in AdminMenu.js
- [x] Dashboard index slide-in registration
- [x] Email templates (3):
  - `affiliate_commission_earned` - Sent when affiliate earns commission
  - `affiliate_payout_processed` - Sent when payout is processed
  - `affiliate_commission_cancelled` - Sent when commission is cancelled (refund)
- [x] Email migration script: `api-service/migrations/add-affiliate-email-templates.js`
- [x] Cancellation notification in affiliateCommissionService.js

---

## Testing Checklist

### Attribution
- [ ] Direct visit (no affiliate) → no commission
- [ ] Affiliate link click → commission recorded
- [ ] Promoter site visit → commission recorded
- [ ] Multi-affiliate cart → each item attributed correctly
- [ ] Affiliate link, clear cookies, return direct → items still attributed

### Commission Calculation
- [ ] Standard vendor (15% platform) → correct affiliate amount
- [ ] Low-commission vendor (5% platform) → affiliate still gets 20% of that 5%
- [ ] Custom affiliate rate → uses custom rate

### Payouts
- [ ] Order shipped before 30 days → payout on day 30
- [ ] Order shipped after 30 days → payout immediately after shipped
- [ ] Order refunded before payout → commission cancelled
- [ ] Order refunded after payout → clawback record created
- [ ] Community member → site credit, not Stripe
- [ ] Artist/Promoter → Stripe transfer

### Edge Cases
- [ ] Self-referral → commission earned
- [ ] Affiliate with negative balance → offset from new earnings
- [ ] Very small commission ($0.50) → still pays out
- [ ] Multiple items, mixed affiliates → each pays correctly

---

## Security Considerations

1. **Affiliate Code Generation**: Use cryptographically random codes, not sequential
2. **Rate Abuse**: Rate-limit affiliate code resolution API
3. **Self-Click Fraud**: Track IP hashes, flag suspicious patterns (analytics only, not blocking)
4. **Cookie Tampering**: Validate affiliate_id exists in DB before recording
5. **Commission Manipulation**: Calculate commission server-side, never trust frontend amounts

---

## Future Enhancements (Out of Scope)

- [ ] Tiered commission rates (more sales = higher rate)
- [ ] Affiliate leaderboards
- [ ] Custom landing pages per affiliate
- [ ] Sub-affiliates (affiliate recruits affiliate)
- [ ] Gift card system integration
- [ ] Affiliate fraud detection ML

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Commission base | % of platform commission |
| Default rate | 20% |
| Attribution method | Per-item at cart-add |
| Cookie duration | N/A (attribution locked at cart-add) |
| Last-click vs first-click | Per-item (each item keeps its affiliate) |
| Self-referral | Allowed |
| Payout delay | 30 days |
| Minimum payout | None ($0) |
| Promoter enrollment | Automatic |
| Community payout | Site credit (unless `professional_affiliate` permission) |
| Professional affiliates | Community members with `professional_affiliate` permission get Stripe cash payouts |

---

## Database Verification (2026-01-16)

### Existing Tables Confirmed ✅

| Table | Status | Key Fields for Affiliate System |
|-------|--------|--------------------------------|
| `orders` | ✅ Exists | `status` enum: pending, processing, paid, accepted, shipped, cancelled, refunded |
| `order_items` | ✅ Exists | order_id, product_id, vendor_id, commission_rate, commission_amount |
| `cart_items` | ✅ Exists | cart_id, product_id, vendor_id, quantity, price |
| `carts` | ✅ Exists | user_id, guest_token, source_site_api_key, source_site_name |
| `users` | ✅ Exists | user_type enum: artist, promoter, community, admin, Draft, wholesale |
| `user_permissions` | ✅ Exists | Various boolean flags (vendor, stripe_connect, etc.) |
| `vendor_settings` | ✅ Exists | stripe_account_id, commission_rate (per-vendor) |
| `sites` | ✅ Exists | For promoter site attribution |

### Columns to Add

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `cart_items` | `affiliate_id` | BIGINT NULL | Track affiliate at cart-add |
| `cart_items` | `affiliate_source` | ENUM | 'link', 'promoter_site', 'direct' |
| `order_items` | `affiliate_id` | BIGINT NULL | Persist affiliate from cart |
| `order_items` | `affiliate_source` | ENUM | Persist source from cart |
| `user_permissions` | `professional_affiliate` | TINYINT(1) | Enables cash payouts for community |

### New Tables Required

- `affiliates` - Core affiliate accounts
- `affiliate_referrals` - Visit tracking (analytics)
- `affiliate_commissions` - Per-item commission records
- `affiliate_payouts` - Batched payout records
- `affiliate_settings` - Global admin settings
- `user_credits` - Site credit balances
- `user_credit_transactions` - Credit ledger

### No Conflicts Found
- No existing `affiliate*` tables
- No existing `user_credit*` tables

---

## Schema Changes Log

| Date | Change | Status |
|------|--------|--------|
| 2026-01-16 | Created `affiliates` table | ✅ Complete |
| 2026-01-16 | Created `affiliate_referrals` table | ✅ Complete |
| 2026-01-16 | Created `affiliate_commissions` table | ✅ Complete |
| 2026-01-16 | Created `affiliate_payouts` table | ✅ Complete |
| 2026-01-16 | Created `affiliate_settings` table (initialized with defaults) | ✅ Complete |
| 2026-01-16 | Created `user_credits` table | ✅ Complete |
| 2026-01-16 | Created `user_credit_transactions` table | ✅ Complete |
| 2026-01-16 | Added `affiliate_id`, `affiliate_source` to `cart_items` (with FK) | ✅ Complete |
| 2026-01-16 | Added `affiliate_id`, `affiliate_source` to `order_items` (with FK) | ✅ Complete |
| 2026-01-16 | Added `professional_affiliate` to `user_permissions` | ✅ Complete |

### Default Settings Applied
```
default_commission_rate: 20.00 (% of platform commission)
payout_delay_days: 30
min_payout_amount: 0.00
auto_enroll_promoters: TRUE
auto_enroll_artists: FALSE
auto_enroll_community: FALSE
```

---

## API Implementation Log

| Date | File | Description |
|------|------|-------------|
| 2026-01-16 | `api-service/src/routes/affiliates.js` | Full affiliate API routes (800+ lines) |
| 2026-01-16 | `api-service/src/server.js` | Registered affiliates route |
| 2026-01-16 | `api-service/cron/auto-enroll-promoter-affiliates.js` | Hourly promoter enrollment |
| 2026-01-16 | `migrations/affiliate_system_schema.sql` | Full migration script for reference |
| 2026-01-16 | `hooks/useAffiliateContext.js` | Frontend affiliate tracking hook |
| 2026-01-16 | `api-service/src/routes/carts.js` | Updated to accept affiliate_id |
| 2026-01-16 | `api-service/src/routes/checkout.js` | Updated to persist affiliate to order_items |
| 2026-01-16 | `api-service/src/routes/sites.js` | Added user_type and is_promoter_site to resolve |
| 2026-01-16 | `middleware/subdomainRouter.js` | Added siteId/isPromoterSite params |
| 2026-01-16 | `pages/products/[id].js` | Integrated affiliate tracking |
| 2026-01-16 | `pages/artist-storefront/*.js` | Integrated affiliate tracking |
| 2026-01-16 | `api-service/src/services/affiliateCommissionService.js` | Commission recording service |
| 2026-01-16 | `api-service/src/routes/webhooks/stripe.js` | Commission recording on payment + refund handler |
| 2026-01-16 | `api-service/cron/process-affiliate-payouts.js` | Daily payout processing cron job |
| 2026-01-16 | `components/dashboard/affiliates/AffiliatesMenu.js` | Dashboard sidebar menu |
| 2026-01-16 | `components/dashboard/affiliates/components/*.js` | All 5 dashboard components |
| 2026-01-16 | `pages/dashboard/index.js` | Integrated affiliate menu + slide-ins |
| 2026-01-16 | `components/dashboard/admin/components/AffiliateAdmin.js` | Admin panel for managing affiliates |
| 2026-01-16 | `components/dashboard/admin/AdminMenu.js` | Added Affiliate Management menu item |
| 2026-01-16 | `api-service/migrations/add-affiliate-email-templates.js` | Email template migration (3 templates) |
| 2026-01-16 | `api-service/src/services/affiliateCommissionService.js` | Added cancellation notification |

---

## Initial Data

### Auto-Enrolled Affiliates (2026-01-16)

First run of `auto-enroll-promoter-affiliates.js` enrolled **18 existing promoters**:

| Username | Affiliate Code |
|----------|---------------|
| cvermillion12@cox.net | 18BE6F1B |
| silvija@mosaicartsinc.org | B172B878 |
| info@thunderbirdartists.com | 89791235 |
| mark@integrityshows.com | D15FF039 |
| beauxartsfair@gmail.com | 52810E47 |
| artinthepark@lakesart.org | 4DAC8432 |
| events@koizencellars.com | 1A705FD9 |
| hpifestivals@cox.net | A9DC90C2 |
| artburst@octulipfestival.com | DB7502E9 |
| kevinsartattack@gmail.com | BA99B909 |
| hannah@fhchamber.com | 581E12FE |
| wendy@bchnv.org | 784AEC1A |
| mckinzie@twgpr.com | FD32FAEA |
| info@amdurproductions.com | 03694DD7 |
| coartshows@gmail.com | 093CC62D |
| mwinton@vgagroup.com | 1DE56323 |
| springgreenartfair@gmail.com | DF344ABD |
| benjamin+1103@onlineartfestival.com | 2EBDC234 |

All enrolled with:
- `affiliate_type`: promoter
- `commission_rate`: 20.00%
- `payout_method`: stripe
- `status`: active

---

---

## Phase 2: Frontend Tracking - Complete ✅

### Components Created

**1. useAffiliateContext Hook** (`hooks/useAffiliateContext.js`)
- `AffiliateProvider` component for wrapping app
- `useAffiliateContext` hook for accessing affiliate data
- `getStoredAffiliateData()` utility for non-React contexts
- Features:
  - Detects `?ref=` URL parameters
  - Resolves promoter sites via API
  - Stores affiliate data in localStorage
  - Tracks visits for analytics
  - Cleans URL after capturing ref param

**2. Cart API Updates** (`api-service/src/routes/carts.js`)
- Both cart item endpoints now accept:
  - `affiliate_id` (nullable)
  - `affiliate_source` ('link', 'promoter_site', 'direct')
- Attribution is locked at cart-add time (first attribution wins)

**3. Checkout Flow** (`api-service/src/routes/checkout.js`)
- `getCartItemsWithDetails()` preserves affiliate data
- `createOrder()` inserts affiliate_id/source into order_items
- Attribution flows: cart_items → order_items

**4. Subdomain Router** (`middleware/subdomainRouter.js`)
- Now passes `siteId` and `isPromoterSite` to storefront pages
- Enables automatic affiliate context setup for promoter sites

**5. Sites API** (`api-service/src/routes/sites.js`)
- `/resolve/:subdomain` now includes:
  - `user_type` (to identify promoters)
  - `is_promoter_site` (boolean flag)

**6. Product Pages Updated**
- `pages/products/[id].js` - Main site product pages
- `pages/artist-storefront/index.js` - Storefront homepage
- `pages/artist-storefront/products.js` - Storefront product grid
- `pages/artist-storefront/product.js` - Storefront product detail

All add-to-cart actions now include affiliate attribution via `getStoredAffiliateData()`.

### Data Flow

```
User visits via affiliate link (?ref=CODE)
        ↓
useAffiliateContext resolves code → affiliate_id
        ↓
Store in localStorage
        ↓
User adds item to cart
        ↓
getStoredAffiliateData() retrieves affiliate_id
        ↓
Cart API stores affiliate_id + affiliate_source on cart_items
        ↓
User completes checkout
        ↓
Checkout copies affiliate_id to order_items
        ↓
Webhook processes payment → creates affiliate_commissions
```

---

---

## Phase 3: Commission Recording - Complete ✅

### Service Created

**affiliateCommissionService.js** (`api-service/src/services/affiliateCommissionService.js`)

Core functions:
- `recordAffiliateCommissions(orderId, paymentIntentId)` - Called on payment success
- `handleOrderRefund(orderId, itemIds)` - Called on refunds for cancellation/clawback
- `getAffiliateStats(affiliateId)` - Get commission statistics
- `sendCommissionNotification(commission, orderId)` - Queue email notification

### Webhook Integration

**handleEcommercePayment** now includes affiliate commission recording:
```javascript
// After platform commission is recorded...
const affiliateResult = await affiliateCommissionService.recordAffiliateCommissions(orderId, paymentIntentId);
```

**handleChargeRefunded** (NEW) handles affiliate clawbacks:
- Cancels pending commissions (not yet paid)
- Creates clawback records for paid commissions
- Updates affiliate balances appropriately
- Handles site credit deductions for community affiliates

### Commission Flow

```
Payment Success (payment_intent.succeeded)
        ↓
handleEcommercePayment() called
        ↓
recordAffiliateCommissions(orderId) called
        ↓
For each order_item with affiliate_id:
  - Calculate: platform_commission × affiliate_rate / 100
  - Create affiliate_commissions record (status: 'pending')
  - Set eligible_date = order_date + 30 days
  - Update affiliate.pending_balance += commission
  - Update affiliate.total_earnings += commission
        ↓
Queue email notification (affiliate_commission_earned)
```

### Refund Flow

```
Refund Processed (charge.refunded)
        ↓
handleChargeRefunded() called
        ↓
handleOrderRefund(orderId) called
        ↓
For each affiliate_commission on the order:
  IF status = 'pending' or 'eligible':
    - Set status = 'cancelled'
    - Reduce pending_balance and total_earnings
  ELSE IF status = 'paid':
    - Set status = 'clawback'
    - Create negative clawback commission
    - Reduce paid_balance
    - For site_credit users: deduct from user_credits
```

### Key Design Decisions

1. **Non-blocking**: Affiliate commission errors don't fail the order
2. **30-day hold**: All commissions start as 'pending' with eligible_date
3. **Atomic updates**: Uses transactions for balance modifications
4. **Clawback support**: Handles post-payout refunds with negative records
5. **Email notifications**: Queued via existing email service

---

---

## Phase 4: Payout Processing - Complete ✅

### Cron Job Created

**process-affiliate-payouts.js** (`api-service/cron/process-affiliate-payouts.js`)

**Schedule:** Daily at 2:00 AM
```bash
# Add to crontab
0 2 * * * cd /var/www/main/api-service && /usr/bin/node cron/process-affiliate-payouts.js >> /var/www/main/logs/affiliate-payouts.log 2>&1
```

### Eligibility Criteria

A commission is eligible for payout when:
1. `status = 'pending'`
2. `eligible_date <= today` (30+ days since order)
3. `order.status = 'shipped'` (completed)
4. `affiliate.status = 'active'`

### Payout Methods

**Stripe Transfer** (artists/promoters):
```javascript
const transfer = await stripe.transfers.create({
  amount: Math.round(totalAmount * 100),
  currency: 'usd',
  destination: stripe_account_id,
  description: `Affiliate commission payout`,
  metadata: { affiliate_id, payout_id, commission_count }
});
```

**Site Credit** (community members):
- Creates/updates `user_credits` record
- Records transaction in `user_credit_transactions` ledger
- Updates `lifetime_earned` tracking

### Processing Flow

```
Daily Cron at 2:00 AM
        ↓
Find eligible commissions (pending + eligible_date + shipped)
        ↓
Group by affiliate
        ↓
For each affiliate:
  Check order status:
    - If not shipped → skip, update status_reason
    - If cancelled/refunded → cancel commission
    - If shipped → process payout
        ↓
  IF payout_method = 'stripe':
    - Create affiliate_payouts record
    - Create Stripe transfer
    - Update payout with transfer_id
  ELSE (site_credit):
    - Create affiliate_payouts record
    - Update user_credits balance
    - Create user_credit_transactions record
        ↓
  Update commissions: status='paid', paid_date, payout_id
  Update affiliate: pending_balance ↓, paid_balance ↑
        ↓
  Send payout notification email
```

### Error Handling

- Failed Stripe transfers: Payout marked 'failed' with reason
- Commission status_reason updated for debugging
- Errors don't stop other affiliates from processing
- Email notifications are non-blocking

### Email Notification

Template: `affiliate_payout_processed`
- Payout amount
- Commission count
- Payment method specific message
- Updated balance (for site credit)
- Dashboard link

---

---

## Phase 5: Dashboard Components - Complete ✅

### Components Created

```
components/dashboard/affiliates/
├── AffiliatesMenu.js              # Sidebar menu
└── components/
    ├── AffiliateOverview.js       # Stats dashboard
    ├── AffiliateLinks.js          # Link generator
    ├── AffiliateCommissions.js    # Commission history
    ├── AffiliatePayouts.js        # Payout history
    └── AffiliateEnroll.js         # Enrollment form
```

### Features

**AffiliatesMenu.js**
- Auto-detects enrollment status via `/api/affiliates/me`
- Shows enrollment option for non-enrolled users
- Shows full menu for enrolled affiliates
- Displays pending balance badge

**AffiliateOverview.js**
- Affiliate code with copy button
- Total earned, pending, paid balances
- Commission rate display
- Performance stats (clicks, visitors, conversions)
- Payout method info

**AffiliateLinks.js**
- Affiliate code display with copy
- Pre-built links (homepage, shop, events)
- Custom link builder instructions
- Tips for success section
- Attribution explanation

**AffiliateCommissions.js**
- Summary cards with totals
- Filter tabs (all, pending, paid, cancelled)
- Paginated data table
- Status badges with colors
- Negative amounts for clawbacks

**AffiliatePayouts.js**
- Paid/pending balance summary
- Payout method indicator
- Paginated payout history table
- Status tracking
- Payout schedule explanation

**AffiliateEnroll.js**
- Benefits showcase
- How it works steps
- Payout method info based on user type
- One-click enrollment
- Success state with affiliate code

### Dashboard Integration

Added to `pages/dashboard/index.js`:
- Imported all 6 components
- Added 'affiliates' to collapsedSections
- Added AffiliatesMenu to sidebar (after My Subscriptions)
- Added 5 slide-in handlers for content components

---

*Document created: 2026-01-16*
*Last updated: 2026-01-16 (Phase 5 Complete)*
