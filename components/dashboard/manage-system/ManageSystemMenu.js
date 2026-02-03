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
          {/* Manage Announcements and Hero Settings moved to /dashboard/system/homepage */}
          {/* Email Core moved to /dashboard/system/email */}
          {/* Terms Core moved to /dashboard/system/terms */}
          {/* Custom Policies moved to /dashboard/system/terms (Policies tab) */}
          {/* Unclaimed Events moved to /dashboard/events/unclaimed */}
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-categories', { title: 'Categories' })}
            >
              Categories
            </button>
          </li>
          {/* Maintenance Control removed - not needed for staging workflow */}
          {/* Walmart Feed moved to Catalog > Addons > Walmart Connector Admin */}
        </ul>
      )}
    </div>
  );
}
