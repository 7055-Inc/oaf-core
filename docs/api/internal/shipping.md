# Shipping - Internal Documentation

## Overview
Comprehensive shipping management system handling rate calculations, label generation, batch processing, and multi-carrier integrations. This system supports subscription-based label purchasing, vendor label libraries, and complete shipping workflow management from rate calculation to delivery tracking.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for vendor/admin access
  - Shipping service for carrier integrations
  - Stripe service for payment processing
  - File system operations for label storage
- **Database Tables:** 
  - `product_shipping` - Product shipping configurations
  - `products` - Product information (joined)
  - `orders` - Order information (joined)
  - `order_items` - Order items for shipping (joined)
  - `shipping_addresses` - Delivery addresses (joined)
  - `shipping_labels` - Generated shipping labels
  - `order_item_tracking` - Tracking information
  - `user_subscriptions` - Shipping label subscriptions
  - `shipping_label_purchases` - Label purchase records
  - `vendor_transactions` - Connect balance transactions
- **External APIs:** 
  - UPS Shipping API
  - FedEx Shipping API
  - USPS Shipping API
  - Stripe Payment API

## Functions/Endpoints

### Rate Calculation
#### POST /calculate-rates
- **Purpose:** Calculate shipping rates for a single product
- **Parameters:** Product ID, recipient address
- **Returns:** Available shipping rates from all carriers
- **Errors:** 400 for missing data, 404 for product not found, 500 for calculation errors
- **Usage Example:** Product page shipping calculator

#### POST /calculate-cart-shipping
- **Purpose:** Calculate shipping rates for multiple products in cart
- **Parameters:** Cart items array, recipient address, optional test packages
- **Returns:** Shipping results for all products with total cost
- **Errors:** 400 for invalid cart data, 500 for calculation errors
- **Usage Example:** Checkout page shipping calculation

#### GET /services/:product_id
- **Purpose:** Get available shipping services for a product
- **Parameters:** Product ID in URL path
- **Returns:** Shipping methods and estimated delivery times
- **Errors:** 404 for product not found, 500 for database errors
- **Usage Example:** Product page shipping options display

### Label Management
#### POST /get-label-rates
- **Purpose:** Get live shipping rates for label generation
- **Parameters:** Order item ID, optional package specifications
- **Returns:** Live shipping rates prioritized by vendor preferences
- **Errors:** 404 for item not found, 500 for rate calculation errors
- **Usage Example:** Vendor dashboard label creation

#### POST /process-batch
- **Purpose:** Process batch operations for shipping (tracking and labels)
- **Parameters:** Batch array with operations (tracking updates, label creation)
- **Returns:** Results of all batch operations
- **Errors:** 400 for subscription required, 500 for processing errors
- **Usage Example:** Bulk order processing in vendor dashboard

#### POST /cancel-label
- **Purpose:** Cancel shipping label and process refund
- **Parameters:** Tracking number, carrier, optional label ID
- **Returns:** Cancellation confirmation and refund details
- **Errors:** 400 for missing data, 403 for access denied, 500 for cancellation errors
- **Usage Example:** Vendor correcting shipping mistakes

### Label Library
#### GET /my-labels
- **Purpose:** Get vendor's shipping label library
- **Parameters:** None (vendor ID from JWT token)
- **Returns:** Array of vendor's labels with order and customer details
- **Errors:** 500 for database errors
- **Usage Example:** Vendor label history and reprinting

#### GET /labels/:filename
- **Purpose:** Serve individual shipping label PDF file
- **Parameters:** Label filename in URL path
- **Returns:** PDF file stream with appropriate headers
- **Errors:** 403 for access denied, 404 for file not found, 500 for serving errors
- **Usage Example:** Label download and printing

#### POST /batch-labels
- **Purpose:** Batch merge selected labels for printing
- **Parameters:** Array of label IDs to merge
- **Returns:** Batch processing result with download URL
- **Errors:** 400 for no labels selected, 404 for invalid labels, 500 for processing errors
- **Usage Example:** Bulk label printing for efficiency

## Helper Functions

### getShippingAddressForOrder(orderId)
- **Purpose:** Get shipping address for a specific order
- **Parameters:** Order ID to lookup
- **Returns:** Shipping address object with all required fields
- **Errors:** Throws error if address not found
- **Usage Example:** Address lookup for label generation

## Environment Variables
- No domain-specific environment variables needed for this module
- Relies on shipping service configuration for carrier API keys
- Uses Stripe service configuration for payment processing

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** Vendor permission required for label operations
- **File Security:** Label files secured with user ID in filename
- **Payment Security:** Stripe handles all payment processing
- **Access Control:** Users can only access their own labels and orders
- **Input Validation:** All shipping data validated before processing

## Shipping Methods
### Free Shipping
- **Process:** No cost to customer, vendor absorbs shipping
- **Use Case:** Promotional offers or high-value items

### Flat Rate Shipping
- **Process:** Fixed cost regardless of destination
- **Use Case:** Predictable shipping costs for standard items

### Calculated Shipping
- **Process:** Real-time rates from carrier APIs
- **Use Case:** Accurate pricing based on weight, dimensions, and distance

## Multi-Carrier Support
- **UPS:** Ground, Air, International services
- **FedEx:** Ground, Express, International services
- **USPS:** Ground Advantage, Priority, Express services
- **Rate Shopping:** Automatic comparison across carriers
- **Service Filtering:** Vendor-configurable allowed services

## Subscription System
- **Label Subscriptions:** Monthly/annual plans for label purchasing
- **Payment Methods:** Credit card or Stripe Connect balance
- **Usage Tracking:** Monitor label usage and costs
- **Automatic Billing:** Subscription-based payment processing

## Batch Processing
- **Tracking Updates:** Bulk tracking number entry
- **Label Creation:** Bulk label generation with payment
- **Mixed Operations:** Combined tracking and label operations
- **Transaction Safety:** Database transactions ensure consistency

## Testing
- **Unit Tests:** Should cover all rate calculation methods
- **Integration Tests:** Test carrier API integrations
- **Payment Tests:** Verify subscription and payment processing
- **Security Tests:** Verify access control and file security
- **Performance Tests:** Test batch processing with large orders

## Performance Considerations
- **API Rate Limits:** Respect carrier API rate limits
- **Caching:** Cache shipping rates for identical requests
- **Database Optimization:** Index on vendor_id, order_id, tracking_number
- **File Storage:** Monitor disk usage for label PDFs
- **Batch Efficiency:** Process multiple operations in single transaction

## Monitoring and Logging
- **Rate Calculation:** Track API usage and response times
- **Label Generation:** Monitor success rates and failures
- **Payment Processing:** Track subscription payments and failures
- **Error Tracking:** Comprehensive error logging for debugging
- **Usage Analytics:** Track shipping method preferences and costs

## Future Enhancements
- **International Shipping:** Enhanced customs and duty handling
- **Insurance Options:** Shipping insurance integration
- **Delivery Confirmation:** Signature and photo confirmation
- **Advanced Tracking:** Real-time delivery updates
- **Cost Optimization:** AI-powered carrier selection
- **White Label:** Custom branded shipping labels
