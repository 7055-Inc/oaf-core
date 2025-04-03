# Multi-Vendor Marketplace Cart Implementation Plan

## Executive Summary

This document outlines the complete plan for implementing the cart system for our multi-vendor marketplace. Based on the current React implementation, we need to develop the supporting backend infrastructure, API endpoints, and complete the checkout flow to create a fully functional cart system.

## Current State Analysis

### Frontend Implementation (Completed)

1. **Cart Component (Cart.js)**
   - Vendor-grouped cart items display
   - Quantity adjustment functionality
   - "Save for later" feature
   - Coupon application system
   - Shipping method selection per vendor
   - Responsive design for all device sizes
   - Out-of-stock item handling

2. **Product Page (Product.js)**
   - Add to cart functionality
   - Quantity selection with stock validation
   - Vendor and shipping information display
   - Add to wishlist functionality

3. **App Integration**
   - Cart accessible from main navigation
   - Session-based authentication integration
   - Route configuration for cart ("/cart")

### Missing Backend Components

1. **API Endpoints**
   - Cart retrieval ("/api/cart")
   - Cart item CRUD operations
   - Shipping selection
   - Coupon management
   - Saved items functionality

2. **Data Persistence**
   - Database tables for cart items
   - Session-database synchronization
   - User cart association

3. **Checkout Flow**
   - Address collection
   - Payment processing
   - Order creation
   - Confirmation system

## Implementation Plan

### Phase 1: Database Schema Enhancement (2-3 weeks)

**Objective:** Design and implement the database schema required to support the cart system.

**Tasks:**
1. Create the following database tables:
   
   **cart_items**
   ```
   - id (PK)
   - user_id (FK to users, nullable)
   - session_id (varchar, for guest carts)
   - product_id (FK to products)
   - quantity (integer)
   - saved_for_later (boolean, default false)
   - created_at (timestamp)
   - updated_at (timestamp)
   ```

   **shipping_methods**
   ```
   - id (PK)
   - vendor_id (FK to users/vendors)
   - name (varchar)
   - type (enum: 'free', 'flat', 'calculated')
   - flat_rate (decimal, nullable)
   - is_default (boolean)
   - active (boolean)
   ```
   
   **coupons**
   ```
   - id (PK)
   - code (varchar, unique)
   - discount_type (enum: 'percentage', 'fixed')
   - discount_value (decimal)
   - min_purchase (decimal, nullable)
   - valid_from (datetime)
   - valid_to (datetime, nullable)
   - max_uses (integer, nullable)
   - used_count (integer, default 0)
   - vendor_id (FK to users/vendors, nullable for platform-wide coupons)
   - is_active (boolean)
   ```
   
   **applied_coupons**
   ```
   - id (PK)
   - user_id (FK to users, nullable)
   - session_id (varchar, for guest carts)
   - coupon_id (FK to coupons)
   - applied_at (datetime)
   ```

2. Implement foreign key relationships and indexes
3. Create database migration scripts
4. Test database schema with sample data

### Phase 2: Backend API Development (2-3 weeks)

**Objective:** Implement all API endpoints required by the cart frontend.

**Tasks:**

1. **Cart Retrieval API**
   - Endpoint: `GET /api/cart`
   - Functionality:
     - Retrieve cart items grouped by vendor
     - Include shipping options per vendor
     - Calculate subtotals, shipping costs, and grand total
     - Return applied coupons and discounts
     - Include saved items

2. **Cart Item Management API**
   - Endpoints:
     - `POST /api/cart/items` - Add item to cart
     - `PATCH /api/cart/items/:id` - Update quantity
     - `DELETE /api/cart/items/:id` - Remove item
     - `PATCH /api/cart/items/:id/save` - Save for later
     - `PATCH /api/cart/items/:id/move-to-cart` - Move to cart

3. **Shipping Method API**
   - Endpoints:
     - `GET /api/vendor/:id/shipping` - Get vendor shipping methods
     - `PATCH /api/cart/vendor/:id/shipping` - Select shipping method

4. **Coupon System API**
   - Endpoints:
     - `POST /api/cart/coupons` - Apply coupon code
     - `DELETE /api/cart/coupons/:id` - Remove coupon
   - Implementation:
     - Validate coupon eligibility (expiration, usage limits)
     - Calculate and apply discount
     - Handle vendor-specific and platform-wide coupons

5. **Authentication Integration**
   - Implement cart merging when guest user logs in
   - Ensure proper user association with cart items
   - Handle session expiration gracefully

### Phase 3: Frontend Integration & Refinement (1-2 weeks)

**Objective:** Ensure seamless integration between frontend and backend systems.

**Tasks:**
1. Test all API endpoints with the existing React components
2. Add global cart state management (optional)
   - Display cart item count in header
   - Implement real-time cart updates
3. Enhance error handling
   - Improve error messaging
   - Add retry mechanisms for failed operations
4. Optimize UI/UX
   - Refine loading states
   - Improve responsiveness
   - Add animations for cart actions

### Phase 4: Checkout Flow Development (3-4 weeks)

**Objective:** Create a complete checkout process to convert cart items into orders.

**Tasks:**
1. **Create Checkout Component**
   - Multi-step checkout process:
     - Shipping address collection
     - Billing information
     - Payment method selection
     - Order review
   - Address storage and retrieval
   - Form validation

