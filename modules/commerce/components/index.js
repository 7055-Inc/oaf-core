/**
 * Commerce Module Components
 * Orders, sales, shipping, returns, promotions, coupons
 */

export { default as MyOrders } from './MyOrders';
export { default as MySales } from './MySales';
export { default as ShippingHub } from './ShippingHub';
export { default as VendorReturns } from './VendorReturns';
export { default as ReturnRequestModal } from './ReturnRequestModal';
export { default as AdminAllOrders } from './AdminAllOrders';
export { default as AdminReturns } from './AdminReturns';
export { default as PromotionsManagement } from './PromotionsManagement';

// Coupons (checkout/cart)
export { default as CouponEntry } from './coupons/CouponEntry';
export { default as DiscountSummary } from './coupons/DiscountSummary';

// Shipping Labels (standalone label creation)
export {
  ShippingLabelsSubscription,
  ShippingLabelsDashboard,
  StandaloneLabelCreator,
  StandaloneLabelLibrary,
  shippingLabelsConfig
} from './shipping';

// Marketplace Subscription (artist application, admin management)
export {
  MarketplaceSubscription,
  MarketplaceDashboard,
  AdminMarketplace,
  marketplaceConfig
} from './marketplace';

// Re-export from applications module for backward compatibility
export { MyApplicants, AdminAllApplications } from '../../applications';