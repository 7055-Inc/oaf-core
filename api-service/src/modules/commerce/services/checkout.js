/**
 * Checkout Service
 * Handles cart calculations, order creation, shipping, and payment processing helpers.
 * Migrated from legacy api-service/src/routes/checkout.js
 */

const db = require('../../../../config/db');
const shippingService = require('../../../services/shippingService');
const EmailService = require('../../../services/emailService');

const emailService = new EmailService();

/**
 * Resolve the correct wholesale price based on quantity and volume tiers.
 * Returns base wholesale_price if no tiers match, or the best tier price.
 */
function resolveWholesalePrice(wholesalePrice, quantity, tiersJson) {
  let price = parseFloat(wholesalePrice);
  let tierLabel = 'Single Item';

  if (!tiersJson) return { price, tierLabel };

  let tiers;
  try {
    tiers = typeof tiersJson === 'string' ? JSON.parse(tiersJson) : tiersJson;
  } catch {
    return { price, tierLabel };
  }

  if (!Array.isArray(tiers) || tiers.length === 0) return { price, tierLabel };

  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  for (const tier of sorted) {
    if (quantity >= tier.min_qty && tier.price != null) {
      price = parseFloat(tier.price);
      tierLabel = tier.label || `${tier.min_qty}+`;
    }
  }

  return { price, tierLabel };
}

async function getCartItemsWithDetails(cartItems, isWholesale = false) {
  const productIds = cartItems.map(item => item.product_id);

  const query = `
    SELECT 
      p.id,
      p.name as title,
      p.price,
      p.wholesale_price,
      p.wholesale_pricing_tiers,
      p.wholesale_moq,
      p.vendor_id,
      u.username as vendor_name,
      ps.ship_method,
      ps.ship_rate,
      ps.shipping_services
    FROM products p
    LEFT JOIN users u ON p.vendor_id = u.id
    LEFT JOIN product_shipping ps ON p.id = ps.product_id AND ps.package_number = 1
    WHERE p.id IN (${productIds.map(() => '?').join(',')})
  `;

  const [products] = await db.execute(query, productIds);

  return cartItems.map(cartItem => {
    const product = products.find(p => p.id === cartItem.product_id);
    if (!product) {
      throw new Error(`Product ${cartItem.product_id} not found`);
    }

    let unitPrice = parseFloat(product.price);
    let priceType = 'retail';
    let tierLabel = null;

    if (isWholesale && product.wholesale_price) {
      const resolved = resolveWholesalePrice(
        product.wholesale_price,
        cartItem.quantity,
        product.wholesale_pricing_tiers
      );
      unitPrice = resolved.price;
      priceType = 'wholesale';
      tierLabel = resolved.tierLabel;
    }

    return {
      product_id: product.id,
      vendor_id: product.vendor_id,
      vendor_name: product.vendor_name,
      title: product.title,
      quantity: cartItem.quantity,
      unit_price: unitPrice,
      price: unitPrice * cartItem.quantity,
      price_type: priceType,
      tier_label: tierLabel,
      wholesale_moq: product.wholesale_moq,
      shipping_cost: 0,
      ship_method: product.ship_method || 'free'
    };
  });
}