2. **Order Creation System**
   - Database schema for orders:
     ```
     orders
     - id (PK)
     - user_id (FK to users)
     - status (enum: 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')
     - subtotal (decimal)
     - discount (decimal)
     - shipping_total (decimal)
     - tax_total (decimal)
     - grand_total (decimal)
     - billing_address_id (FK to addresses)
     - shipping_address_id (FK to addresses)
     - payment_method (varchar)
     - payment_id (varchar, from payment processor)
     - notes (text, nullable)
     - created_at (timestamp)
     - updated_at (timestamp)
     
     order_items
     - id (PK)
     - order_id (FK to orders)
     - product_id (FK to products)
     - vendor_id (FK to users/vendors)
     - quantity (integer)
     - price (decimal, price at time of purchase)
     - subtotal (decimal)
     - discount (decimal, nullable)
     - status (enum: 'processing', 'shipped', 'delivered', 'cancelled')
     - shipping_method_id (FK to shipping_methods)
     - shipping_cost (decimal)
     - tracking_number (varchar, nullable)
     - created_at (timestamp)
     - updated_at (timestamp)
     
     addresses
     - id (PK)
     - user_id (FK to users, nullable for guest checkout)
     - name (varchar)
     - address1 (varchar)
     - address2 (varchar, nullable)
     - city (varchar)
     - state (varchar)
     - zip (varchar)
     - country (varchar)
     - phone (varchar)
     - is_default (boolean)
     - address_type (enum: 'shipping', 'billing', 'both')
     - created_at (timestamp)
     - updated_at (timestamp)
     ```

3. **Payment Integration**
   - Select payment gateway (e.g., Stripe, PayPal)
   - Implement payment flow
   - Handle payment confirmation
   - Process payment errors

4. **Order Confirmation**
   - Create success page
   - Implement email notifications
   - Clear cart after successful order
   - Record order history

### Phase 5: Testing, Security & Optimization (2 weeks)

**Objective:** Ensure the cart system is robust, secure, and performant.

**Tasks:**
1. **Comprehensive Testing**
   - Unit tests for API endpoints
   - Integration tests for cart-to-checkout flow
   - Edge case testing (out of stock, coupon limits)
   - Load testing with large carts

2. **Security Enhancements**
   - Input validation
   - CSRF protection
   - Price manipulation prevention
   - Session security

3. **Performance Optimization**
   - Database query optimization
   - Implement caching strategies
   - Optimize API response times
   - Reduce unnecessary requests

## Technical Considerations

### Multi-vendor Complexity
1. **Vendor-specific Logic**
   - Each vendor has their own shipping methods
   - Tax calculations may vary by vendor location
   - Commission calculations on orders

2. **Order Splitting**
   - Orders need to be split by vendor for fulfillment
   - Each vendor portion can have different statuses
   - Shipping is calculated per vendor

### Cart Persistence Strategy
1. **Guest vs. User Carts**
   - Guest carts stored with session_id
   - User carts associated with user_id
   - Merge carts when guest logs in

2. **Session Management**
   - Handle session expiration gracefully
   - Implement cart recovery mechanism
   - Long-term cart storage policy

### Inventory Management
1. **Stock Verification**
   - Real-time stock checking before checkout
   - Temporary stock holds during checkout process
   - Stock release for abandoned carts

2. **Overselling Prevention**
   - Quantity limits based on available stock
   - Queue system for popular items
   - Waitlist functionality (optional)

## API Endpoint Specifications

### Cart Retrieval
```
GET /api/cart

Response:
{
  "vendorGroups": [
    {
      "vendor": {
        "id": 1,
        "name": "Vendor Name"
      },
      "items": [
        {
          "id": 101,
          "name": "Product Name",
          "price": 29.99,
          "quantity": 2,
          "imageUrl": "/media/product-image.jpg",
          "stockAvailable": 10
        }
      ],
      "shippingMethods": [
        {
          "id": 1,
          "name": "Standard Shipping",
          "type": "flat",
          "flat_rate": 5.99
        }
      ],
      "selectedShipping": 1,
      "shippingCost": 5.99,
      "subtotal": 59.98
    }
  ],
  "savedItems": [
    {
      "id": 102,
      "name": "Saved Product",
      "price": 19.99,
      "vendorName": "Another Vendor",
      "imageUrl": "/media/saved-product.jpg",
      "stockAvailable": 5
    }
  ],
  "appliedCoupons": [
    {
      "id": 1,
      "code": "SUMMER10",
      "discountAmount": 6.00
    }
  ],
  "subtotal": 59.98,
  "discount": 6.00,
  "shippingTotal": 5.99,
  "grandTotal": 59.97
}
```

### Add Item to Cart
```
POST /api/cart/items
{
  "productId": 101,
  "quantity": 2
}

Response:
{
  "success": true,
  "item": {
    "id": 501,
    "productId": 101,
    "quantity": 2
  }
}
```

### Update Cart Item Quantity
```
PATCH /api/cart/items/501
{
  "quantity": 3
}

Response: [Full cart object as in GET /api/cart]
```

### Apply Coupon
```
POST /api/cart/coupons
{
  "code": "SUMMER10"
}

Response: [Full cart object as in GET /api/cart]
```

## Next Steps and Dependencies

1. **Immediate Next Steps**
   - Finalize database schema design
   - Begin implementing cart API endpoints
   - Plan checkout page UI

2. **Team Assignments**
   - Backend developers: API implementation
   - Frontend developers: Integration and checkout UI
   - Database specialist: Schema implementation
   - QA: Test planning

3. **Dependencies**
   - User authentication system
   - Product inventory management
   - Vendor management system
   - Payment gateway selection

---

This plan will be revised and updated as implementation progresses. Regular sync meetings will be held to track progress and address any challenges that arise.
