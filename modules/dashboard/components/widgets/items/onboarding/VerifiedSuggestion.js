import React from 'react';
import styles from './onboarding.module.css';

export default function VerifiedSuggestion({ onSnooze, openSlideIn }) {
  const handleGetStarted = () => {
    if (openSlideIn) {
      openSlideIn('verified-subscriptions', { title: 'Verified Subscriptions' });
    }
  };

  return (
    <div className={styles.suggestion}>
      <div className={styles.iconSection}>
        <div className={styles.icon}>
          <i className="fa-solid fa-badge-check"></i>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>Become a Verified Artist</h3>
        <p className={styles.description}>
          Get the verified badge to build trust with collectors and stand out from the crowd.
        </p>
      </div>

      <div className={styles.actions}>
        <button 
          onClick={handleGetStarted}
          className={styles.primaryAction}
        >
          Get Verified
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

