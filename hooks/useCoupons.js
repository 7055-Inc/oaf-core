import { useState, useCallback } from 'react';

export function useCoupons() {
  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [autoDiscounts, setAutoDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const getAuthToken = () => {
    return document.cookie.split('token=')[1]?.split(';')[0];
  };

  const apiRequest = async (endpoint, options = {}) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`https://api.beemeeart.com${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
  };

  const validateCoupon = useCallback(async (couponCode, cartItems) => {
    try {
      const response = await apiRequest(`/checkout/validate-coupon/${couponCode}?cart_items=${encodeURIComponent(JSON.stringify(cartItems))}`);
      return response.coupon;
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
      const response = await apiRequest('/checkout/get-auto-discounts', {
        method: 'POST',
        body: JSON.stringify({ cart_items: cartItems })
      });
      
      setAutoDiscounts(response.auto_discounts || []);
      return response.auto_discounts || [];
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
      
      const response = await apiRequest('/checkout/calculate-totals', {
        method: 'POST',
        body: JSON.stringify({
          cart_items: cartItems,
          applied_coupons: appliedCouponCodes,
          shipping_address: shippingAddress
        })
      });

      return response;
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
