# Gift Card & Site Credit System - Design Document

## Overview

A comprehensive site credit and gift card system that allows:
- Community affiliate payouts via site credit
- Admin-issued credits for returns, disputes, promotions
- Gift card purchases and redemption
- Credit balance application at checkout

**Key Principle:** Site credits function identically to cash for commission calculations. Vendor/platform splits remain unchanged regardless of payment method.

---

## Current State (Pre-Build)

### Existing Tables ✅

**gift_cards** (created 2026-01-17)
```sql
id                  BIGINT PRIMARY KEY AUTO_INCREMENT
code                VARCHAR(20) NOT NULL UNIQUE      -- Redemption code
original_amount     DECIMAL(10,2) NOT NULL           -- Initial value
current_balance     DECIMAL(10,2) NOT NULL           -- Remaining balance
status              ENUM('active','redeemed','expired','cancelled')
issued_by           BIGINT                           -- Admin who issued
issued_to_user_id   BIGINT                           -- Recipient user
issued_to_email     VARCHAR(255)                     -- Recipient email
sender_user_id      BIGINT                           -- Purchaser/sender
sender_name         VARCHAR(255)                     -- "From" name
recipient_name      VARCHAR(255)                     -- "To" name
personal_message    TEXT                             -- Gift message
redeemed_by         BIGINT                           -- User who redeemed
redeemed_at         DATETIME
order_id            BIGINT                           -- If purchased
order_item_id       BIGINT
issue_reason        VARCHAR(255)                     -- 'refund', 'dispute', etc.
admin_notes         TEXT
pdf_path            VARCHAR(500)                     -- Path to PDF
expires_at          DATETIME
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**user_credits** (from affiliate system)
```sql
id              BIGINT PRIMARY KEY AUTO_INCREMENT
user_id         BIGINT NOT NULL UNIQUE
balance         DECIMAL(10,2) DEFAULT 0.00
lifetime_earned DECIMAL(10,2) DEFAULT 0.00
lifetime_spent  DECIMAL(10,2) DEFAULT 0.00
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**user_credit_transactions** (from affiliate system)
```sql
id               BIGINT PRIMARY KEY AUTO_INCREMENT
user_id          BIGINT NOT NULL
amount           DECIMAL(10,2) NOT NULL          -- Positive=credit, Negative=debit
balance_after    DECIMAL(10,2) NOT NULL          -- Running balance
transaction_type ENUM('affiliate_commission', 'affiliate_clawback', 'purchase', 
                      'gift_card_load', 'admin_adjustment', 'refund_credit')
reference_type   VARCHAR(50)                     -- 'gift_cards', 'orders', etc.
reference_id     BIGINT                          -- ID in reference table
description      VARCHAR(255)
created_by       BIGINT                          -- For admin adjustments
created_at       TIMESTAMP
```

### Tables to Create ✅ COMPLETE

**gift_cards** - Created 2026-01-17

### Columns Added ✅ COMPLETE

**orders** - Added 2026-01-17:
- `credit_applied` DECIMAL(10,2) DEFAULT 0.00
- `credit_transaction_id` BIGINT NULL

---

## Build Plan

### Phase 1: Database Schema ✅ COMPLETE
- [x] Create `gift_cards` table
- [x] Add credit columns to `orders` table
- [x] Verify indexes and foreign keys

### Phase 2: Core API ✅ COMPLETE
- [x] GET /api/credits - Get balance + recent transactions
- [x] GET /api/credits/transactions - Transaction history with pagination
- [x] POST /api/credits/redeem - Redeem gift card code
- [x] POST /api/credits/admin/issue - Issue credit/gift card to user
- [x] GET /api/credits/admin/gift-cards - List all gift cards
- [x] GET /api/credits/admin/gift-cards/:id - Get gift card details
- [x] POST /api/credits/admin/gift-cards/:id/cancel - Cancel gift card
- [x] POST /api/credits/admin/gift-cards/:id/resend - Resend email
- [x] POST /api/credits/admin/adjust - Manual credit adjustment
- [x] GET /api/credits/admin/user/:userId - User credit summary

### Phase 3: Dashboard - My Wallet ✅ COMPLETE
- [x] My Wallet page in My Account section
- [x] Balance display with gradient card + lifetime stats
- [x] Transaction history with pagination
- [x] Redeem code form (for manual entry)
- [x] Add to MyAccountMenu with shortcut support
- [x] Register slide-in in dashboard index.js

### Phase 4: Admin Panel ✅ COMPLETE
- [x] Issue Gift Card/Credit UI (with recipient options)
- [x] View all gift cards with search/filter
- [x] Resend gift card email
- [x] Cancel gift card
- [x] User lookup with credit summary
- [x] Add to AdminMenu.js
- [x] Register slide-in in dashboard index.js

