import { useState } from 'react';
import styles from './CouponEntry.module.css';

export default function CouponEntry({ onApplyCoupon, onRemoveCoupon, appliedCoupons = [], loading = false, disabled = false }) {
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!couponCode.trim() || loading || disabled) return;

    // Check if coupon is already applied
    if (appliedCoupons.some(c => c.code === couponCode.trim().toUpperCase())) {
      setError('This coupon is already applied');
      return;
    }

    setValidating(true);
    setError('');

    try {
      await onApplyCoupon(couponCode.trim().toUpperCase());
      setCouponCode(''); // Clear input on success
    } catch (err) {
      setError(err.message || 'Invalid coupon code');
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveCoupon = async (couponCode) => {
    try {
      await onRemoveCoupon(couponCode);
    } catch (err) {
      setError(err.message || 'Failed to remove coupon');
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Coupon Codes</h3>
      
      {/* Applied Coupons */}
      {appliedCoupons.length > 0 && (
        <div className={styles.appliedCoupons}>
          {appliedCoupons.map((coupon) => (
            <div key={coupon.code} className={styles.appliedCoupon}>
              <div className={styles.couponInfo}>
                <span className={styles.couponCode}>{coupon.code}</span>
                <span className={styles.couponName}>{coupon.name}</span>
                {coupon.discount_type === 'percentage' ? (
                  <span className={styles.discount}>-{coupon.discount_value}%</span>
                ) : (
                  <span className={styles.discount}>-${coupon.discount_value}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveCoupon(coupon.code)}
                className={styles.removeButton}
                disabled={loading}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Coupon */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setError(''); // Clear error when typing
            }}
            placeholder="Enter coupon code"
            className={styles.input}
            disabled={loading || disabled || validating}
            maxLength={50}
          />
          <button
            type="submit"
            disabled={!couponCode.trim() || loading || disabled || validating}
            className="secondary"
          >
            {validating ? 'Validating...' : 'Apply'}
          </button>
        </div>
        
        {error && (
          <div className={styles.error}>{error}</div>
        )}
      </form>

      <div className={styles.hint}>
        Enter multiple coupon codes - the best discount will be applied to each item
      </div>
    </div>
  );
}
