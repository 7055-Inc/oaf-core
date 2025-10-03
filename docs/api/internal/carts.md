# Carts - Internal Documentation

## Overview
Comprehensive shopping cart management system supporting multi-site architecture, guest users, authenticated users, and advanced cart organization features. This system implements the "Multi-Cart Revolution" approach, allowing users to maintain separate carts per site while providing unified management.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - jsonwebtoken for token verification
- **Database Tables:** 
  - `carts` - Main cart storage with site tracking
  - `cart_items` - Individual items within carts
  - `cart_collections` - User-defined cart organization
  - `saved_items` - Wishlist/saved for later functionality
  - `products` - Product information (joined)
  - `users` - User information (joined)
  - `user_profiles` - Extended user profiles (joined)
- **External APIs:** None directly (integrates with internal product/user systems)

## Functions/Endpoints

### Cart Collections Management
#### GET /collections
- **Purpose:** Retrieve all cart collections for authenticated user
- **Parameters:** None (user ID from JWT token)
- **Returns:** Array of cart collection objects
- **Errors:** 401 if not authenticated
- **Usage Example:** Used for organizing carts into named collections

#### POST /collections
- **Purpose:** Create new cart collection
- **Parameters:** `name` (string), `description` (string), `is_public` (boolean)
- **Returns:** Success confirmation
- **Errors:** 400 for validation errors, 401 if not authenticated
- **Usage Example:** Creating themed collections like "Holiday Shopping" or "Work Supplies"

#### PUT /collections/:id
- **Purpose:** Update existing cart collection
- **Parameters:** Collection ID in URL, updated fields in body
- **Returns:** Success confirmation
- **Errors:** 404 if collection not found, 401 if not owner
- **Usage Example:** Renaming collections or changing privacy settings

#### DELETE /collections/:id
- **Purpose:** Remove cart collection
- **Parameters:** Collection ID in URL
- **Returns:** Success confirmation
- **Errors:** 404 if collection not found, 401 if not owner
- **Usage Example:** Cleaning up unused collections

### Core Cart Management
#### GET /
- **Purpose:** Get all carts for authenticated user
- **Parameters:** None (user ID from JWT token)
- **Returns:** Array of cart objects
- **Errors:** 401 if not authenticated
- **Usage Example:** Dashboard cart listing

#### GET /unified
- **Purpose:** Comprehensive cart view with items, totals, and site grouping
- **Parameters:** None (user ID from JWT token)
- **Returns:** Complex object with grouped carts, totals, and statistics
- **Errors:** 401 if not authenticated, 500 for database errors
- **Usage Example:** Main cart page showing all user's carts organized by source site

#### POST /
- **Purpose:** Create new cart (supports guest and authenticated users)
- **Parameters:** `guest_token`, `status`, `source_site_api_key`, `source_site_name`
- **Returns:** Created cart object with ID
- **Errors:** 400 for missing required fields, 500 for database errors
- **Usage Example:** Initializing cart when user starts shopping

#### PUT /:id
- **Purpose:** Update cart status (draft, active, completed, etc.)
- **Parameters:** Cart ID in URL, `status` in body
- **Returns:** Success confirmation
- **Errors:** 404 if cart not found, 401 if not owner
- **Usage Example:** Moving cart from draft to checkout status

#### DELETE /:id
- **Purpose:** Remove cart entirely
- **Parameters:** Cart ID in URL
- **Returns:** Success confirmation
- **Errors:** 404 if cart not found, 401 if not owner
- **Usage Example:** Cleaning up abandoned carts

### Cart Items Management
#### GET /:cartId/items
- **Purpose:** Retrieve all items in specific cart
- **Parameters:** Cart ID in URL
- **Returns:** Array of cart item objects
- **Errors:** 401 if not authenticated, 404 if cart not found
- **Usage Example:** Displaying cart contents

#### POST /:cartId/items
- **Purpose:** Add item to specific cart
- **Parameters:** Cart ID in URL, `product_id`, `vendor_id`, `quantity`, `price` in body
- **Returns:** Success confirmation
- **Errors:** 400 for validation errors, 401 if not owner
- **Usage Example:** Adding products to existing cart

