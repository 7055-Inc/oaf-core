# 🔄 Returns System Documentation

## 📋 **Overview**

The Returns System allows customers to request returns for eligible products through their order history. This system integrates with the existing order management, product catalog, and user interface components.

## ✅ **Implemented Features**

### **Product-Level Return Control**
- **Database**: Added `allow_returns` boolean field to products table (defaults to `true`)
- **Product Forms**: Added return eligibility toggle on create/edit product pages (`/pages/products/new.js` and `/pages/dashboard/products/[id].js`)
- **Vendor Control**: Vendors can enable/disable returns per product during creation or editing
- **API Integration**: Return field automatically included in product creation and update payloads

### **Customer Return Interface**
- **Order History**: Dynamic return buttons added to line items in customer order pages (`/components/dashboard/my-account/components/MyOrders.js`)
- **Button States**: 
  - **"Return this item"**: Available for eligible items with no existing return request
  - **"Print Return Label"**: Shows when return has been processed and label is available
  - **"Return in progress"**: Disabled state when return exists but label not yet ready
  - **"Not eligible for returns"**: Faded/disabled for non-returnable items
- **Return Eligibility Logic**: 
  - Only shipped orders are eligible
  - Respects product-level `allow_returns` setting
  - 30-day return window from ship date
  - Prevents duplicate return requests
- **Modal Integration**: Complete return request modal with three different flow types
- **Label Management**: Automatic label generation and PDF access for customers

### **UI Components**
- **Toggle Style**: Uses global.css toggle styling for product form controls
- **Button Styling**: Uses global.css secondary button styles for consistency
- **Modal Framework**: Placeholder modal structure ready for return form implementation
- **Modal Integration**: Uses existing global.css modal styles for consistency
- **Product Display**: Visual indicators for return eligibility on product pages (green checkmark for allowed, red X for not allowed)

## 🏗️ **Technical Implementation**

### **Database Schema**
```sql
-- Products table modification
ALTER TABLE products 
ADD COLUMN allow_returns BOOLEAN DEFAULT TRUE 
COMMENT 'Whether this product accepts returns';

-- Returns table enhancements (added to existing returns table)
ALTER TABLE returns 
ADD COLUMN order_item_id BIGINT NULL,
ADD COLUMN vendor_id BIGINT NULL,
ADD COLUMN return_message TEXT NULL,
ADD COLUMN return_address JSON NULL,
ADD COLUMN package_dimensions JSON NULL,
ADD COLUMN label_preference ENUM('customer_label', 'purchase_label') NULL,
ADD COLUMN label_cost DECIMAL(10,2) NULL,
ADD COLUMN shipping_label_id BIGINT NULL,
ADD COLUMN case_messages TEXT NULL,
ADD COLUMN transit_deadline DATE NULL;
```

### **Label Storage System**
- **Returns Folder**: `/static_media/labels/returns/` - Dedicated folder for return labels
- **File Naming**: `return_{returnId}_{timestamp}_{random}.pdf` - Secure, unique filenames
- **Access Control**: Labels accessible only by return creator and vendor
- **Integration**: Stored in existing `shipping_labels` table with proper relationships

### **File Modifications**
- **Product Forms**: Updated create/edit product pages with return toggle
  - `/pages/products/new.js` - Added `allow_returns` to formData and form UI
  - `/pages/dashboard/products/[id].js` - Added `allow_returns` to formData, form UI, and data loading
- **Customer Orders**: Modified order line item display with return buttons
  - `/components/dashboard/my-account/components/MyOrders.js` - Added return eligibility logic and buttons
- **Modal Component**: Complete return request modal component
  - `/components/dashboard/my-account/components/myorders-components/ReturnRequestModal.js` - Full modal with three flow types
- **Vendor Interface**: Returns management integrated into existing order management
  - `/components/dashboard/manage-my-store/components/ManageOrders.js` - Added returns tab with filtering and case threading
