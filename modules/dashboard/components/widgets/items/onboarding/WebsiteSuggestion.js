import React from 'react';
import { useRouter } from 'next/router';
import styles from './onboarding.module.css';

export default function WebsiteSuggestion({ onSnooze }) {
  const router = useRouter();
  const handleGetStarted = () => {
    router.push('/dashboard/websites');
  };

  return (
    <div className={styles.suggestion}>
      <div className={styles.iconSection}>
        <div className={styles.icon}>
          <i className="fa-solid fa-globe"></i>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>Get Your Own Website</h3>
        <p className={styles.description}>
          Create a professional website to showcase your work, connect with collectors, and build your brand.
        </p>
      </div>

      <div className={styles.actions}>
        <button 
          onClick={handleGetStarted}
          className={styles.primaryAction}
        >
          See Plans
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

