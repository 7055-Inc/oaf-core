// My Account Menu Component
// This file will contain ONLY the menu building logic for My Account section
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function MyAccountMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  if (!userData) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['my-account'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('my-account')}
      >
        <span className={styles.accountHeader}>
          My Account
        </span>
      </h3>
      {!collapsedSections['my-account'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('edit-profile', { title: 'Edit Profile' })}
            >
              Edit Profile
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('view-profile', { title: 'View Profile' })}
            >
              View Profile
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('my-orders', { title: 'My Orders' })}
            >
              My Orders
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('email-settings', { title: 'Email Settings' })}
            >
              Email Settings
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
