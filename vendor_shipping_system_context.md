# Vendor Shipping System - Implementation Context

## Project Overview
Build a comprehensive shipping system that allows vendors to compare rates, purchase shipping labels, deduct costs from their Stripe Connect balance, and print labels directly from their dashboard.

## Current System Analysis

### ✅ Existing Infrastructure (Strong Foundation)

#### Vendor & Financial System
- **Stripe Connect Integration**: Full vendor account management with balance tracking
- **Vendor Transactions**: Complete transaction history and balance management
- **Connect Balance Access**: `getConnectAccountBalance()` method already implemented
- **Balance Deduction**: Existing system for deducting from Connect balance (used for subscriptions)

#### Order Management System
- **Order States**: `pending` → `processing` → `paid` → `accepted` → `shipped` → `cancelled` → `refunded`
- **Order Structure**: Orders contain multiple items from different vendors
- **Vendor Orders API**: `/api/vendor/orders` - vendors can view their orders by status
- **Order Items**: Detailed breakdown including shipping costs, commissions, vendor info

#### Shipping Rate Calculation (Already Built)
- **Integrated APIs**: UPS, FedEx, USPS rate calculation fully implemented
- **ShippingService Class**: Complete rate comparison system
- **Product Shipping Config**: Products have shipping preferences (free, flat rate, calculated)
- **API Endpoints**: `/api/shipping/calculate-rates` and `/api/shipping/calculate-cart-shipping`

#### Vendor Dashboard
- **Navigation Structure**: Organized menu system with slide-in panels
- **Vendor Tools Section**: Product management, order management, policies
- **Order Interface**: `VendorOrders.js` component for viewing orders
- **Permission System**: Role-based access control

### ❌ Missing Components (To Be Built)

#### Core Shipping Workflow
1. **Order Status Updates**: No vendor API to update orders from `paid` → `shipped`
2. **Label Purchasing**: Only rate calculation exists, no actual label buying
3. **Balance Deduction for Shipping**: No mechanism to charge shipping costs to vendor balance
4. **Label Storage & Retrieval**: No database schema for storing labels and tracking numbers
5. **Vendor Shipping Interface**: No UI workflow for processing shipments

#### Technical Gaps
1. **Database Schema**: Need tables for shipping labels, tracking numbers, shipping preferences
2. **Label Purchase APIs**: Extend existing carrier integrations for label buying (not just rates)
3. **Vendor Shipping Workflow**: Complete UI flow from order selection to label printing
4. **Receipt/Transaction Recording**: Track shipping purchases in financial system

## Requirements & Specifications

### 1. Carrier Priority & Integration
**Priority Order** (by complexity):
1. **UPS** - Highest priority, likely most complex
2. **FedEx** - Medium priority  
3. **USPS** - Lower priority

**Current Status**: Rate calculation APIs already integrated for all three carriers

### 2. Vendor Shipping Preferences
**Product-Level Configuration** (Already Exists):
- Free shipping
- Flat rate shipping  
- Calculated shipping with limited service selections

**Business Rules**:
- **Free/Flat Rate Products**: Allow vendor to choose any available carrier
- **Calculated Products**: Restrict to service selections configured at product level
- Respect existing product shipping configurations

### 3. Label Processing Scope
**Phase 1** (Current Focus):
- Individual label processing only
- No bulk label creation initially
- Focus on core workflow completion

**Future Enhancement**: Bulk label processing for multiple orders

### 4. Label Format Options
**User Selection** (Dropdown during label creation):
- **Paper Format**: Partial page, sideways orientation on 8.5" x 11" paper
- **Label Format**: Full 4" x 6" label format

## Technical Architecture

### Database Schema Extensions

