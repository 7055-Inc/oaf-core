import React from 'react';
import styles from './onboarding.module.css';

export default function CompleteProfileSuggestion({ suggestionData, onSnooze, openSlideIn }) {
  const missingFields = suggestionData?.missingFields || [];

  const handleEditProfile = () => {
    if (openSlideIn) {
      openSlideIn('edit-profile', { title: 'Edit Profile' });
    }
  };

  // Show up to 3 missing items in the description
  const displayFields = missingFields.slice(0, 3).map(f => f.label);
  const moreCount = missingFields.length - 3;

  return (
    <div className={styles.suggestion}>
      <div className={styles.iconSection}>
        <div className={styles.icon}>
          <i className="fa-solid fa-user-pen"></i>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>Complete Your Profile</h3>
        <p className={styles.description}>
          Add {displayFields.join(', ').toLowerCase()}
          {moreCount > 0 ? ` and ${moreCount} more` : ''} to help others discover you.
        </p>
      </div>

      <div className={styles.actions}>
        <button 
          onClick={handleEditProfile}
          className={styles.primaryAction}
        >
          Edit Profile
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

