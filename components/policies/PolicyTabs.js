import styles from '../../styles/Policies.module.css';

export default function PolicyTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'default-policies', label: 'Default Policies' },
    { id: 'shipping-policies', label: 'Shipping Policies' },
    { id: 'return-policies', label: 'Return Policies' }
  ];

  return (
    <div className={styles.tabContainer}>
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
} 