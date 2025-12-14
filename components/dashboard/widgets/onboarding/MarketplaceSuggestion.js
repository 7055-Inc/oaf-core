import React from 'react';
import styles from './onboarding.module.css';

export default function MarketplaceSuggestion({ onSnooze, openSlideIn }) {
  const handleGetStarted = () => {
    if (openSlideIn) {
      openSlideIn('marketplace-subscriptions', { title: 'Marketplace Subscriptions' });
    }
  };

  return (
    <div className={styles.suggestion}>
      <div className={styles.iconSection}>
        <div className={styles.icon}>
          <i className="fa-solid fa-store"></i>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>Sell Your Products</h3>
        <p className={styles.description}>
          List your artwork on the marketplace and reach collectors looking for original pieces.
        </p>
      </div>

      <div className={styles.actions}>
        <button 
          onClick={handleGetStarted}
          className={styles.primaryAction}
        >
          Learn More
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