#### PUT /:cartId/items/:itemId
- **Purpose:** Update cart item quantity and price
- **Parameters:** Cart ID and item ID in URL, `quantity`, `price` in body
- **Returns:** Success confirmation
- **Errors:** 404 if item not found, 401 if not owner
- **Usage Example:** Adjusting quantities in cart

#### DELETE /:cartId/items/:itemId
- **Purpose:** Remove item from cart
- **Parameters:** Cart ID and item ID in URL
- **Returns:** Success confirmation
- **Errors:** 404 if item not found, 401 if not owner
- **Usage Example:** Removing unwanted items

### Saved Items (Wishlist)
#### GET /saved
- **Purpose:** Retrieve user's saved items (wishlist)
- **Parameters:** None (user ID from JWT token)
- **Returns:** Array of saved item objects
- **Errors:** 401 if not authenticated
- **Usage Example:** Wishlist page display

#### POST /saved
- **Purpose:** Save item for later purchase
- **Parameters:** `product_id`, `quantity`, `notes`, `collection_name`
- **Returns:** Success confirmation
- **Errors:** 400 for validation errors, 401 if not authenticated
- **Usage Example:** "Save for Later" functionality

#### PUT /saved/:id
- **Purpose:** Update saved item details
- **Parameters:** Saved item ID in URL, updated fields in body
- **Returns:** Success confirmation
- **Errors:** 404 if item not found, 401 if not owner
- **Usage Example:** Updating wishlist item notes or quantities

#### DELETE /saved/:id
- **Purpose:** Remove item from saved items
- **Parameters:** Saved item ID in URL
- **Returns:** Success confirmation
- **Errors:** 404 if item not found, 401 if not owner
- **Usage Example:** Cleaning up wishlist

### Enhanced Cart Operations
#### POST /add
- **Purpose:** Intelligent add-to-cart with multi-site support
- **Parameters:** `product_id`, `vendor_id`, `quantity`, `price`, `guest_token`, `source_site_api_key`, `source_site_name`
- **Returns:** Cart information with added item details
- **Errors:** 400 for missing required fields, 500 for database errors
- **Usage Example:** Universal add-to-cart from any site in the network

## Environment Variables
- `JWT_SECRET`: Secret key for JWT token verification
- No domain-specific environment variables needed for this module

## Security Considerations
- **Authentication:** JWT token verification for user-specific operations
- **Authorization:** Users can only access their own carts and items
- **Guest Support:** Secure guest token system for unauthenticated users
- **Input Validation:** All user inputs should be validated before database operations
- **Rate Limiting:** Should be applied at the route level for cart operations
- **SQL Injection Protection:** Uses parameterized queries throughout

## Multi-Site Architecture
- **Site Tracking:** Each cart tracks its originating site via API key
- **Site Isolation:** Carts are grouped by source site for better UX
- **Cross-Site Support:** Users can have multiple carts from different sites
- **Guest Continuity:** Guest carts are maintained across site visits

## Testing
- **Unit Tests:** Should cover all CRUD operations for carts, items, and collections
- **Integration Tests:** Test multi-site cart creation and management
- **Performance Tests:** Cart retrieval with large numbers of items
- **Security Tests:** Verify user isolation and guest token security

## Performance Considerations
- **Database Indexing:** Ensure indexes on user_id, guest_token, and cart_id fields
- **Query Optimization:** The unified cart query joins multiple tables and should be monitored
- **Caching Strategy:** Consider caching frequently accessed cart data
- **Pagination:** Large cart lists should implement pagination

## Future Enhancements
- **Cart Sharing:** Allow users to share carts with others
- **Cart Templates:** Save cart configurations as reusable templates
- **Inventory Integration:** Real-time inventory checking during cart operations
- **Price Monitoring:** Track price changes for saved items
- **Cart Analytics:** Track cart abandonment and conversion metrics
