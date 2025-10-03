// Developers Menu Component
// This file will contain ONLY the menu building logic for Developers section
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function DevelopersMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  if (!userData) return null;
  
  // Only show to admin users
  if (userData.user_type !== 'admin') return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['developers'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('developers')}
      >
        <span className={styles.accountHeader}>
          Developers
        </span>
      </h3>
      {!collapsedSections['developers'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('api-keys', { title: 'API Keys' })}
            >
              API Keys
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
