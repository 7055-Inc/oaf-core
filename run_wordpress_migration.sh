#!/bin/bash
# Complete WordPress User Migration
# Runs data preparation and SQL migration in sequence
# Date: 2025-11-05

set -e  # Exit on error

echo "========================================"
echo "WORDPRESS TO OAF USER MIGRATION"
echo "========================================"
echo ""

# Step 1: Prepare artist profile data (create clean lookup table)
echo "Step 1: Preparing artist profile data..."
cd /var/www/main
node prepare_artist_data_v2.js
echo ""

# Step 2: Prepare order items data (create clean lookup table)
echo "Step 2: Preparing order items data..."
node prepare_order_items.js
echo ""

# Step 3: Run SQL migration (users + profiles + orders + events + transactions)
echo "Step 3: Running SQL migration..."
mysql -h 10.128.0.31 -u oafuser -poafpass oaf < /var/www/main/migrate_wordpress_users.sql
echo ""

# Step 4: Import artist profile and header images
echo "Step 4: Importing artist images..."
node import_artist_images.js
echo ""

# Step 5: Import product inventory quantities
echo "Step 5: Importing product inventory..."
mysql -h 10.128.0.31 -u oafuser -poafpass oaf < /var/www/main/import_product_inventory.sql
echo ""

# Step 6: Import product images
echo "Step 6: Importing product images..."
node import_product_images.js
echo ""

# Step 7: Import product variations (variation types, values, and links)
echo "Step 7: Importing product variations..."
node import_product_variations.js
echo ""

echo "========================================"
echo "MIGRATION COMPLETE"
echo "========================================"