### Phase 5: Email + PDF ✅ COMPLETE
- [x] Gift card email template (to recipient) - gift_card_received
- [x] Gift card confirmation email (to sender/admin) - gift_card_sent_confirmation
- [x] Redemption confirmation email - gift_card_redeemed
- [x] Printable gift card page (/gift-card/[code])
- [x] Email sending on issue and redemption
- [x] Migration for email templates

### Phase 6: Checkout Integration ✅ COMPLETE
- [x] Apply credit button before payment section
- [x] Amount entry field with available balance shown
- [x] Inline gift card redemption at checkout
- [x] Balance deduction on order creation
- [x] Skip payment step if fully paid with credit
- [x] Record credit_applied on orders
- [x] CreditApplication.js component
- [x] Backend checkout.js credit handling

---

## Database Schema (New)

### gift_cards Table

```sql
CREATE TABLE gift_cards (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  -- Card identification
  code VARCHAR(20) NOT NULL UNIQUE,              -- Redemption code (e.g., 'GIFT-XXXX-XXXX')
  
  -- Financial
  original_amount DECIMAL(10,2) NOT NULL,        -- Initial value
  current_balance DECIMAL(10,2) NOT NULL,        -- Remaining (for partial use - future)
  
  -- Status
  status ENUM('active', 'redeemed', 'expired', 'cancelled') DEFAULT 'active',
  
  -- Parties involved
  issued_by BIGINT NULL,                         -- Admin user who issued (NULL = system/purchase)
  issued_to_user_id BIGINT NULL,                 -- Recipient user (if known)
  issued_to_email VARCHAR(255) NULL,             -- Recipient email (for non-users)
  sender_user_id BIGINT NULL,                    -- Purchaser/sender (NULL = admin issued)
  sender_name VARCHAR(255) NULL,                 -- "From" name for display
  recipient_name VARCHAR(255) NULL,              -- "To" name for display
  personal_message TEXT NULL,                    -- Gift message
  
  -- Redemption tracking
  redeemed_by BIGINT NULL,                       -- User who redeemed
  redeemed_at DATETIME NULL,
  
  -- Order linkage (for purchased gift cards)
  order_id BIGINT NULL,                          -- If purchased as product
  order_item_id BIGINT NULL,
  
  -- Reason/notes (for admin-issued)
  issue_reason VARCHAR(255) NULL,                -- 'refund', 'dispute', 'promotion', etc.
  admin_notes TEXT NULL,
  
  -- PDF storage
  pdf_path VARCHAR(500) NULL,                    -- Path to generated PDF
  
  -- Timestamps
  expires_at DATETIME NULL,                      -- Optional expiration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_gift_card_code (code),
  INDEX idx_gift_card_status (status),
  INDEX idx_gift_card_issued_to (issued_to_user_id),
  INDEX idx_gift_card_issued_to_email (issued_to_email),
  INDEX idx_gift_card_sender (sender_user_id),
  FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (issued_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);
```

### Orders Table Additions

```sql
ALTER TABLE orders 
ADD COLUMN credit_applied DECIMAL(10,2) DEFAULT 0.00 AFTER tax_amount,
ADD COLUMN credit_transaction_id BIGINT NULL AFTER credit_applied;
```

---

## API Endpoints

### User Endpoints

```
GET  /api/user/credits
     Response: { balance, lifetime_earned, lifetime_spent, recent_transactions[] }

POST /api/user/credits/redeem
     Body: { code }
     Response: { success, amount_added, new_balance, gift_card_details }

GET  /api/user/credits/transactions
     Query: ?page=1&limit=20
     Response: { transactions[], pagination }
```

### Admin Endpoints

```
POST /api/admin/credits/issue
     Body: { 
       recipient_user_id OR recipient_email,
       amount,
       reason,              -- 'refund', 'dispute', 'promotion', 'gift', etc.
       send_email: true,
       sender_name,         -- Optional
       recipient_name,      -- Optional
       personal_message,    -- Optional
       admin_notes          -- Internal notes
     }
     Response: { success, gift_card, code }

GET  /api/admin/gift-cards
     Query: ?status=&search=&page=1&limit=50
     Response: { gift_cards[], pagination }

GET  /api/admin/gift-cards/:id
     Response: { gift_card, redemption_history }

POST /api/admin/gift-cards/:id/resend
     Response: { success, sent_to }

POST /api/admin/gift-cards/:id/cancel
     Response: { success }
```

### Checkout Endpoints

```
POST /api/checkout/apply-credit
     Body: { amount }
     Response: { success, amount_applied, remaining_balance, order_total_after }

POST /api/checkout/remove-credit
     Response: { success, credit_returned, new_balance }
```

---

## Frontend Components

### Dashboard - My Wallet

```
components/dashboard/my-account/components/
└── MyWallet.js                    # Balance + transactions + redeem form
```

**Features:**
- Current balance prominently displayed
- Transaction history table
- "Redeem Gift Card" section with code input
- Link to transaction details