#### New Tables Needed:
```sql
-- Order Item Tracking Table (unlimited packages per item)
CREATE TABLE order_item_tracking (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  order_item_id BIGINT NOT NULL,
  vendor_id BIGINT NOT NULL,
  package_sequence INT NOT NULL DEFAULT 1, -- Auto-incrementing package sequence
  carrier ENUM('ups', 'fedex', 'usps', 'other') NOT NULL,
  service_name VARCHAR(100),
  tracking_number VARCHAR(100) NOT NULL,
  tracking_method ENUM('label_purchase', 'manual_entry') NOT NULL,
  label_id BIGINT NULL, -- References shipping_labels if purchased
  status ENUM('created', 'shipped', 'delivered') DEFAULT 'created',
  shipped_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (vendor_id) REFERENCES users(id),
  INDEX idx_order_item_packages (order_item_id, package_sequence)
);

-- Shipping Labels Table (for purchased labels only)
CREATE TABLE shipping_labels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  order_item_id BIGINT NOT NULL,
  vendor_id BIGINT NOT NULL,
  package_sequence INT NOT NULL DEFAULT 1, -- Matches tracking table
  carrier ENUM('ups', 'fedex', 'usps') NOT NULL,
  service_code VARCHAR(50) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  tracking_number VARCHAR(100) NOT NULL,
  label_file_path VARCHAR(500),
  label_format ENUM('paper', 'label') NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  vendor_transaction_id BIGINT,
  status ENUM('purchased', 'printed') DEFAULT 'purchased',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (vendor_id) REFERENCES users(id),
  FOREIGN KEY (vendor_transaction_id) REFERENCES vendor_transactions(id)
);

-- Vendor Shipping Preferences (Optional)
CREATE TABLE vendor_shipping_preferences (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vendor_id BIGINT NOT NULL,
  preferred_carrier ENUM('ups', 'fedex', 'usps'),
  default_label_format ENUM('paper', 'label') DEFAULT 'paper',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES users(id)
);
```

### API Endpoints to Build

#### Vendor Shipping Management
```
GET    /api/vendor/orders/:orderId/shipping-options    # Get available shipping options for order
POST   /api/vendor/orders/:orderId/purchase-label     # Purchase shipping label
GET    /api/vendor/shipping/labels                     # Get vendor's shipping labels
GET    /api/vendor/shipping/labels/:labelId/download   # Download label file
PUT    /api/vendor/orders/:orderId/ship                # Mark order as shipped
```

### Service Layer Extensions

#### Enhanced ShippingService Methods:
```javascript
// Extend existing ShippingService class
async purchaseShippingLabel(orderId, shippingOption, labelFormat)
async getVendorBalance(vendorId)  // Already exists
async deductShippingCost(vendorId, amount, orderId)
async storeShippingLabel(labelData)
async updateOrderStatus(orderId, status, trackingNumber)
```

### Frontend Components

#### New Vendor Dashboard Components:
1. **"Ship Orders" Slide-in Panel** - New menu option under "Manage My Store"
   - Shows orders with status `paid` and ready to ship
   - Two primary actions per order:
     - **"Create Label"** - Full label creation workflow (rate comparison → purchase → print)
     - **"Add Tracking"** - Manual tracking entry (shipper dropdown + tracking number field)
   - **"Add Another Package" Button** - Dynamically add unlimited packages per order item
2. **Rate Comparison Component** - Show available shipping options during label creation
3. **Label Purchase Modal** - Confirm purchase and select format
4. **Dynamic Package Interface** - Add/remove packages on-demand with "Add Another Package" button
5. **Package List Component** - Display all packages for an order item with individual actions
6. **Manual Tracking Modal** - Simple form for manual tracking entry

#### Customer-Facing Components:
1. **"Track My Order" Links** - Per line item tracking (vendor-specific)
   - Each order item gets unlimited individual package tracking (like Amazon model)
   - Tracking tied to vendor/order_item packages, not entire customer order
   - Unlimited tracking numbers possible per order item
   - **Package Status Aggregation** - Order item shows "shipped" when all packages have tracking

## Implementation Phases

### Phase 1: Core Infrastructure
1. **Database Schema**: Create shipping labels and preferences tables
2. **API Foundation**: Build core vendor shipping endpoints
3. **Balance Integration**: Implement shipping cost deduction from Connect balance
4. **UPS Label Purchase**: Extend UPS integration for label buying (highest priority carrier)

### Phase 2: Vendor Interface
1. **Shipping Workflow UI**: Build vendor dashboard shipping interface
2. **Order Status Updates**: Allow vendors to update order status to shipped
3. **Label Management**: Interface for viewing and reprinting labels
4. **Testing & Refinement**: Complete UPS integration testing

