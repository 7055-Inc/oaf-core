// My Subscriptions Menu Component
// This file contains ONLY the menu building logic for My Subscriptions section
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function MySubscriptionsMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  if (!userData) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['my-subscriptions'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('my-subscriptions')}
      >
        My Subscriptions
      </h3>
      {!collapsedSections['my-subscriptions'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-subscriptions', { title: 'Manage Subscriptions' })}
            >
              Manage
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('marketplace-subscriptions', { title: 'Marketplace Subscriptions' })}
            >
              Marketplace
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('verified-subscriptions', { title: 'Verified Subscriptions' })}
            >
              Verified
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('website-subscriptions', { title: 'Web Site Subscriptions' })}
            >
              Web Site
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('ship-subscriptions', { title: 'Ship Subscriptions' })}
            >
              Ship
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
