// Manage My Store Menu Component
// This file contains ONLY the menu building logic for Manage My Store section
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function ManageMyStoreMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  if (!userData) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['manage-my-store'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('manage-my-store')}
      >
        Manage My Store
      </h3>
      {!collapsedSections['manage-my-store'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('my-products', { title: 'My Products' })}
            >
              My Products
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('add-product', { title: 'Add New Product' })}
            >
              Add New Product
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('my-policies', { title: 'My Policies' })}
            >
              My Policies
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-inventory', { title: 'Manage Inventory' })}
            >
              Manage Inventory
            </button>
          </li>
          <li>
            <button 
              className={`${styles.sidebarLink} ${styles.nestedMenuItem}`}
              onClick={() => openSlideIn('inventory-log', { title: 'Inventory Log' })}
            >
              └── Inventory Log
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-orders', { title: 'Manage Orders' })}
            >
              Manage Orders
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('tiktok-connector', { title: 'TikTok Connector' })}
            >
              TikTok Connector
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('my-articles', { title: 'Articles & Pages' })}
            >
              Articles & Pages
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