### Phase 3: Additional Carriers
1. **FedEx Label Purchase**: Extend FedEx integration for label buying
2. **USPS Label Purchase**: Extend USPS integration for label buying
3. **Multi-carrier Testing**: Ensure consistent experience across carriers

### Phase 4: Enhancements
1. **Vendor Preferences**: Default shipping preferences interface
2. **Enhanced Reporting**: Shipping analytics and cost tracking
3. **Bulk Processing**: Future enhancement for multiple orders

## Integration Points

### Existing System Integration:
- **Stripe Connect**: Use existing balance checking and transfer system
- **Vendor Transactions**: Record shipping purchases as vendor transactions
- **Order Management**: Integrate with existing order status workflow  
- **Dashboard Structure**: Follow existing slide-in panel pattern
- **Permission System**: Use existing vendor permission checks
- **API Patterns**: Follow established API response formats

### File Locations:
- **Shipping Service**: `api-service/src/services/shippingService.js` (extend existing)
- **Vendor Routes**: `api-service/src/routes/vendor.js` (add shipping endpoints)
- **Database Scripts**: `api-service/scripts/` (new migration script)
- **Frontend Components**: `components/dashboard/vendor/` (new shipping components)
- **Styles**: Follow existing `SlideIn.module.css` patterns

## Success Criteria

### Core Functionality:
- [x] Vendor can view orders ready for shipping
- [x] Vendor can compare shipping rates for orders
- [x] Vendor can purchase shipping labels using Connect balance
- [x] System automatically deducts shipping costs from vendor balance
- [x] Vendor can download/print labels in preferred format
- [x] Order status updates to "shipped" with tracking number
- [x] All shipping purchases recorded in vendor transactions

### Business Requirements:
- [x] Respects existing product shipping configurations
- [x] Integrates seamlessly with current vendor dashboard
- [x] Maintains existing financial transaction patterns
- [x] Provides clear audit trail for shipping expenses
- [x] Supports vendor workflow efficiency

## Business Rules & Implementation Details

### Shipping Address Management
- **Source**: Use shipping address from original order
- **Modifications**: No address modifications allowed during label creation
- **Admin Changes**: If admin modifies shipping address, changes reflect at label creation time
- **Validation**: Use existing order shipping address as-is

### Cost Management & Payment Flow
- **Cost Transparency**: Always show shipping costs before label purchase confirmation
- **No Thresholds**: No maximum cost limits, rely on vendor confirmation
- **Balance Handling**: Allow Stripe Connect balance to go negative for shipping purchases
- **Payment Recovery**: Trigger payment countdown/collection as soon as tracking updates load
- **Alternative**: Explore saving secure payment method on Stripe for automatic charging when balance insufficient

### Label Storage & Management
- **Storage Location**: Local server storage (new `/labels` directory)
- **File Cleanup**: Automated cron job to delete labels older than 90 days
- **Retention Policy**: 90-day retention aligns storage growth with platform growth rate
- **File Organization**: Organize by date/vendor for efficient cleanup

### Customer Communication
- **Automated Tracking Emails**: Integrate with existing email system
- **Required Templates**: "Your order has shipped!" and "Your order has been delivered!"
- **Integration Points**: Hook into existing email infrastructure
- **Tracking Updates**: Automated email triggers based on carrier tracking status

## Implementation Status

### ✅ **COMPLETED PHASES**

#### Phase 1: Core Infrastructure (COMPLETE)
- [x] **Database Schema**: Successfully deployed all shipping tables
  - `order_item_tracking` - Unlimited packages per order item
  - `shipping_labels` - Label file storage and metadata
  - `vendor_shipping_preferences` - Vendor defaults
- [x] **Label Storage Setup**: Directory structure created at `/api-service/storage/labels/`
- [x] **Cleanup System**: 90-day retention cron job script ready
- [x] **Database Connection**: Verified connectivity and table structures

**Database Credentials**: Host: 10.128.0.31, Database: oaf, User: oafuser

### ✅ **COMPLETED PHASES**

