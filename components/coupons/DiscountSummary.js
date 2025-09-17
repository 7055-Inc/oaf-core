import styles from './DiscountSummary.module.css';

export default function DiscountSummary({ 
  cartItems = [], 
  autoDiscounts = [], 
  appliedCoupons = [],
  showItemBreakdown = false 
}) {
  // Calculate total savings
  const calculateTotalSavings = () => {
    let totalSavings = 0;
    
    cartItems.forEach(item => {
      if (item.discount_applied) {
        totalSavings += item.discount_amount || 0;
      }
    });
    
    return totalSavings;
  };

  // Get unique discount sources
  const getDiscountSources = () => {
    const sources = new Set();
    
    // Add auto-applied discounts
    autoDiscounts.forEach(discount => {
      sources.add({
        type: 'auto',
        name: discount.name,
        code: null,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value
      });
    });
    
    // Add applied coupons
    appliedCoupons.forEach(coupon => {
      sources.add({
        type: 'coupon',
        name: coupon.name,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      });
    });
    
    return Array.from(sources);
  };

  const totalSavings = calculateTotalSavings();
  const discountSources = getDiscountSources();

  if (totalSavings === 0 && discountSources.length === 0) {
    return null; // Don't render if no discounts
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Discounts Applied</h3>
      
      {/* Discount Sources */}
      {discountSources.length > 0 && (
        <div className={styles.sources}>
          {discountSources.map((source, index) => (
            <div key={index} className={styles.source}>
              <div className={styles.sourceInfo}>
                <span className={styles.sourceName}>
                  {source.type === 'auto' && <span className={styles.autoTag}>AUTO</span>}
                  {source.name}
                </span>
                {source.code && (
                  <span className={styles.sourceCode}>({source.code})</span>
                )}
              </div>
              <span className={styles.sourceDiscount}>
                {source.discount_type === 'percentage' ? (
                  `${source.discount_value}% off`
                ) : (
                  `$${source.discount_value} off`
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Total Savings */}
      {totalSavings > 0 && (
        <div className={styles.totalSavings}>
          <span className={styles.savingsLabel}>Total Savings:</span>
          <span className={styles.savingsAmount}>-${totalSavings.toFixed(2)}</span>
        </div>
      )}

      {/* Item-by-item breakdown (optional) */}
      {showItemBreakdown && (
        <div className={styles.breakdown}>
          <h4 className={styles.breakdownTitle}>Discount Breakdown</h4>
          {cartItems.map((item, index) => {
            if (!item.discount_applied) return null;
            
            return (
              <div key={index} className={styles.breakdownItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.title}</span>
                  <span className={styles.itemDiscount}>
                    {item.discount_name} ({item.discount_percentage}% off)
                  </span>
                </div>
                <div className={styles.itemSavings}>
                  <span className={styles.originalPrice}>${item.original_price}</span>
                  <span className={styles.discountedPrice}>${item.discounted_price}</span>
                  <span className={styles.savings}>-${item.discount_amount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Best discount note */}
      {appliedCoupons.length > 1 && (
        <div className={styles.note}>
          <span className={styles.noteIcon}>ℹ️</span>
          Multiple coupons applied - best discount used per item
        </div>
      )}
    </div>
  );
}
