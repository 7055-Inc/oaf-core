import { useState, useCallback } from 'react';
import { authApiRequest, handleApiResponse } from '../lib/apiUtils';

export function useCoupons() {
  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [autoDiscounts, setAutoDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use the proper authenticated API request function that includes CSRF tokens

  const validateCoupon = useCallback(async (couponCode, cartItems) => {
    try {
      const response = await authApiRequest(`checkout/validate-coupon/${couponCode}?cart_items=${encodeURIComponent(JSON.stringify(cartItems))}`);
      const data = await handleApiResponse(response);
      return data.coupon;
    } catch (error) {
      throw new Error(error.message || 'Invalid coupon code');
    }
  }, []);

  const applyCoupon = useCallback(async (couponCode, cartItems) => {
    setLoading(true);
    try {
      // First validate the coupon
      const coupon = await validateCoupon(couponCode, cartItems);
      
      // Add to applied coupons if not already there
      setAppliedCoupons(prev => {
        const exists = prev.some(c => c.code === coupon.code);
        if (exists) {
          throw new Error('Coupon already applied');
        }
        return [...prev, coupon];
      });

      return coupon;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [validateCoupon]);

  const removeCoupon = useCallback(async (couponCode) => {
    setAppliedCoupons(prev => prev.filter(c => c.code !== couponCode));
  }, []);

  const getAutoDiscounts = useCallback(async (cartItems) => {
    try {
      const response = await authApiRequest('checkout/get-auto-discounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cart_items: cartItems })
      });
      
      const data = await handleApiResponse(response);
      setAutoDiscounts(data.auto_discounts || []);
      return data.auto_discounts || [];
    } catch (error) {
      console.error('Failed to fetch auto discounts:', error);
      setAutoDiscounts([]);
      return [];
    }
  }, []);

  const calculateTotalsWithDiscounts = useCallback(async (cartItems, shippingAddress = null) => {
    setLoading(true);
    try {
      const appliedCouponCodes = appliedCoupons.map(c => c.code);
      
      const response = await authApiRequest('checkout/calculate-totals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cart_items: cartItems,
          applied_coupons: appliedCouponCodes,
          shipping_address: shippingAddress
        })
      });

      const data = await handleApiResponse(response);
      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to calculate totals');
    } finally {
      setLoading(false);
    }
  }, [appliedCoupons]);

  const clearAllCoupons = useCallback(() => {
    setAppliedCoupons([]);
    setAutoDiscounts([]);
  }, []);

  return {
    appliedCoupons,
    autoDiscounts,
    loading,
    applyCoupon,
    removeCoupon,
    getAutoDiscounts,
    calculateTotalsWithDiscounts,
    clearAllCoupons,
    validateCoupon
  };
}
