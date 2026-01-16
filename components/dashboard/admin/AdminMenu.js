// Admin Menu Component
// This file will contain ONLY the menu building logic for Admin section
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function AdminMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {},
  notifications = {}
}) {
  if (!userData) return null;
  
  // Check if user has admin privileges (either admin user type OR manage_system permission)
  const isAdmin = userData.user_type === 'admin';
  const hasManageSystem = userData.permissions?.includes('manage_system');
  
  if (!isAdmin && !hasManageSystem) return null;

  // Calculate total admin notifications
  const totalNotifications = 
    (notifications.marketplace_applications || 0) +
    (notifications.wholesale_applications || 0) +
    (notifications.pending_returns || 0) +
    (notifications.open_tickets || 0);
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['admin'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('admin')}
      >
        <span className={styles.accountHeader}>
          Admin
          {totalNotifications > 0 && (
            <span className={styles.notificationBadge}>{totalNotifications}</span>
          )}
        </span>
      </h3>
      {!collapsedSections['admin'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('admin-refunds', { title: 'Refunds' })}
            >
              Refunds
            </button>
          </li>
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
              {notifications.marketplace_applications > 0 && (
                <span className={styles.notificationBadge}>{notifications.marketplace_applications}</span>
              )}
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('verified-applications', { title: 'Verified Applications' })}
            >
              Verified Applications
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('wholesale-applications', { title: 'Wholesale Applications' })}
            >
              Wholesale Applications
              {notifications.wholesale_applications > 0 && (
                <span className={styles.notificationBadge}>{notifications.wholesale_applications}</span>
              )}
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('support-tickets', { title: 'Support Tickets' })}
            >
              Support Tickets
              {notifications.open_tickets > 0 && (
                <span className={styles.notificationBadge}>{notifications.open_tickets}</span>
              )}
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('admin-returns', { title: 'Returns Management' })}
            >
              Returns Management
              {notifications.pending_returns > 0 && (
                <span className={styles.notificationBadge}>{notifications.pending_returns}</span>
              )}
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
              onClick={() => openSlideIn('event-reviews', { title: 'Event Reviews' })}
            >
              Event Reviews
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
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('admin-promotions', { title: 'Promotions' })}
            >
              Promotions
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
