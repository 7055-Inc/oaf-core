import React, { useState } from 'react';
import HeroSettings from './HeroSettings';
import Announcements from './Announcements';

/**
 * Homepage Management Component
 * 
 * Combined admin interface for managing homepage content:
 * - Hero section (text, videos, CTA button)
 * - Site-wide announcements
 * 
 * Uses tabs to organize the two management areas.
 */
const Homepage = () => {
  const [activeTab, setActiveTab] = useState('hero');

  const tabs = [
    { id: 'hero', label: 'Hero Settings', icon: 'fa-image' },
    { id: 'announcements', label: 'Announcements', icon: 'fa-bullhorn' }
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="tabs-container">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fas ${tab.icon}`} style={{ marginRight: '8px' }}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'hero' && (
          <HeroSettings />
        )}
        {activeTab === 'announcements' && (
          <Announcements />
        )}
      </div>
    </div>
  );
};

export default Homepage;