#### Phase 2: API Development (COMPLETE)
- [x] **Extend ShippingService**: UPS label purchasing fully integrated
  - Complete UPS Ship API integration for actual label buying
  - Automatic file storage with organized directory structure
  - Database integration for tracking and label records
  - Multi-package support with unlimited scalability
- [x] **Vendor API Routes**: Comprehensive shipping endpoints created
  - Orders ready to ship: `GET /api/vendor/orders/ready-to-ship`
  - Shipping options: `GET /api/vendor/orders/:orderId/shipping-options`
  - Label purchase: `POST /api/vendor/orders/:orderId/items/:itemId/purchase-label`
  - Manual tracking: `POST /api/vendor/orders/:orderId/items/:itemId/add-tracking`
  - Package management: `GET /api/vendor/orders/:orderId/items/:itemId/packages`
  - Mark shipped: `PUT /api/vendor/orders/:orderId/items/:itemId/ship`
  - Label download: `GET /api/vendor/shipping/labels/:labelId/download`
- [x] **Stripe Connect Integration**: Shipping cost deduction from vendor balance
  - Negative balance support (allows going negative for shipping costs)
  - Complete financial audit trail with transaction recording
  - Balance affordability checking for UI warnings
  - Shipping transaction history and reporting

#### Phase 3: Frontend Components (COMPLETE)
- [x] **Vendor Dashboard Integration**: "Ship Orders" slide-in panel implemented
  - Clean separation with dedicated `ShipOrders.js` component
  - Seamless integration with existing VendorTools menu system
  - Follows all established slide-in patterns and global styles
- [x] **Core Shipping Interface**: Complete vendor shipping workflow
  - Ready-to-ship orders display with customer details and shipping addresses
  - Per-item "Create Label" and "Add Tracking" action buttons
  - Real-time shipping rate comparison with UPS/FedEx/USPS integration
  - Label format selection (PDF 8.5x11 vs Label 4x6) with toggle switches
  - Manual tracking number entry with carrier selection
- [x] **UI/UX Integration**: Native look and feel with existing system
  - Global styles: buttons, form cards, tabs, toggles, typography
  - Slide-in infrastructure: container, header, content structure
  - Error handling, loading states, and responsive design
  - Foundation ready for unlimited package additions per order item

#### Phase 4: Email Integration (COMPLETE)
- [x] **Email System Integration**: Complete integration with existing EmailService infrastructure
  - Professional shipping notification templates with OAF branding
  - Database-driven template system with variable substitution
  - Immediate send for shipping confirmations (priority 1)
  - Lower priority for delivery confirmations (priority 2)
