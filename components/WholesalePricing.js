import React from 'react';
import styles from './WholesalePricing.module.css';

/**
 * WholesalePricing Component
 * 
 * Displays pricing based on user type:
 * - Regular customers: Show regular price only
 * - Wholesale customers: Show wholesale price prominently with MSRP as reference
 * 
 * @param {Object} props
 * @param {number} props.price - Regular/MSRP price
 * @param {number} props.wholesalePrice - Wholesale price (optional)
 * @param {boolean} props.isWholesaleCustomer - Whether current user is wholesale customer
 * @param {string} props.size - Display size: 'small', 'medium', 'large'
 * @param {string} props.layout - Layout: 'inline', 'stacked'
 * @param {string} props.className - Additional CSS classes
 */
const WholesalePricing = ({ 
  price, 
  wholesalePrice, 
  isWholesaleCustomer = false,
  tiers = null,
  size = 'medium',
  layout = 'inline',
  className = ''
}) => {
  const regularPrice = parseFloat(price || 0);
  const wholesale = parseFloat(wholesalePrice || 0);

  const parsedTiers = (() => {
    if (!tiers) return [];
    try {
      const arr = typeof tiers === 'string' ? JSON.parse(tiers) : tiers;
      return Array.isArray(arr) ? arr.filter(t => t.min_qty && t.price) : [];
    } catch { return []; }
  })();
  
  if (!wholesale || wholesale <= 0) {
    return (
      <div className={`${styles.pricing} ${styles[size]} ${className}`}>
        <span className={styles.regularPrice}>
          ${regularPrice.toFixed(2)}
        </span>
      </div>
    );
  }
  
  if (isWholesaleCustomer) {
    const savingsPercent = Math.round(((regularPrice - wholesale) / regularPrice) * 100);
    
    return (
      <div className={`${styles.pricing} ${styles.wholesale} ${styles[size]} ${styles[layout]} ${className}`}>
        <div className={styles.wholesalePriceContainer}>
          <span className={styles.wholesalePrice}>
            ${wholesale.toFixed(2)}
          </span>
          <span className={styles.wholesaleLabel}>Wholesale</span>
        </div>
        
        <div className={styles.msrpContainer}>
          <span className={styles.msrpPrice}>
            MSRP ${regularPrice.toFixed(2)}
          </span>
          {savingsPercent > 0 && (
            <span className={styles.savings}>
              Save {savingsPercent}%
            </span>
          )}
        </div>

        {parsedTiers.length > 0 && (
          <div className={styles.tierSchedule}>
            {parsedTiers.map((tier, i) => (
              <span key={i} className={styles.tierBadge}>
                {tier.label || `${tier.min_qty}+`} ({tier.min_qty}+): ${parseFloat(tier.price).toFixed(2)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`${styles.pricing} ${styles[size]} ${className}`}>
      <span className={styles.regularPrice}>
        ${regularPrice.toFixed(2)}
      </span>
    </div>
  );
};

export default WholesalePricing;
