/**
 * Commerce Services Index
 */

const ordersService = require('./orders');
const returnsService = require('./returns');
const salesService = require('./sales');
const shippingService = require('./shipping');
const checkoutService = require('./checkout');

module.exports = {
  orders: ordersService,
  returns: returnsService,
  sales: salesService,
  shipping: shippingService,
  checkout: checkoutService,
};
