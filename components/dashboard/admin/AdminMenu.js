// Admin Menu Component
// This file will contain ONLY the menu building logic for Admin section
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function AdminMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  if (!userData) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['admin'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('admin')}
      >
        <span className={styles.accountHeader}>
          Admin
        </span>
      </h3>
      {!collapsedSections['admin'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('marketplace-products', { title: 'Marketplace Products' })}
            >
              Marketplace Products
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('marketplace-applications', { title: 'Marketplace Applications' })}
            >
              Marketplace Applications
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('wholesale-applications', { title: 'Wholesale Applications' })}
            >
              Wholesale Applications
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('admin-returns', { title: 'Returns Management' })}
            >
              Returns Management
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-commissions', { title: 'Manage Commissions' })}
            >
              Manage Commissions
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-users', { title: 'Manage Users' })}
            >
              Manage Users
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-permissions', { title: 'Manage Permissions' })}
            >
              Manage Permissions
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-events', { title: 'Manage Events' })}
            >
              Manage Events
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-articles', { title: 'Articles & Pages' })}
            >
              Articles & Pages
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
