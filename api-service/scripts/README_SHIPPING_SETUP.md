# Vendor Shipping System - Database Setup

## Overview
This directory contains the database migration and maintenance scripts for the vendor shipping system.

## Files Created

### 1. `create_shipping_tables.sql`
Complete database migration script that creates:
- `order_item_tracking` - Main tracking table (unlimited packages per order item)
- `shipping_labels` - Purchased label storage and metadata  
- `vendor_shipping_preferences` - Optional vendor preferences

### 2. `cleanup-labels.js`
Automated cleanup script for label files:
- Deletes label files older than 90 days
- Keeps database records for audit trail
- Cleans up empty directories
- Can be run in dry-run mode for testing

### 3. Label Storage Directory
- Created: `/api-service/storage/labels/`
- Structure: `/labels/YYYY/MM/DD/vendor_id/label_file.pdf`
- Automatic directory creation by label purchase system

## Database Setup Instructions

### Step 1: Run Migration Script
```bash
# Connect to your MySQL database and run:
mysql -u [username] -p [database_name] < api-service/scripts/create_shipping_tables.sql
```

### Step 2: Verify Tables Created
```sql
-- Check tables exist
SHOW TABLES LIKE '%tracking%';
SHOW TABLES LIKE '%shipping%';

-- Verify structure
DESCRIBE order_item_tracking;
DESCRIBE shipping_labels;
DESCRIBE vendor_shipping_preferences;
```

### Step 3: Test Cleanup Script
```bash
# Test cleanup script (dry run - no files deleted)
node api-service/scripts/cleanup-labels.js --dry-run

# Run actual cleanup (when ready)
node api-service/scripts/cleanup-labels.js
```

### Step 4: Setup Cron Job
Add to your crontab for daily cleanup at 2 AM:
```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * /usr/bin/node /var/www/main/api-service/scripts/cleanup-labels.js >> /var/log/label-cleanup.log 2>&1
```

## Database Schema Overview

### order_item_tracking
- **Purpose**: Main tracking table supporting unlimited packages per order item
- **Key Fields**: 
  - `package_sequence` - Auto-incrementing (1, 2, 3...)
  - `tracking_method` - 'label_purchase' or 'manual_entry'
  - `tracking_number` - Carrier tracking number
  - `status` - 'created', 'shipped', 'delivered'

### shipping_labels  
- **Purpose**: Stores purchased label files and transaction details
- **Key Fields**:
  - `label_file_path` - Relative path to label file
  - `cost` - Amount charged to vendor
  - `vendor_transaction_id` - Links to financial records

### vendor_shipping_preferences
- **Purpose**: Optional vendor defaults for shipping
- **Key Fields**:
  - `preferred_carrier` - Default UPS/FedEx/USPS
  - `default_label_format` - 'paper' or 'label'

## Key Relationships

```
orders (existing)
  └── order_items (existing)
      └── order_item_tracking (NEW) 
          ├── shipping_labels (NEW)
          └── vendor_transactions (existing)
```

## Sample Queries

### Get all packages for an order item:
```sql
SELECT 
  oit.package_sequence,
  oit.tracking_number,
  oit.carrier,
  oit.status,
  sl.cost,
  sl.label_file_path
FROM order_item_tracking oit
LEFT JOIN shipping_labels sl ON oit.label_id = sl.id
WHERE oit.order_item_id = ?
ORDER BY oit.package_sequence;
```

### Find orders ready to ship for vendor:
```sql
SELECT DISTINCT
  o.id as order_id,
  o.total_amount,
  COUNT(oi.id) as total_items,
  COUNT(oit.id) as shipped_items
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN order_item_tracking oit ON oi.id = oit.order_item_id
WHERE o.status = 'paid' 
  AND oi.vendor_id = ?
GROUP BY o.id
HAVING shipped_items = 0;
```

## Next Steps After Database Setup

1. ✅ **Database Migration** - Run `create_shipping_tables.sql`
2. ⏳ **Extend ShippingService** - Add label purchase methods
3. ⏳ **Vendor API Routes** - Create shipping endpoints  
4. ⏳ **Frontend Components** - Build vendor shipping interface
5. ⏳ **Email Integration** - Setup tracking notifications

## Support

- **Context Document**: `vendor_shipping_system_context.md`
- **Implementation Plan**: `vendor_shipping_implementation_plan.md`
- **Workflow Overview**: Documented in implementation plan

---

**Ready for implementation!** 🚀

All database infrastructure is prepared and ready to support unlimited packages per order item with full tracking capabilities.