// My Finances Menu Component
// This file contains ONLY the menu building logic for My Finances section
import { hasPermission } from '../../../lib/userUtils';
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function MyFinancesMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  if (!userData) return null;
  
  // Only show to users with stripe_connect permission
  if (!hasPermission(userData, 'stripe_connect')) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['my-finances'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('my-finances')}
      >
        My Finances
      </h3>
      {!collapsedSections['my-finances'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('transaction-history', { title: 'Transaction History' })}
            >
              Transaction History
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('payouts-earnings', { title: 'Payouts & Earnings' })}
            >
              Payouts & Earnings
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
