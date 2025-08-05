const express = require('express');
const router = express.Router();
const shippingService = require('../services/shippingService');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');

/**
 * Calculate shipping rates for a product
 * POST /api/shipping/calculate-rates
 */
router.post('/calculate-rates', verifyToken, async (req, res) => {
  try {
    const { product_id, recipient_address } = req.body;
    
    if (!product_id || !recipient_address) {
      return res.status(400).json({ error: 'Product ID and recipient address are required' });
    }

    // Get product shipping details
    const [productShipping] = await db.execute(`
      SELECT ps.*, p.name as product_name, p.vendor_id
      FROM product_shipping ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.product_id = ?
      ORDER BY ps.package_number ASC
    `, [product_id]);

    if (!productShipping.length) {
      return res.status(404).json({ error: 'Product shipping configuration not found' });
    }

    // Check if this is calculated shipping
    if (productShipping[0].ship_method !== 'calculated') {
      return res.status(400).json({ error: 'This product does not use calculated shipping' });
    }

    // Get vendor's actual address for accurate rate calculation
    const vendorAddress = await shippingService.getVendorAddress(productShipping[0].vendor_id);
    
    // Build shipment object
    const shipment = {
      shipper: {
        name: vendorAddress.name,
        address: vendorAddress
      },
      recipient: {
        name: recipient_address.name || 'Customer',
        address: recipient_address
      },
      packages: productShipping.map(ps => ({
        length: ps.length,
        width: ps.width,
        height: ps.height,
        weight: ps.weight,
        dimension_unit: ps.dimension_unit,
        weight_unit: ps.weight_unit
      }))
    };

    // Calculate shipping rates
    const rates = await shippingService.calculateShippingRates(shipment);
    
    res.json({
      success: true,
      product_id: product_id,
      rates: rates
    });

  } catch (error) {
    console.error('Error calculating shipping rates:', error);
    res.status(500).json({ error: 'Failed to calculate shipping rates' });
  }
});

/**
 * Calculate shipping rates for multiple products (cart/checkout)
 * POST /api/shipping/calculate-cart-shipping
 */
router.post('/calculate-cart-shipping', verifyToken, async (req, res) => {
  try {
    const { cart_items, recipient_address, test_packages } = req.body;
    
    if (!cart_items || !Array.isArray(cart_items) || !recipient_address) {
      return res.status(400).json({ error: 'Cart items and recipient address are required' });
    }

    const shippingResults = [];
    
    // Process each unique product
    const uniqueProductIds = [...new Set(cart_items.map(item => item.product_id))];
    
    for (const productId of uniqueProductIds) {
      try {
        let productShipping = [];
        let shippingInfo = null;

        // Handle test packages for rate estimation
        if (productId === 'test' && test_packages) {
          // Create mock shipping data for test packages
          productShipping = test_packages.map((pkg, index) => ({
            product_id: 'test',
            package_number: index + 1,
            ship_method: 'calculated',
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            weight: pkg.weight,
            dimension_unit: pkg.dimension_unit,
            weight_unit: pkg.weight_unit,
            name: 'Test Product',
            vendor_id: 1
          }));
          shippingInfo = productShipping[0];
        } else {
          // Get product shipping details from database
          const [dbShipping] = await db.execute(`
            SELECT ps.*, p.name as product_name, p.vendor_id
            FROM product_shipping ps
            JOIN products p ON ps.product_id = p.id
            WHERE ps.product_id = ?
            ORDER BY ps.package_number ASC
          `, [productId]);
          productShipping = dbShipping;
          shippingInfo = productShipping[0];
        }

        if (!productShipping.length) {
          shippingResults.push({
            product_id: productId,
            ship_method: 'free',
            cost: 0,
            error: 'No shipping configuration found'
          });
          continue;
        }
        
        if (shippingInfo.ship_method === 'free') {
          shippingResults.push({
            product_id: productId,
            ship_method: 'free',
            cost: 0
          });
        } else if (shippingInfo.ship_method === 'flat_rate') {
          const quantity = cart_items
            .filter(item => item.product_id === productId)
            .reduce((sum, item) => sum + item.quantity, 0);
          
          shippingResults.push({
            product_id: productId,
            ship_method: 'flat_rate',
            cost: parseFloat(shippingInfo.ship_rate) * quantity
          });
        } else if (shippingInfo.ship_method === 'calculated') {
          // Get vendor's actual address for accurate rate calculation
          const vendorAddress = await shippingService.getVendorAddress(productShipping[0].vendor_id);
          
          // Build shipment object
          const shipment = {
            shipper: {
              name: vendorAddress.name,
              address: vendorAddress
            },
            recipient: {
              name: recipient_address.name || 'Customer',
              address: recipient_address
            },
            packages: productShipping.map(ps => ({
              length: parseFloat(ps.length),
              width: parseFloat(ps.width),
              height: parseFloat(ps.height),
              weight: parseFloat(ps.weight),
              dimension_unit: ps.dimension_unit,
              weight_unit: ps.weight_unit
            }))
          };

          // Calculate shipping rates
          const rates = await shippingService.calculateShippingRates(shipment);
          
          // Use the cheapest rate for cost, but return all rates for selection
          const cheapestRate = rates.length > 0 ? rates[0] : null;
          
          shippingResults.push({
            product_id: productId,
            ship_method: 'calculated',
            cost: cheapestRate ? cheapestRate.cost : 0,
            available_rates: rates,
            selected_rate: cheapestRate
          });
        }
      } catch (error) {
        console.error(`Error calculating shipping for product ${productId}:`, error);
        shippingResults.push({
          product_id: productId,
          ship_method: 'free',
          cost: 0,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      shipping_results: shippingResults,
      total_shipping: shippingResults.reduce((sum, result) => sum + result.cost, 0)
    });

  } catch (error) {
    console.error('Error calculating cart shipping:', error);
    res.status(500).json({ error: 'Failed to calculate cart shipping' });
  }
});

/**
 * Get available shipping services for a product
 * GET /api/shipping/services/:product_id
 */
router.get('/services/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;
    
    // Get product shipping configuration
    const [productShipping] = await db.execute(`
      SELECT ps.*, p.name as product_name
      FROM product_shipping ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.product_id = ? AND ps.package_number = 1
    `, [product_id]);

    if (!productShipping.length) {
      return res.status(404).json({ error: 'Product shipping configuration not found' });
    }

    const shipping = productShipping[0];
    
    let services = [];
    
    if (shipping.ship_method === 'free') {
      services = [{
        name: 'Free Shipping',
        cost: 0,
        estimated_delivery: '5-7 business days'
      }];
    } else if (shipping.ship_method === 'flat_rate') {
      services = [{
        name: 'Standard Shipping',
        cost: parseFloat(shipping.ship_rate),
        estimated_delivery: '3-5 business days'
      }];
    } else if (shipping.ship_method === 'calculated') {
      // For calculated shipping, we'd need a destination to provide accurate rates
      services = [{
        name: 'Calculated Shipping',
        cost: 'Varies by destination',
        estimated_delivery: 'Varies by service'
      }];
    }

    res.json({
      success: true,
      product_id: product_id,
      ship_method: shipping.ship_method,
      services: services,
      shipping_services_text: shipping.shipping_services
    });

  } catch (error) {
    console.error('Error getting shipping services:', error);
    res.status(500).json({ error: 'Failed to get shipping services' });
  }
});

module.exports = router; 