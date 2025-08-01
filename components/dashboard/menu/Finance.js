import styles from '../../../pages/dashboard/Dashboard.module.css';
import slideInStyles from '../SlideIn.module.css';
import { TransactionHistory } from '../finance/TransactionHistory';

// Main Finance Menu Component
export function FinanceMenu({ 
  userData, 
  collapsedSections, 
  toggleSection, 
  openSlideIn 
}) {
  const hasVendorPermission = userData?.permissions?.includes('vendor');
  const isAdmin = userData?.user_type === 'admin';

  if (!hasVendorPermission && !isAdmin) {
    return null;
  }

  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections.finance ? styles.collapsed : ''}`}
        onClick={() => toggleSection('finance')}
      >
        Finance
      </h3>
      
      {!collapsedSections.finance && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('transaction-history')}
            >
              Transaction History
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

// Transaction History Slide-in Content
function TransactionHistoryContent({ userData, onBack }) {
  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.content}>
        <TransactionHistory userData={userData} onBack={onBack} />
      </div>
    </div>
  );
}

// Slide-in Content Renderer
export function FinanceSlideIn({ 
  slideInContent, 
  userData, 
  closeSlideIn 
}) {
  if (!slideInContent || !userData) return null;

  switch (slideInContent.type) {
    case 'transaction-history':
      return <TransactionHistoryContent userData={userData} onBack={closeSlideIn} />;
    // Other finance slide-in types will be added here
    default:
      return null;
  }
}

// Helper to check if this menu handles a slide-in type
export const financeSlideInTypes = ['transaction-history'];

// Default export for backward compatibility
export default FinanceMenu; 