- **Admin Interface**: Complete returns management system
  - `/components/dashboard/admin/components/AdminReturns.js` - Status-based tabs with search and filtering
  - `/components/dashboard/admin/AdminMenu.js` - Added Returns Management menu item
  - `/pages/dashboard/index.js` - Added admin-returns slide-in routing
- **API Endpoints**: Updated product endpoints to handle `allow_returns` field
  - `/api-service/src/routes/products.js` - Added `allow_returns` to POST and PATCH endpoints
  - All GET endpoints automatically include the field via `SELECT *` queries
  - `/api-service/src/routes/curated.js` - Curated endpoints automatically include the field
- **Returns API**: Complete returns management system
  - `/api-service/src/routes/returns.js` - Full CRUD operations for return requests
  - `POST /api/returns/create` - Create return requests with automatic flow handling
  - `GET /api/returns/my` - Retrieve user's return requests and statuses
  - `GET /api/returns/:id/label` - Serve return label PDFs directly to browser
  - `POST /api/returns/:id/message` - Message threading for admin/vendor communication
  - `GET /api/returns/vendor/my` - Vendor's returns with status filtering
  - `POST /api/returns/:id/vendor-message` - Vendor case responses
  - `POST /api/returns/:id/mark-received` - Mark returns as received
  - `GET /api/returns/admin/all` - Admin system-wide returns with search/filter
  - `GET /api/returns/admin/by-status/:status` - Admin returns by status
  - `POST /api/returns/:id/admin-message` - Admin case responses
- **Product Display Pages**: Added return eligibility display
  - `/pages/products/[id].js` - Added returns info to dimensions tab
  - `/pages/artist-storefront/product.js` - Added returns policy section

### **Vendor Return Management**
- **Returns Tab**: Added to existing ManageOrders component (`/components/dashboard/manage-my-store/components/ManageOrders.js`)
- **Status Filtering**: Dropdown filter for return status (defaults to all returns within last 1 year)
- **Case Threading**: Message interface for vendor responses to assistance cases
- **Actions Available**:
  - Reply to assistance cases (changes status from `assistance_vendor` to `assistance`)
  - Mark returns as received (triggers refund processing)
  - View return labels when available
- **Return Display**: Complete return information including customer, order details, and message history

### **Admin Return Management**
- **Returns Management**: New slide-in component accessible from Admin menu
- **Status-Based Tabs**: 
  - **Assistance Cases**: Returns needing admin response
  - **Pending Returns**: Returns awaiting vendor action
  - **All Returns**: System-wide view with search and vendor filtering
  - **Completed**: Finished returns for reference
- **Admin Actions**:
  - Send responses to assistance cases (changes status to `assistance_vendor`)
  - Search by customer, order, or return ID
  - Filter by vendor username
  - View detailed return information and labels
- **Case Management**: Full message threading between admin, vendor, and customer

## 📁 **File Structure**

```
/components/
  └── dashboard/
      ├── my-account/
      │   └── components/
      │       ├── MyOrders.js                                    # Customer orders (with return buttons)
      │       └── myorders-components/
      │           └── ReturnRequestModal.js                      # Complete return request modal
      ├── manage-my-store/
      │   └── components/
      │       └── ManageOrders.js                                # Vendor orders (with returns tab)
      └── admin/
          ├── AdminMenu.js                                       # Admin menu (with returns item)
          └── components/
              └── AdminReturns.js                                # Admin returns management
/pages/
  ├── dashboard/
  │   ├── index.js                                              # Main dashboard (with admin-returns routing)
  │   └── products/
  │       └── [id].js                                           # Edit product (with return toggle)
  ├── products/
  │   ├── new.js                                                # Create product (with return toggle)
  │   └── [id].js                                               # Product view (with returns info)
  └── artist-storefront/
      └── product.js                                            # Artist product view (with returns policy)
/api-service/
  └── src/
      └── routes/
          ├── returns.js                                        # Complete returns API
          └── products.js                                       # Updated with allow_returns field
/docs/
  └── RETURNS_SYSTEM_README.md                                  # This documentation
```

## 🔧 **Usage**

