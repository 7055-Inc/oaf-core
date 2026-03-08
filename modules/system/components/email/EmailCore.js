/**
 * Email Core Component
 * Main admin interface for email management
 */

import { useState } from 'react';
import OverviewTab from './OverviewTab';
import TemplatesTab from './TemplatesTab';
import LogsTab from './LogsTab';
import QueueTab from './QueueTab';
import BouncesTab from './BouncesTab';

export default function EmailCore() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'templates', label: 'Templates' },
    { id: 'logs', label: 'Email Logs' },
    { id: 'queue', label: 'Queue' },
    { id: 'bounces', label: 'Bounces' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'templates':
        return <TemplatesTab />;
      case 'logs':
        return <LogsTab />;
      case 'queue':
        return <QueueTab />;
      case 'bounces':
        return <BouncesTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="email-core">
      <h2>Email Management</h2>
      
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
