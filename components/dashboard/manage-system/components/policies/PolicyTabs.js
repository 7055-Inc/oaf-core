export default function PolicyTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'default-policies', label: 'Default Policies' },
    { id: 'shipping-policies', label: 'Shipping Policies' },
    { id: 'return-policies', label: 'Return Policies' }
  ];

  return (
    <div style={{ 
      display: 'flex', 
      gap: '10px', 
      marginBottom: '20px',
      borderBottom: '1px solid #dee2e6',
      paddingBottom: '10px'
    }}>
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={activeTab === tab.id ? 'primary' : 'secondary'}
          onClick={() => onTabChange(tab.id)}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
} 