### **For Vendors**
1. When creating/editing products, use the "Allow Returns" toggle to control return eligibility
2. Default setting is enabled (returns allowed)

### **For Customers**
1. View order history in Dashboard > My Account > Orders
2. Expand order details to see individual line items
3. Click "Return this item" on eligible items to open return request modal
4. Complete return request form based on reason selected:
   - **Vendor Error** (wrong item/damaged): Automatic prepaid label generation
   - **Quality Issues** (defective/not as described): Choose between purchasing label or self-shipping
   - **Customer Preference** (changed mind/other): Submit for manual review
5. After return processing, click "Print Return Label" to access PDF label
6. Items marked as non-returnable will show disabled "Not eligible for returns" button
7. Check product pages for return eligibility before purchasing (shown in dimensions tab or returns section)

### **For Vendors**
1. **Product Management**: Use "Allow Returns" toggle when creating/editing products
2. **Return Management**: Access via Dashboard > Manage My Store > Manage Orders > Returns tab
3. **Status Filtering**: Use dropdown to filter returns by status (defaults to all within last year)
4. **Case Responses**: Reply to assistance cases to communicate with admin/customer
5. **Order Processing**: Mark returns as "received" to trigger refund processing
6. **Label Access**: View return labels when available

### **For Admins**
1. **Access**: Dashboard > Admin > Returns Management
2. **Assistance Cases**: Respond to returns needing admin intervention
3. **System Overview**: Use "All Returns" tab with search and vendor filtering
4. **Case Management**: Send messages that route to vendors for response
5. **Status Monitoring**: Track returns through all stages from request to completion

## 🔄 **Return Status Workflow**

```
Customer Request → pending → assistance/assistance_vendor → received → processed → refunded
                     ↓           ↑                           ↓
                label_created → in_transit ──────────────────┘
```

**Status Definitions:**
- **pending**: Return approved, awaiting vendor action
- **assistance**: Needs admin response (customer/vendor dispute)
- **assistance_vendor**: Needs vendor response (admin forwarded case)
- **label_created**: Return label generated and available
- **in_transit**: Package in transit back to vendor
- **received**: Vendor confirmed package receipt
- **processed**: Return processing complete
- **refunded**: Customer refund issued

## 🎯 **Return Flow Types**

### **Flow A: Vendor Error (Auto-Prepaid)**
- **Triggers**: Wrong item shipped, damaged in transit
- **Process**: Automatic prepaid label generation
- **Status**: `pending` → `label_created` → `in_transit` → `received` → `refunded`

### **Flow B: Quality Issues (Customer Choice)**
- **Triggers**: Defective product, not as described
- **Process**: Customer chooses label purchase or self-shipping
- **Status**: `pending` → (`label_created` or self-ship) → `received` → `refunded`

### **Flow C: Customer Preference (Manual Review)**
- **Triggers**: Changed mind, no longer needed, other
- **Process**: Admin/vendor case discussion
- **Status**: `assistance` ↔ `assistance_vendor` → resolution

## 📝 **Technical Notes**

- Return eligibility is determined at the product level and order status
- All existing products default to allowing returns
- Return buttons dynamically change based on return status and label availability
- Return labels are automatically generated and stored in dedicated returns folder
- System integrates with existing shipping service for rate calculation and label creation
- Uses existing global.css styles for consistency with platform design
- Complete three-flow system handles different return scenarios automatically
- Case threading appends new messages to the top with timestamps
- 30-day return window from ship date (configurable)
- Labels stored securely with access control

## 🚀 **System Status**

✅ **COMPLETE - Full Returns System Operational**

All components implemented and tested:
- ✅ Customer return requests with 3-flow processing
- ✅ Vendor return management with case threading
- ✅ Admin oversight with search and filtering
- ✅ Automatic label generation and storage
- ✅ Complete API endpoints with security
- ✅ Database schema and relationships
- ✅ UI integration with existing platform

**Ready for Production Testing**

---

*Last Updated: December 2024*
*Documentation Version: 1.0*