async function calculateShippingCosts(items, shippingAddress) {
  const itemsWithShipping = [];

  for (const item of items) {
    let shippingCost = 0;
    let shippingOptions = [];

    if (item.ship_method === 'free') {
      shippingCost = 0;
      shippingOptions = [{ service: 'Free Shipping', cost: 0 }];
    } else if (item.ship_method === 'flat_rate') {
      const [shippingData] = await db.execute(`
        SELECT ship_rate, shipping_services FROM product_shipping 
        WHERE product_id = ? AND package_number = 1
      `, [item.product_id]);

      if (shippingData.length > 0 && shippingData[0].ship_rate) {
        shippingCost = parseFloat(shippingData[0].ship_rate) * item.quantity;
        shippingOptions = [{ service: 'Flat Rate', cost: shippingCost }];
      }
    } else if (item.ship_method === 'calculated' && shippingAddress) {
      try {
        const [productShipping] = await db.execute(`
          SELECT ps.*, p.vendor_id
          FROM product_shipping ps
          JOIN products p ON ps.product_id = p.id
          WHERE ps.product_id = ?
          ORDER BY ps.package_number ASC
        `, [item.product_id]);

        if (productShipping.length > 0) {
          const companyAddress = await shippingService.getCompanyAddress();

          const shipment = {
            shipper: {
              name: companyAddress.name,
              accountNumber: '',
              address: companyAddress
            },
            recipient: {
              name: shippingAddress.name || 'Customer',
              address: shippingAddress
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

          let rates = await shippingService.calculateShippingRates(shipment);

          const allowedServices = productShipping[0].shipping_services ? JSON.parse(productShipping[0].shipping_services) : null;
          if (allowedServices && allowedServices.length > 0) {
            rates = rates.filter(rate => allowedServices.includes(rate.service));
          }

          shippingOptions = rates.map(rate => ({
            service: rate.service,
            cost: rate.cost
          }));

          if (rates.length > 0) {
            shippingCost = Math.min(...rates.map(r => r.cost)) * item.quantity;
          }
        }
      } catch (error) {
        console.error(`Error calculating shipping for product ${item.product_id}:`, error);
        shippingCost = 0;
        shippingOptions = [];
      }
    }

    itemsWithShipping.push({
      ...item,
      shipping_cost: shippingCost,
      shipping_options: shippingOptions
    });
  }

  return itemsWithShipping;
}

function groupItemsByVendor(items) {
  const groups = {};

  items.forEach(item => {
    if (!groups[item.vendor_id]) {
      groups[item.vendor_id] = {
        vendor_id: item.vendor_id,
        vendor_name: item.vendor_name,
        items: [],
        subtotal: 0,
        shipping_total: 0,
        commission_total: 0
      };
    }

    groups[item.vendor_id].items.push(item);
    groups[item.vendor_id].subtotal += item.price;
    groups[item.vendor_id].shipping_total += item.shipping_cost;
    groups[item.vendor_id].commission_total += item.commission_amount;
  });

  return Object.values(groups);
}

function calculateOrderTotals(items) {
  const totals = {
    subtotal: 0,
    shipping_total: 0,
    tax_total: 0,
    platform_fee_total: 0,
    total_amount: 0,
    vendor_count: new Set(items.map(item => item.vendor_id)).size
  };

  items.forEach(item => {
    totals.subtotal += item.price;
    totals.shipping_total += item.shipping_cost;
    totals.platform_fee_total += item.commission_amount;
  });

  totals.total_amount = totals.subtotal + totals.shipping_total + totals.tax_total;

  return totals;
}

async function createOrder(userId, totals, items) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, total_amount, shipping_amount, tax_amount, platform_fee_amount, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, totals.total_amount, totals.shipping_total, totals.tax_total, totals.platform_fee_total]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items 
         (order_id, product_id, vendor_id, quantity, price, price_type, shipping_cost, commission_rate, commission_amount, selected_shipping_service, shipping_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.vendor_id, item.quantity, item.price,
         item.price_type || 'retail',
         item.shipping_cost || 0, item.commission_rate || 15.00, item.commission_amount || 0,
         item.selected_shipping_service || null, item.selected_shipping_rate || item.shipping_cost]
      );
    }

    await connection.commit();
    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrderById(orderId) {
  const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  return rows[0] || null;
}