### Admin Panel

```
components/dashboard/admin/components/
└── GiftCardAdmin.js               # Issue + manage gift cards
```

**Features:**
- Issue new gift card form
- Search/filter gift cards
- View details + resend email
- Cancel gift card

### Checkout Integration

**Location:** Modify existing checkout flow

**UI Flow:**
1. User sees "Apply Gift Card or Site Credit" button before payment
2. Click opens section showing:
   - Available balance: $XX.XX
   - Input: "Amount to apply: $[____]"
   - [Apply] button
3. On apply:
   - Deducts from balance
   - Shows "Credit applied: $XX.XX"
   - Reduces order total
4. If order total = $0.00, skip payment methods

---

## Email Templates

### gift_card_issued (to recipient)
```
Subject: You've received a ${amount} gift card from {sender_name}!

- Gift card image/design
- Amount
- Personal message (if any)
- [Redeem Now] button (auto-login link)
- Code displayed (backup)
- Printable PDF attached
```

### gift_card_confirmation (to sender/admin)
```
Subject: Gift card sent to {recipient_name}

- Confirmation of gift card sent
- Amount
- Recipient email
- Code (for records)
- PDF attached
```

---

## Redemption Flow

### Via Email Link (Primary)
```
1. User clicks [Redeem Now] in email
2. URL: /redeem?code=XXXX&token=JWT
3. If logged in → apply immediately
4. If not logged in → login modal → then apply
5. Show confirmation with balance update
6. Option to redeem another code
```

### Via Manual Entry (Backup)
```
1. User goes to My Wallet
2. Enters code in "Redeem Gift Card" section
3. Click [Redeem]
4. Show confirmation with balance update
```

---

## PDF Generation

**Tool:** Use existing PDF library or puppeteer for HTML→PDF

**Design:**
- Attractive gift card design
- Prominent amount display
- QR code linking to redemption URL
- Redemption code in large text
- Personal message (if any)
- Terms/conditions in small print

**Storage:** `/var/www/uploads/gift-cards/{id}.pdf`

---

## Commission Handling

**IMPORTANT:** Site credits do NOT change commission calculations.

```javascript
// At checkout, commission is based on order total (before credit applied)
// Credit simply replaces the cash payment amount

Example:
  Product price: $100
  Platform commission (15%): $15
  Vendor receives: $85
  
  If paid with $50 credit + $50 cash:
  - Vendor still receives $85 (via Stripe for $50 portion)
  - Platform still earns $15 in commission value
  - Credit portion is platform-funded (from gift card sale or admin issue)
```

---

## Security Considerations

1. **Gift Card Codes:** Cryptographically random, hard to guess
2. **Redemption Links:** Include one-time token, expire after use
3. **Rate Limiting:** Prevent brute-force code guessing
4. **Balance Manipulation:** Server-side validation only
5. **Admin Audit:** Log all admin-issued credits with reason

---

## Implementation Log

| Date | Phase | Change | Status |
|------|-------|--------|--------|
| 2026-01-17 | Setup | Created design document | ✅ |
| 2026-01-17 | Phase 1 | Create gift_cards table | ✅ |
| 2026-01-17 | Phase 1 | Add foreign keys to gift_cards | ✅ |
| 2026-01-17 | Phase 1 | Add credit_applied, credit_transaction_id to orders | ✅ |
| 2026-01-17 | Phase 2 | Create credits.js API routes (600+ lines) | ✅ |
| 2026-01-17 | Phase 2 | Register /api/credits in server.js | ✅ |
| 2026-01-17 | Phase 2 | User: balance, transactions, redeem endpoints | ✅ |
| 2026-01-17 | Phase 2 | Admin: issue, list, cancel, resend, adjust endpoints | ✅ |
| 2026-01-17 | Phase 3 | Create MyWallet.js component | ✅ |
| 2026-01-17 | Phase 3 | Add My Wallet to MyAccountMenu | ✅ |
| 2026-01-17 | Phase 3 | Register slide-in in dashboard | ✅ |
| 2026-01-17 | Phase 4 | Create GiftCardAdmin.js component | ✅ |
| 2026-01-17 | Phase 4 | Add to AdminMenu.js | ✅ |
| 2026-01-17 | Phase 4 | Register slide-in in dashboard | ✅ |
| 2026-01-17 | Phase 5 | Create email templates migration | ✅ |
| 2026-01-17 | Phase 5 | Add email sending to credits.js | ✅ |
| 2026-01-17 | Phase 5 | Create printable gift card page | ✅ |
| 2026-01-17 | Phase 6 | Create CreditApplication.js component | ✅ |
| 2026-01-17 | Phase 6 | Update checkout.js frontend | ✅ |
| 2026-01-17 | Phase 6 | Update checkout API for credit handling | ✅ |

---

*Document created: 2026-01-17*
*Last updated: 2026-01-17 (ALL PHASES COMPLETE)*
