-- Migration 049: Add all connector marketplace sources to orders.marketplace_source
--
-- The orders table only had oaf/tiktok/etsy/amazon. All active connectors need to
-- be represented so that internal-marketplace-sync can merge their orders into the
-- main order flow where vendors see them in MySales and add tracking.

ALTER TABLE orders
  MODIFY COLUMN marketplace_source
    ENUM('oaf','tiktok','etsy','amazon','walmart','shopify','ebay','faire','wayfair','meta')
    DEFAULT 'oaf';