async function updateOrderPaymentIntent(orderId, paymentIntentId) {
  return db.execute(
    `UPDATE orders SET stripe_payment_intent_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [paymentIntentId, orderId]
  );
}

async function clearUserCart(userId) {
  return db.execute('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)', [userId]);
}

async function sendOrderConfirmationEmails(orderId, userId) {
  try {
    const [orderData] = await db.execute(`
      SELECT 
        o.id as order_id, o.total_amount, o.shipping_amount, o.tax_amount, o.platform_fee_amount, o.created_at,
        u.username as buyer_email, COALESCE(up.first_name, u.username) as buyer_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE o.id = ?
    `, [orderId]);

    if (orderData.length === 0) throw new Error('Order not found');
    const order = orderData[0];

    const [items] = await db.execute(`
      SELECT 
        oi.product_id, oi.vendor_id, oi.quantity, oi.price, oi.shipping_cost, oi.commission_amount,
        p.name as product_name, u.username as vendor_email, COALESCE(up.first_name, u.username) as vendor_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON oi.vendor_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE oi.order_id = ?
    `, [orderId]);

    const invoiceItemsHtml = items.map(item => {
      const lineTotal = parseFloat(item.price) * item.quantity;
      return `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${item.product_name}</td>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">$${parseFloat(item.price).toFixed(2)}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">$${lineTotal.toFixed(2)}</td>
    </tr>`;
    }).join('');

    const buyerTemplateData = {
      buyer_name: order.buyer_name,
      order_number: order.order_id,
      order_date: new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      invoice_items_html: invoiceItemsHtml,
      item_count: items.length,
      subtotal: (parseFloat(order.total_amount) - parseFloat(order.shipping_amount) - parseFloat(order.tax_amount || 0) - parseFloat(order.platform_fee_amount || 0)).toFixed(2),
      shipping_amount: parseFloat(order.shipping_amount).toFixed(2),
      tax_amount: parseFloat(order.tax_amount || 0).toFixed(2),
      total_amount: parseFloat(order.total_amount).toFixed(2),
      order_url: `${process.env.FRONTEND_URL || 'https://brakebee.com'}/dashboard?tab=orders`,
      support_email: 'marketplace@brakebee.com'
    };

    await emailService.queueEmail(userId, 'order_confirmation', buyerTemplateData, { priority: 2 });
    console.log(`Order confirmation email queued for buyer (user ${userId})`);

    const vendorGroups = {};
    items.forEach(item => {
      if (!vendorGroups[item.vendor_id]) {
        vendorGroups[item.vendor_id] = { vendor_id: item.vendor_id, vendor_email: item.vendor_email, vendor_name: item.vendor_name, items: [] };
      }
      vendorGroups[item.vendor_id].items.push(item);
    });

    for (const vendorId in vendorGroups) {
      const vendor = vendorGroups[vendorId];
      const vendorTotal = vendor.items.reduce((sum, item) =>
        sum + (parseFloat(item.price) * item.quantity - parseFloat(item.commission_amount)), 0
      );

      const vendorItemList = vendor.items.map(item =>
        `${item.product_name} - Qty: ${item.quantity} @ $${parseFloat(item.price).toFixed(2)} each`
      ).join('<br>');

      const vendorTemplateData = {
        vendor_name: vendor.vendor_name,
        order_id: order.order_id,
        order_date: new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        buyer_name: order.buyer_name,
        items: vendorItemList,
        item_count: vendor.items.length,
        vendor_earnings: vendorTotal.toFixed(2),
        orders_url: `${process.env.FRONTEND_URL || 'https://brakebee.com'}/dashboard?tab=manage-store`,
        support_email: 'marketplace@brakebee.com'
      };

      await emailService.queueEmail(parseInt(vendorId), 'vendor_order_notification', vendorTemplateData, { priority: 3 });
      console.log(`Vendor notification email queued for vendor ${vendorId}`);
    }
  } catch (error) {
    console.error('Error sending order confirmation emails:', error);
    throw error;
  }
}

/**
 * Validate wholesale requirements: per-product MOQ and per-vendor cart minimums.
 * Returns { valid: boolean, errors: Array<{ type, message, vendor_id?, product_id? }> }
 */
async function validateWholesaleRequirements(items, isWholesale) {
  if (!isWholesale) return { valid: true, errors: [] };

  const errors = [];

  // Per-product MOQ check
  for (const item of items) {
    if (item.wholesale_moq && item.quantity < item.wholesale_moq) {
      errors.push({
        type: 'moq',
        product_id: item.product_id,
        message: `"${item.title}" requires a minimum order of ${item.wholesale_moq} units for wholesale (you have ${item.quantity}).`
      });
    }
  }

  // Per-vendor wholesale cart minimum check
  const vendorGroups = {};
  for (const item of items) {
    if (!vendorGroups[item.vendor_id]) {
      vendorGroups[item.vendor_id] = { vendor_name: item.vendor_name, subtotal: 0 };
    }
    vendorGroups[item.vendor_id].subtotal += item.price;
  }

  const vendorIds = Object.keys(vendorGroups);
  if (vendorIds.length > 0) {
    const [vendorSettings] = await db.execute(
      `SELECT vendor_id, vendor_wholesale_cart_minimum 
       FROM vendor_settings 
       WHERE vendor_id IN (${vendorIds.map(() => '?').join(',')}) 
         AND vendor_wholesale_cart_minimum IS NOT NULL`,
      vendorIds.map(id => parseInt(id))
    );

    for (const vs of vendorSettings) {
      const minimum = parseFloat(vs.vendor_wholesale_cart_minimum);
      const group = vendorGroups[vs.vendor_id];
      if (group && group.subtotal < minimum) {
        const shortfall = (minimum - group.subtotal).toFixed(2);
        errors.push({
          type: 'vendor_minimum',
          vendor_id: vs.vendor_id,
          message: `Add $${shortfall} more from ${group.vendor_name} to meet their $${minimum.toFixed(2)} wholesale order minimum.`
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  resolveWholesalePrice,
  getCartItemsWithDetails,
  calculateShippingCosts,
  groupItemsByVendor,
  calculateOrderTotals,
  createOrder,
  getOrderById,
  updateOrderPaymentIntent,
  clearUserCart,
  sendOrderConfirmationEmails,
  validateWholesaleRequirements
};
