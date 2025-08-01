# WordPress to OAF Product Field Mapping Analysis

## Overview
This document provides a comprehensive analysis of field mapping between WordPress/WooCommerce product data and the new OAF (Online Art Festival) product system.

## ✅ MAPPED FIELDS (We Have These)

| **WordPress Field** | **OAF Field** | **Status** | **Notes** |
|-------------------|---------------|------------|-----------|
| `post_title` | `products.name` | ✅ Perfect | Direct mapping |
| `post_content` | `products.description` | ✅ Perfect | Full description |
| `_price` / `_regular_price` | `products.price` | ✅ Perfect | Price handling |
| `_weight` | `products.weight` | ✅ Perfect | Weight in lbs |
| `_length` | `products.depth` | ✅ Good | Dimension mapping |
| `_width` | `products.width` | ✅ Good | Dimension mapping |
| `_height` | `products.height` | ✅ Good | Dimension mapping |
| `_stock` | `product_inventory.qty_on_hand` | ✅ Perfect | Stock levels |
| `_stock_status` | `products.status` | ✅ Good | Status mapping |
| `_thumbnail_id` | `product_images.is_primary` | ✅ Perfect | Primary image |
| `_product_image_gallery` | `product_images` (multiple) | ✅ Perfect | Image gallery |
| `post_author` | `products.vendor_id` | ✅ Perfect | Vendor assignment |

## ❌ MISSING FIELDS (We Don't Have These)

| **WordPress Field** | **What It Is** | **OAF Status** | **Impact** |
|-------------------|----------------|----------------|------------|
| `_virtual` | Digital/downloadable product | ⏭️ Ignore | Not needed for art festival |
| `_downloadable` | Downloadable files | ⏭️ Ignore | Not needed for art festival |
| `_download_limit` | Download restrictions | ⏭️ Ignore | Not needed for art festival |
| `_download_expiry` | Download expiration | ⏭️ Ignore | Not needed for art festival |
| `_tax_class` | Tax classification | ❌ Missing | No tax handling |
| `_tax_status` | Tax status (taxable/exempt) | ❌ Missing | No tax rules |
| `_backorders` | Allow backorders | ❌ Missing | No backorder support |
| `_sold_individually` | Limit to 1 per order | ❌ Missing | No quantity limits |
| `_purchase_note` | Order notes | ❌ Missing | No purchase notes |
| `_featured` | Featured product flag | ❌ Missing | No featured products |
| `_catalog_visibility` | Catalog visibility | ❌ Missing | No visibility control |
| `_upsell_ids` | Upsell products | ❌ Missing | No product recommendations |
| `_crosssell_ids` | Cross-sell products | ❌ Missing | No cross-selling |
| `_product_attributes` | Product variations | ❌ Missing | No variation system |
| `_sale_price` | Sale price | ❌ Missing | No sale pricing |
| `_manage_stock` | Stock management | ❌ Missing | No stock control |
| `_subscription_price` | Subscription pricing | ❌ Missing | No subscriptions |
| `_disable_shipping` | Shipping disabled | ❌ Missing | No shipping control |

## 🔄 ASSOCIATED TABLES (WordPress Has These)

| **WordPress Table** | **Purpose** | **OAF Equivalent** | **Status** |
|-------------------|-------------|-------------------|------------|
| `wp_wc_product_meta_lookup` | Product metadata index | ❌ Missing | No metadata lookup |
| `wp_wc_product_attributes_lookup` | Attribute indexing | ❌ Missing | No attribute system |
| `wp_term_relationships` | Categories/tags | `product_categories` | ✅ Partial |
| `wp_term_taxonomy` | Taxonomy definitions | ❌ Missing | No taxonomy system |
| `wp_terms` | Category/tag names | `categories` | ✅ Partial |
| `wp_woocommerce_downloadable_product_permissions` | Download permissions | ❌ Missing | No downloads |

## 📊 CATEGORY SYSTEM

### WordPress Structure:
- `wp_terms` → Category names
- `wp_term_taxonomy` → Category definitions  
- `wp_term_relationships` → Product → Category links

### OAF Structure:
- `categories` → Category names
- `product_categories` → Product → Category links

**Status:** ✅ Partially compatible, but OAF is simpler

## 🎨 ATTRIBUTE SYSTEM

