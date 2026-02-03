/**
 * Commerce Module - Frontend API
 */

export {
  // Orders (customer)
  fetchMyOrders,
  fetchOrder,
  // Orders (admin)
  fetchAdminOrders,
  // Returns (customer)
  fetchMyReturns,
  createReturn,
  addReturnMessage,
  getReturnLabelUrl,
  // Sales (vendor)
  fetchVendorSales,
  fetchVendorStats,
  fetchOrderItemDetails,
  markItemShipped,
  updateItemTracking,
  // Shipping (sub-module)
  fetchShippingRates,
  fetchShippingLabels,
  purchaseShippingLabel,
  cancelShippingLabel,
  getShippingLabelUrl,
  // Shipping Hub
  fetchShippingSubscription,
  fetchAllShippingLabels,
  fetchShippingLabelStats,
  // Vendor Returns (sub-module)
  fetchVendorReturns,
  fetchVendorReturnStats,
  addVendorReturnMessage,
  markReturnReceived,
  // Coupons (vendor)
  fetchMyCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  // Promotion invitations (vendor)
  fetchPromotionInvitations,
  respondToPromotionInvitation,
} from './api';
