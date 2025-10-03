# Inventory - Internal Documentation

## Overview
Comprehensive inventory management system that tracks product quantities, allocations, and inventory history. This system provides real-time inventory tracking with automatic record creation, transaction-safe updates, and detailed audit trails for all inventory changes.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Secure logger for audit trails
- **Database Tables:** 
  - `product_inventory` - Core inventory quantities and settings
  - `product_inventory_with_allocations` - View with calculated available quantities
  - `inventory_history` - Complete audit trail of inventory changes
  - `products` - Product information (synchronized with inventory)
  - `users` - User information for audit trails (joined)
- **External APIs:** None (internal system only)

## Functions/Endpoints

### Inventory Retrieval
#### GET /:productId
- **Purpose:** Get comprehensive inventory details for a specific product
- **Parameters:** Product ID in URL path
- **Returns:** Inventory details with allocations and change history
- **Errors:** 404 for product not found, 500 for database errors
- **Usage Example:** Vendor dashboard inventory display
- **Special Features:**
  - Automatic inventory record creation if none exists
  - Includes allocation details (TikTok, orders, etc.)
  - Returns last 50 history records for audit trail
  - Calculates quantity changes and running totals

### Inventory Updates
#### PUT /:productId
- **Purpose:** Update inventory quantities with full transaction safety
- **Parameters:** Product ID, new quantity on hand, change type, reason
- **Returns:** Updated inventory details with new calculated quantities
- **Errors:** 400 for missing data, 404 for inventory not found, 500 for update errors
- **Usage Example:** Manual inventory adjustments, restocking, corrections
- **Special Features:**
  - Database transaction ensures data consistency
  - Automatic history record creation
  - Synchronizes with products table available_qty
  - Recalculates all allocation-based quantities

### System Administration
#### POST /sync
- **Purpose:** Sync all products to inventory system (admin only)
- **Parameters:** None (admin permissions required)
- **Returns:** Synchronization results with count of products processed
- **Errors:** 403 for non-admin access, 500 for sync errors
- **Usage Example:** Initial system setup, data migration, bulk operations
- **Special Features:**
  - Creates inventory records for products without them
  - Uses existing product available_qty as starting point
  - Bulk operation with individual history records
  - Admin-only access control

## Environment Variables
- No domain-specific environment variables needed for this module
- Relies on database configuration for data persistence
- Uses secure logger configuration for audit trails

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** Admin permission required for sync operations
- **Data Integrity:** Database transactions for all updates
- **Audit Trails:** Complete logging of all inventory changes
- **Input Validation:** Required field validation for updates
- **Access Control:** Users can only access inventory for their products

## Inventory System Architecture

### Core Concepts
- **Quantity on Hand:** Physical inventory count
- **Quantity on Order:** Items ordered but not yet received
- **Quantity Available:** On hand minus allocations
- **Quantity Truly Available:** Available minus pending orders
- **Total Allocated:** Sum of all allocation types
- **TikTok Allocated:** Specific allocation for TikTok integration

### Allocation Types
- **Order Allocations:** Items reserved for pending orders
- **TikTok Allocations:** Items reserved for TikTok Shop integration
- **Future Allocations:** Planned reservations for events/promotions

### Change Types
- **initial_stock:** First-time inventory setup
- **sync_setup:** Bulk synchronization operation
- **adjustment:** Manual quantity corrections
- **restock:** Inventory replenishment
- **sale:** Inventory reduction from sales
- **damage:** Inventory loss due to damage
- **return:** Inventory increase from returns
- **allocation:** Quantity reserved for specific purpose
- **release:** Allocation removed, quantity returned to available

## Database Views and Calculations

### product_inventory_with_allocations View
This view provides calculated fields for inventory management:
- Combines base inventory with allocation data
- Calculates qty_available (on_hand - allocated)
- Calculates qty_truly_available (available - pending_orders)
- Provides real-time allocation totals by type

### History Tracking
- **Complete Audit Trail:** Every inventory change recorded
- **User Attribution:** Links changes to specific users
- **Change Calculation:** Automatic quantity change calculation
- **Reason Tracking:** Required reason for all changes
- **Timestamp Precision:** Exact change timestamps

## Transaction Safety
- **ACID Compliance:** All updates use database transactions
- **Rollback Protection:** Automatic rollback on any error
- **Consistency Guarantees:** Inventory and product tables stay synchronized
- **Concurrent Access:** Safe for multiple simultaneous updates

## Integration Points
- **Products Table:** Automatic synchronization of available_qty
- **Order System:** Allocation management for pending orders
- **TikTok Integration:** Specific allocation tracking
- **Vendor Dashboard:** Real-time inventory display
- **Admin Tools:** Bulk operations and system management

## Performance Considerations
- **Database Indexing:** Optimized queries on product_id and timestamps
- **View Performance:** Calculated fields cached in database view
- **History Limits:** History queries limited to 50 recent records
- **Transaction Efficiency:** Minimal transaction scope for performance

## Testing
- **Unit Tests:** Should cover all inventory calculation methods
- **Integration Tests:** Test database transaction rollback scenarios
- **Concurrency Tests:** Verify safe concurrent inventory updates
- **Data Integrity Tests:** Ensure inventory-product synchronization
- **Performance Tests:** Test bulk sync operations with large datasets

## Monitoring and Logging
- **Secure Logging:** All inventory changes logged with user context
- **Error Tracking:** Comprehensive error logging for debugging
- **Audit Compliance:** Complete audit trail for regulatory requirements
- **Performance Monitoring:** Track database query performance
- **Data Consistency:** Monitor inventory-product synchronization

## Common Use Cases
- **Vendor Inventory Management:** Real-time quantity tracking
- **Order Fulfillment:** Allocation and availability checking
- **Restocking Operations:** Bulk quantity updates with reasons
- **Audit Requirements:** Complete change history for compliance
- **System Migration:** Bulk synchronization of existing products
- **Damage/Loss Tracking:** Inventory adjustments with documentation

## Error Handling
- **Graceful Degradation:** System continues operating with partial data
- **Transaction Rollback:** Automatic cleanup on update failures
- **User-Friendly Messages:** Clear error messages for common issues
- **Detailed Logging:** Technical details logged for debugging
- **Recovery Procedures:** Clear steps for data recovery scenarios

## Future Enhancements
- **Automated Reordering:** Trigger reorders based on reorder_qty
- **Forecasting Integration:** Predict inventory needs based on sales
- **Multi-Location Support:** Track inventory across multiple warehouses
- **Barcode Integration:** Barcode scanning for inventory updates
- **Real-Time Notifications:** Alert vendors of low stock conditions
- **Batch Import/Export:** CSV-based bulk inventory operations