### WordPress Structure:
- `_product_attributes` (serialized) → Color, size, etc.
- `wp_wc_product_attributes_lookup` → Indexed attributes
- `pa_color`, `pa_size` → Attribute taxonomies

### OAF Structure:
- `product_variations` → Links to `user_variation_types` and `user_variation_values`
- `user_variation_types` → Attribute types (Color, Size)
- `user_variation_values` → Attribute values (Red, Large)

**Status:** ✅ Compatible but different structure

## 💰 PRICING SYSTEM

### WordPress Structure:
- `_price` → Current price
- `_regular_price` → Regular price
- `_sale_price` → Sale price
- `_subscription_price` → Subscription price

### OAF Structure:
- `products.price` → Single price field

**Status:** ❌ Missing sale pricing, subscription pricing

## 📦 INVENTORY SYSTEM

### WordPress Structure:
- `_stock` → Stock quantity
- `_stock_status` → instock/outofstock
- `_manage_stock` → Enable stock management
- `_backorders` → Allow backorders

### OAF Structure:
- `product_inventory.qty_on_hand` → Stock quantity
- `product_inventory.qty_on_order` → On-order quantity
- `product_inventory.qty_available` → Calculated available

**Status:** ✅ Good compatibility, missing backorders

## 🚚 SHIPPING SYSTEM

### WordPress Structure:
- `_weight`, `_length`, `_width`, `_height` → Dimensions
- `_disable_shipping` → Shipping disabled
- `_overwrite_shipping` → Custom shipping

### OAF Structure:
- `product_shipping` → Package dimensions and rates
- `product_shipping.ship_method` → Shipping method

**Status:** ✅ Good compatibility

## 🖼️ IMAGE SYSTEM

### WordPress Structure:
- `_thumbnail_id` → Primary product image
- `_product_image_gallery` → Additional product images
- Images stored in `wp_posts` with `post_type = 'attachment'`
- URLs: `https://onlineartfestival.com/wp-content/uploads/...`

### OAF Structure:
- `product_images.image_url` → Image URL
- `product_images.is_primary` → Primary image flag
- `product_images.order` → Image ordering
- `product_images.category` → Image category (product, lifestyle, etc.)

**Status:** ✅ Perfect compatibility with direct URL mapping

## 📋 MIGRATION STRATEGY

### Phase 1: Core Product Data (✅ Ready)
- Basic product information (name, description, price)
- Dimensions and weight
- Stock levels
- Images (direct URL references)
- Categories (basic mapping)
- Shipping information

### Phase 2: Advanced Features (❌ Need Development)
- Product variations (attributes → OAF variation system)
- Tax handling (tax classes and status)
- Digital product support
- Sale pricing system
- Product recommendations (upsells/cross-sells)
- Featured products
- Purchase notes

### Phase 3: Image Processing (🔄 Optional)
- Download images from WordPress URLs
- Process through OAF's temp storage system
- Generate smart serve URLs
- Update database with new URLs

## 🎯 SUMMARY

### ✅ What We Have (Good Mapping):
- Basic product info (name, description, price)
- Dimensions and weight
- Stock levels
- Images
- Categories (basic)
- Shipping info

### ❌ What We're Missing (Major Gaps):
- **Digital products** (downloadable files)
- **Tax system** (tax classes, status)
- **Sale pricing** (regular vs sale prices)
- **Product variations** (color, size, etc.)
- **Advanced inventory** (backorders, stock management)
- **Product relationships** (upsells, cross-sells)
- **Featured products**
- **Purchase notes**
- **Subscription pricing**

### 🔄 What Needs Custom Development:
- **Variation system** (WordPress attributes → OAF variations)
- **Tax handling** (tax classes and status)
- **Digital product support**
- **Sale pricing system**
- **Product recommendations**

## 📝 NOTES

- **Core Compatibility:** The essential product data maps very well between systems
- **Advanced Features:** WordPress has many e-commerce features not present in OAF
- **Migration Priority:** Focus on core product data first, then evaluate which advanced features are needed
- **Image Strategy:** Start with direct URL references, then optionally download and process through OAF's system
- **Custom Development:** Several WordPress features will require custom development in OAF

---

*Last Updated: January 27, 2025*
*Analysis Based On: WordPress Import Database & OAF Schema* 