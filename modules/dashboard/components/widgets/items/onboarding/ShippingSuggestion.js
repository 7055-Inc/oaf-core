import React from 'react';
import styles from './onboarding.module.css';

export default function ShippingSuggestion({ onSnooze, openSlideIn }) {
  const handleGetStarted = () => {
    if (openSlideIn) {
      openSlideIn('shipping-labels-subscriptions', { title: 'Shipping Labels' });
    }
  };

  return (
    <div className={styles.suggestion}>
      <div className={styles.iconSection}>
        <div className={styles.icon}>
          <i className="fa-solid fa-truck-fast"></i>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>Get Discount Shipping</h3>
        <p className={styles.description}>
          Did you know you can save on shipping? Get discounted rates on labels for your artwork.
        </p>
      </div>

      <div className={styles.actions}>
        <button 
          onClick={handleGetStarted}
          className={styles.primaryAction}
        >
          See Rates
        </button>
        <button 
          onClick={onSnooze}
          className={styles.snoozeAction}
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}

