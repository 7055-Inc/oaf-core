# Checkout - Internal Documentation

## Overview
Comprehensive checkout process management system handling the complete e-commerce transaction flow from cart totals calculation to order finalization. This system integrates with Stripe for payments, tax calculations, shipping rate calculations, discount applications, and multi-vendor order processing.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - Stripe service for payments and tax
  - Shipping service for rate calculations
  - Discount service for coupon management
  - JWT middleware for authentication
  - Rate limiter middleware
- **Database Tables:** 
  - `orders` - Main order records
  - `order_items` - Individual items within orders
  - `order_item_tracking` - Shipping tracking information
  - `products` - Product information (joined)
  - `product_shipping` - Shipping configuration (joined)
  - `users` - User information (joined)
  - `user_profiles` - Extended user profiles (joined)
  - `product_images` - Product thumbnails (joined)
  - `stripe_tax_transactions` - Tax calculation records
  - `carts` and `cart_items` - Cart management (cleared after order)
- **External APIs:** 
  - Stripe Payment API
  - Stripe Tax API
  - UPS/FedEx/USPS shipping APIs (via shipping service)

## Functions/Endpoints

### Core Checkout Flow
#### POST /calculate-totals
- **Purpose:** Calculate comprehensive totals including shipping, tax, discounts, and commissions
- **Parameters:** `cart_items` (array), `shipping_address` (object), `applied_coupons` (array)
- **Returns:** Vendor-grouped items with complete pricing breakdown
- **Errors:** 400 for invalid cart items, 500 for calculation errors
- **Usage Example:** Pre-checkout totals display and order preview

#### POST /create-payment-intent
- **Purpose:** Create Stripe payment intent with tax calculation and order creation
- **Parameters:** `cart_items`, `shipping_info`, `billing_info`
- **Returns:** Payment intent details, order ID, and calculated totals with tax
- **Errors:** 400 for missing data, 500 for payment intent creation failures
- **Usage Example:** Initialize payment flow with Stripe Elements

#### POST /confirm-payment
- **Purpose:** Finalize order after successful payment confirmation
- **Parameters:** `payment_intent_id`, `order_id`
- **Returns:** Confirmation of order processing
- **Errors:** 400 for missing IDs, 403 for unauthorized access, 500 for processing errors
- **Usage Example:** Complete checkout flow after payment success

### Order Management
#### GET /payment-status/:order_id
- **Purpose:** Check payment and order status
- **Parameters:** Order ID in URL path
- **Returns:** Order status and basic payment information
- **Errors:** 403 for unauthorized access, 500 for database errors
- **Usage Example:** Order confirmation page status display

#### GET /order/:order_id
- **Purpose:** Retrieve complete order details with items
- **Parameters:** Order ID in URL path
- **Returns:** Full order object with items and vendor information
- **Errors:** 403 for unauthorized access, 500 for database errors
- **Usage Example:** Order details page and receipt generation

#### GET /orders/my
- **Purpose:** Get paginated order history for customer
- **Parameters:** `page`, `limit`, `status` (query parameters)
- **Returns:** Paginated order list with tracking information
- **Errors:** 500 for database errors
- **Usage Example:** Customer order history dashboard

### Discount Management
#### POST /apply-coupon
- **Purpose:** Validate and apply coupon code to cart items
- **Parameters:** `coupon_code`, `cart_items`
- **Returns:** Coupon details and discounted item prices
- **Errors:** 400 for invalid coupon or cart data, 500 for processing errors
- **Usage Example:** Coupon application in checkout flow

#### POST /remove-coupon
- **Purpose:** Remove applied coupon from cart
- **Parameters:** `coupon_code`, `cart_items`
- **Returns:** Items without coupon discount applied
- **Errors:** 400 for invalid data, 500 for processing errors
- **Usage Example:** Coupon removal functionality

#### POST /get-auto-discounts
- **Purpose:** Get automatically applicable discounts
- **Parameters:** `cart_items`
- **Returns:** Items with auto-applied discounts
- **Errors:** 400 for invalid cart data, 500 for processing errors
- **Usage Example:** Display automatic discounts in checkout

