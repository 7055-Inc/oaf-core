// Manage System Menu Component
// This file will contain ONLY the menu building logic for Manage System section
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function ManageSystemMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  if (!userData) return null;
  
  // Only show to admins or users with system management permissions
  const canManageSystem = userData.user_type === 'admin' || userData.permissions?.includes('manage_system');
  if (!canManageSystem) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['manage-system'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('manage-system')}
      >
        <span className={styles.accountHeader}>
          Manage System
        </span>
      </h3>
      {!collapsedSections['manage-system'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-announcements', { title: 'Manage Announcements' })}
            >
              Manage Announcements
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-hero-settings', { title: 'Hero Settings' })}
            >
              Hero Settings
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-email-core', { title: 'Email Core' })}
            >
              Email Core
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-terms-core', { title: 'Terms Core' })}
            >
              Terms Core
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-categories', { title: 'Categories' })}
            >
              Categories
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-custom-policies', { title: 'Custom Policies' })}
            >
              Custom Policies
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
