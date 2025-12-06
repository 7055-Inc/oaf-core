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
  
  // Check if user has admin privileges (either admin user type OR manage_system permission)
  const isAdmin = userData.user_type === 'admin';
  const hasManageSystem = userData.permissions?.includes('manage_system');
  
  if (!isAdmin && !hasManageSystem) return null;
  
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
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('maintenance-control', { title: 'Maintenance Control' })}
            >
              Maintenance Control
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('add-promoter', { title: 'Add Promoter' })}
            >
              Add Promoter
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('unclaimed-events', { title: 'Unclaimed Events' })}
            >
              Unclaimed Events
            </button>
          </li>
          
          {/* Feeds Section */}
          <li style={{ marginTop: '15px' }}>
            <span style={{ 
              display: 'block', 
              padding: '5px 0', 
              fontSize: '11px', 
              fontWeight: 'bold', 
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Marketplace Feeds
            </span>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('walmart-feed', { title: 'Walmart Feed Management' })}
            >
              🏪 Walmart Feed
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
