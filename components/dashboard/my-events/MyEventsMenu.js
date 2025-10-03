// My Events Menu Component
// This file will contain ONLY the menu building logic for My Events section
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function MyEventsMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  if (!userData) return null;
  
  // Show to artists, promoters, and admins (users who can participate in events)
  const canAccessEvents = userData.user_type === 'admin' || userData.user_type === 'promoter' || userData.user_type === 'artist';
  if (!canAccessEvents) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['my-events'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('my-events')}
      >
        <span className={styles.accountHeader}>
          My Events
        </span>
      </h3>
      {!collapsedSections['my-events'] && (
        <ul>
          {/* Add New - promoter only */}
          {(userData.user_type === 'promoter' || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('add-new', { title: 'Create New Event' })}
              >
                Add New
              </button>
            </li>
          )}
          
          {/* My Applications - artists only */}
          {(userData.user_type === 'artist' || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('my-applications', { title: 'My Applications' })}
              >
                My Applications
              </button>
            </li>
          )}
          
          {/* Find New - artists only */}
          {(userData.user_type === 'artist' || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('find-new', { title: 'Find New Events' })}
              >
                Find New
              </button>
            </li>
          )}
          
          {/* My Calendar - artists only */}
          {(userData.user_type === 'artist' || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('my-calendar', { title: 'My Calendar' })}
              >
                My Calendar
              </button>
            </li>
          )}
          
          {/* Events I Own - promoters only */}
          {(userData.user_type === 'promoter' || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('events-i-own', { title: 'Events I Own' })}
              >
                Events I Own
              </button>
            </li>
          )}
          
          {/* Applications Received - promoters only */}
          {(userData.user_type === 'promoter' || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('applications-received', { title: 'Applications Received' })}
              >
                Applications Received
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
