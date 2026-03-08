import React from 'react';
import { useRouter } from 'next/router';
import styles from './onboarding.module.css';

export default function EventsSuggestion({ onSnooze }) {
  const router = useRouter();
  
  const handleAddEvents = () => {
    router.push('/dashboard/events/mine');
  };

  return (
    <div className={styles.suggestion}>
      <div className={styles.iconSection}>
        <div className={styles.icon}>
          <i className="fa-solid fa-calendar-days"></i>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>Add Events to Your Calendar</h3>
        <p className={styles.description}>
          Don't forget to show customers where they can find you! Add your upcoming shows and events to your calendar so collectors know where to shop your work in person.
        </p>
      </div>

      <div className={styles.actions}>
        <button 
          onClick={handleAddEvents}
          className={styles.primaryAction}
        >
          Add Events
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
