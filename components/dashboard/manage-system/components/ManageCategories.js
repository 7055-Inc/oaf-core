'use client';
import { useState } from 'react';
import CategoryManagement from './CategoryManagement';
import CategoryChangeLog from './CategoryChangeLog';
import styles from '../../SlideIn.module.css';

const ManageCategories = () => {
  const [activeTab, setActiveTab] = useState('management');

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '10px'
      }}>
        <button
          className={activeTab === 'management' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('management')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Category Management
        </button>
        <button
          className={activeTab === 'changelog' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('changelog')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Change Log
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'management' && <CategoryManagement />}
        {activeTab === 'changelog' && <CategoryChangeLog />}
      </div>
    </div>
  );
};

export default ManageCategories;
