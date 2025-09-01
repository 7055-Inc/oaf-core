import { useState } from 'react';
import ViewAPIKeys from './api-keys/ViewAPIKeys';
import GenerateAPIKey from './api-keys/GenerateAPIKey';

export default function APIKeys({ userData }) {
  const [activeTab, setActiveTab] = useState('view');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleKeyGenerated = () => {
    // Trigger refresh of the view tab
    setRefreshTrigger(prev => prev + 1);
    // Switch to view tab to see the new key
    setActiveTab('view');
  };

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>API Keys</h2>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee' }}>
        <button
          onClick={() => setActiveTab('view')}
          className={activeTab === 'view' ? 'primary' : 'secondary'}
          style={{ 
            borderRadius: '4px 4px 0 0',
            border: 'none',
            padding: '10px 20px',
            borderBottom: activeTab === 'view' ? '2px solid #007bff' : '2px solid transparent'
          }}
        >
          My API Keys
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={activeTab === 'generate' ? 'primary' : 'secondary'}
          style={{ 
            borderRadius: '4px 4px 0 0',
            border: 'none',
            padding: '10px 20px',
            borderBottom: activeTab === 'generate' ? '2px solid #007bff' : '2px solid transparent'
          }}
        >
          Generate New
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'view' && (
        <ViewAPIKeys 
          userData={userData}
          refreshTrigger={refreshTrigger}
        />
      )}
      
      {activeTab === 'generate' && (
        <GenerateAPIKey 
          userData={userData}
          onKeyGenerated={handleKeyGenerated}
        />
      )}
    </div>
  );
}