- [x] **Email Templates Created**: Professional HTML email templates
  - "Your Order Has Shipped!" with tracking details and carrier links
  - "Your Order Has Been Delivered!" with delivery confirmation
  - OAF brand styling (#055474, #3E1C56, Permanent Marker fonts)
  - Master layout integration with existing email template system
- [x] **API Trigger Integration**: Automatic email sending from shipping endpoints
  - Purchase-label endpoint: Immediate customer notification after successful label purchase
  - Add-tracking endpoint: Immediate customer notification after manual tracking entry
  - Error resilience: Email failures don't break shipping workflow
  - Comprehensive logging and data mapping from order/customer data

#### Phase 5: Multi-Carrier Support (COMPLETE)
- [x] **FedEx Label Purchase**: Complete FedEx Ship API integration for label buying
  - Direct account billing integration using existing FedEx business account
  - OAuth authentication with FedEx APIs using client credentials
  - Full label purchase workflow with multi-package support
  - Consistent file storage pattern with `fedex_order_item_seq_tracking.pdf` naming
  - Complete database integration using existing `shipping_labels` and `order_item_tracking` tables
- [x] **USPS Label Purchase**: Complete USPS 2024 API integration for label buying
  - Direct business account billing integration using USPS business account
  - Updated to new USPS API v3 with OAuth 2.0 authentication
  - Modern API endpoints using POST /labels/v3/label from 2024 documentation
  - Consistent file storage pattern with `usps_order_item_1_tracking.pdf` naming
  - Full compatibility with existing database schema and workflow
- [x] **Multi-Carrier System Architecture**: Comprehensive carrier routing system
  - Enhanced `completeLabelPurchase()` method with carrier parameter support
  - Smart carrier routing: UPS → existing proven integration, FedEx → new Ship API, USPS → new 2024 API
  - Consistent API patterns across all carriers for seamless vendor experience
  - Universal database schema supporting all carriers in same tables
- [x] **API Integration Complete**: Vendor routes updated for multi-carrier support
  - Enhanced purchase-label endpoint with carrier validation (ups/fedex/usps)
  - Frontend integration with carrier parameter in label purchase requests
  - Stripe Connect integration working for all carrier billing deductions
  - Email notification system working automatically for all carriers
- [x] **Complete Integration Testing**: Verified all systems working across carriers
  - OAuth methods implemented and tested for all three carriers
  - Label purchase methods validated for UPS, FedEx, and USPS
  - Multi-carrier routing system verified with comprehensive test suite
  - File naming patterns consistent across all carriers
  - Tracking URL generation working for all carrier tracking systems
  - Email notifications properly formatted for all carriers

**🚀 Multi-Carrier Integration Results:**
- **Complete Coverage**: UPS, FedEx, USPS all fully operational for label purchasing
- **Direct Billing**: All three carriers use direct account billing (no third-party fees)
- **Unified Experience**: Vendors get consistent interface regardless of carrier chosen
- **Professional Communication**: Customers receive proper tracking notifications for all carriers
- **Scalable Foundation**: Architecture ready for additional carriers or enhanced features

#### Phase 6: Customer Interface Enhancement (COMPLETE)
- [x] **Customer Tracking API**: Complete live tracking system with authenticated and public endpoints
  - JWT-authenticated order item tracking: `GET /api/checkout/orders/:orderId/items/:itemId/tracking`
  - JWT-authenticated full order tracking: `GET /api/checkout/orders/:orderId/tracking`
  - Public tracking number lookup: `GET /api/checkout/tracking/:trackingNumber` (no auth required)
  - Smart carrier detection for public lookups with database optimization
  - Complete error handling and security validation
- [x] **Live Carrier API Integration**: Real-time tracking with complete scan history
  - UPS Tracking API: Live status updates with detailed scan history and delivery information
  - FedEx Tracking API: Real-time tracking with comprehensive package journey details
  - USPS Tracking API: 2024 API v3 integration with modern tracking capabilities
  - Unified tracking interface supporting all major carriers consistently
  - Standardized tracking data format across all carriers
- [x] **Premium Customer Tracking Interface**: Amazon-level tracking experience
  - Seamless integration into existing MyAccount order display
  - Two-level expandable interface: orders → items → tracking details
  - "Track Package" buttons appearing only for shipped orders
  - Multi-package support with unlimited scalability per order item
  - Professional tracking display with carrier logos, status icons, and formatted data
  - Complete scan history timeline with locations, timestamps, and status updates
  - Direct links to carrier tracking pages (UPS, FedEx, USPS)
  - Real-time delivery estimates and delivery confirmation display
  - Error-resilient design with graceful handling of API timeouts
- [x] **Advanced Tracking Features**: Complete package journey visibility
  - Live status updates: ✅ Delivered, 🚛 Out for Delivery, 🚚 In Transit, 📋 Origin Scan
  - Complete scan history with chronological package journey
  - Multi-package intelligence (e.g., 10 table sets = 50 individual tracking numbers)
  - Package sequence numbering for easy identification
  - Estimated delivery dates with actual delivery confirmation
  - Self-service customer support through detailed tracking information

**🎯 Customer Experience Delivered:**
- **Amazon-Level Interface**: Professional tracking display with intuitive navigation
- **Self-Service Support**: Complete package visibility reduces customer service inquiries
- **Multi-Carrier Consistency**: Uniform experience across UPS, FedEx, USPS
- **Unlimited Scalability**: Efficiently handles bulk orders with hundreds of packages
- **Real-Time Updates**: Live carrier API integration with immediate status updates
- **Professional Presentation**: Carrier branding, status indicators, formatted timestamps

### ✅ **LATEST COMPLETED PHASE**

#### Phase 7: Advanced Vendor Workflows & Batch Processing (COMPLETE)
- [x] **Dynamic "Add Another Package" UI**: Context-aware multi-package workflows for vendors
  - Smart workflow detection: Label creation vs tracking entry modes
  - Dynamic package addition with "Add Another Package" button
  - Individual package configuration (carrier selection, shipping options, tracking numbers)
  - Package removal functionality for packages beyond the first
  - Real-time package counters and cost summaries
- [x] **Multi-Package Label Creation**: Advanced bulk label processing per order item
  - Multiple packages per order item with individual carrier/service selection
  - Comprehensive shipping options dropdown for each package
  - Cost calculation and summary before processing
  - Batch API calls with "Print All Labels" functionality
  - Sequential label creation with progress tracking and error handling
- [x] **Multi-Package Tracking Entry**: Streamlined tracking number management
  - Multiple tracking numbers per order item with carrier selection
  - Bulk tracking entry with "Save All Tracking" functionality
  - Real-time validation and progress indicators
  - Comprehensive error handling for batch operations
- [x] **Multi-Order Batch Processing**: Enterprise-level bulk operations
  - Checkbox selection interface across multiple orders
  - Select All/Clear All functionality for efficient selection
  - Visual selection indicators with highlighted selected items
  - Batch label creation for multiple order items at once
  - Comprehensive batch processing with detailed success/error reporting
- [x] **Enhanced UI/UX**: Professional batch processing interface
  - Batch mode toggle for clean single vs bulk operation interfaces
  - Real-time selection counters and status indicators
  - Progress indicators for long-running batch operations
  - Comprehensive error handling with user-friendly messaging
  - Consistent styling with existing dashboard themes

**🚀 Advanced Workflow Results:**
- **Smart Context Awareness**: UI adapts between label creation and tracking entry modes
- **Unlimited Scalability**: Support for unlimited packages per order item
- **Batch Efficiency**: Process multiple orders simultaneously with detailed reporting
- **Professional UX**: Enterprise-level interface matching existing dashboard patterns
- **Error Resilience**: Comprehensive error handling and progress tracking

### ✅ **FINAL SYSTEM ENHANCEMENTS (COMPLETE)**

#### Vendor Tracking Interface & Automated Delivery System
- [x] **Vendor Shipped Orders Interface**: Complete vendor tracking dashboard
  - "Shipped Orders" tab with live package tracking for vendor monitoring
  - Expandable tracking details matching premium customer experience  
  - Real-time delivery status monitoring for customer service
  - Integration with existing vendor dashboard and slide-in system
- [x] **Automated Delivery Email System**: Smart delivery detection and notification
  - Automated cron job checking carrier APIs every 4 hours for delivery status
  - Intelligent detection of newly delivered packages with status change tracking
  - Automatic "order delivered" email triggers with delivery confirmation details
  - Database optimization with delivery status caching and indexing (`last_status`, `last_status_check`)
  - Order status automation updating to "delivered" when all packages arrive
  - Comprehensive error handling and batch processing for API efficiency
  - Production-ready cron setup with logging and monitoring

**🎉 COMPLETE ENTERPRISE SHIPPING PLATFORM DELIVERED**

**Final Results:**
- **Complete Vendor Experience**: Rate comparison → Label creation → Delivery monitoring
- **Premium Customer Experience**: Self-service tracking → Live updates → Delivery notifications  
- **Full Email Automation**: Order shipped → Delivery confirmation → Status updates
- **Enterprise Scalability**: Unlimited packages → Multi-carrier → Batch processing
- **Production Ready**: Cron automation → Error handling → Comprehensive logging

### 📋 **FUTURE ENHANCEMENTS (OPTIONAL)**

#### Phase 8: Advanced Analytics & International Expansion  
- [ ] **Shipping Analytics Dashboard**: Vendor shipping performance metrics
- [ ] **International Shipping**: Extend system for international carriers and customs
- [ ] **API Rate Limiting**: Optimize carrier API usage and implement caching
- [ ] **Advanced Reporting**: Shipping cost analysis and delivery performance metrics

---

*This document serves as the master context for the vendor shipping system implementation. All development should reference and update this document as the project evolves.*