#### GET /validate-coupon/:code
- **Purpose:** Validate coupon without applying it
- **Parameters:** Coupon code in URL, optional cart items in query
- **Returns:** Coupon validation status and details
- **Errors:** 500 for validation errors
- **Usage Example:** Real-time coupon validation

## Helper Functions

### getCartItemsWithDetails(cartItems)
- **Purpose:** Enrich cart items with product and shipping information
- **Parameters:** Array of cart items with product_id and quantity
- **Returns:** Items with product details, vendor info, and shipping configuration
- **Errors:** Throws error if product not found
- **Usage Example:** Data preparation for all checkout calculations

### calculateShippingCosts(items, shippingAddress)
- **Purpose:** Calculate shipping costs using various methods (free, flat rate, calculated)
- **Parameters:** Items with product details, destination address
- **Returns:** Items with shipping costs and available shipping options
- **Errors:** Logs errors but continues with zero shipping cost
- **Usage Example:** Shipping rate calculation for checkout totals

### groupItemsByVendor(items)
- **Purpose:** Organize items by vendor for multi-vendor order display
- **Parameters:** Array of items with vendor information
- **Returns:** Vendor groups with subtotals and commission information
- **Errors:** None (pure function)
- **Usage Example:** Checkout display organization

### calculateOrderTotals(items)
- **Purpose:** Calculate comprehensive order totals
- **Parameters:** Items with pricing and shipping information
- **Returns:** Complete totals breakdown including platform fees
- **Errors:** None (pure function)
- **Usage Example:** Final totals calculation for payment

### createOrder(userId, totals, items)
- **Purpose:** Create order record with transaction safety
- **Parameters:** User ID, calculated totals, order items
- **Returns:** Created order ID
- **Errors:** Throws error if order creation fails, rolls back transaction
- **Usage Example:** Order creation during payment intent process

## Environment Variables
- No domain-specific environment variables needed for this module
- Relies on Stripe service configuration for payment processing
- Uses shipping service configuration for rate calculations

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** Users can only access their own orders
- **Input Validation:** All cart items and addresses validated before processing
- **Rate Limiting:** Order history endpoint has specific rate limiting
- **Transaction Safety:** Database transactions ensure order consistency
- **Payment Security:** Stripe handles all sensitive payment data

## Tax Integration
- **Stripe Tax API:** Automatic tax calculation based on billing address
- **Tax Storage:** Tax calculations stored for compliance and reporting
- **Tax Transactions:** Created for successful payments
- **Multi-jurisdiction:** Supports US state and international tax calculation

## Multi-Vendor Support
- **Vendor Grouping:** Orders automatically grouped by vendor
- **Commission Calculation:** Platform fees calculated per item
- **Separate Processing:** Each vendor's items tracked independently
- **Shipping Separation:** Vendor-specific shipping calculations

## Testing
- **Unit Tests:** Should cover all calculation functions and helper methods
- **Integration Tests:** Test complete checkout flow with Stripe test mode
- **Tax Testing:** Verify tax calculations with various addresses
- **Multi-vendor Testing:** Test orders with items from multiple vendors
- **Error Handling:** Test payment failures and recovery scenarios

## Performance Considerations
- **Database Optimization:** Complex queries for order history should be indexed
- **Stripe API Limits:** Rate limiting for tax calculations and payment intents
- **Shipping API Limits:** Caching of shipping rates for identical requests
- **Transaction Efficiency:** Minimal database calls during order creation
- **Memory Usage:** Large cart calculations should be optimized

## Monitoring and Logging
- **Payment Tracking:** All payment intents and confirmations logged
- **Tax Compliance:** Tax calculations logged for audit purposes
- **Error Tracking:** Comprehensive error logging for debugging
- **Performance Metrics:** Track checkout completion rates and timing
- **Fraud Detection:** Monitor for unusual order patterns

## Future Enhancements
- **Inventory Hold:** Reserve inventory during checkout process
- **Split Payments:** Support for multiple payment methods
- **Subscription Orders:** Recurring order processing
- **International Shipping:** Enhanced global shipping support
- **Order Modification:** Allow order changes before fulfillment
- **Advanced Tax:** Support for complex tax scenarios and exemptions
