// Manage My Store Menu Component
// This file contains ONLY the menu building logic for Manage My Store section
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApiRequest, API_ENDPOINTS } from '../../../lib/apiUtils';
import { hasPermission, hasAddon } from '../../../lib/userUtils';
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function ManageMyStoreMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  const router = useRouter();
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadShortcuts();
    
    // Listen for shortcuts-updated events
    const handleShortcutsUpdated = () => {
      loadShortcuts();
    };
    
    window.addEventListener('shortcuts-updated', handleShortcutsUpdated);
    return () => {
      window.removeEventListener('shortcuts-updated', handleShortcutsUpdated);
    };
  }, []);

  const loadShortcuts = async () => {
    try {
      const response = await authApiRequest(`${API_ENDPOINTS.DASHBOARD_WIDGETS_DATA}/my_shortcuts`);
      if (response.ok) {
        const result = await response.json();
        setShortcuts(result.data.shortcuts || []);
      }
    } catch (err) {
      console.error('Error loading shortcuts:', err);
    }
  };

  const addShortcut = async (shortcut) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await authApiRequest(API_ENDPOINTS.DASHBOARD_WIDGETS_SHORTCUT_ADD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut })
      });

      if (response.ok) {
        const result = await response.json();
        setShortcuts(result.shortcuts);
        
        // Notify other components that shortcuts were updated
        window.dispatchEvent(new CustomEvent('shortcuts-updated'));
      }
    } catch (err) {
      console.error('Error adding shortcut:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasShortcut = (shortcutId) => {
    return shortcuts.some(s => s.id === shortcutId);
  };

  const addWidget = async (widgetType) => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Get current layout to find next available position
      const layoutResponse = await authApiRequest(API_ENDPOINTS.DASHBOARD_WIDGETS_LAYOUT);
      if (!layoutResponse.ok) throw new Error('Failed to get layout');
      
      const layoutData = await layoutResponse.json();
      const allWidgets = [...layoutData.userLayout, ...layoutData.adminLayout];
      
      // Check if widget type already exists
      const existingWidget = allWidgets.find(w => w.widget_type === widgetType);
      if (existingWidget) {
        alert(`You already have a "${widgetType.replace('_', ' ')}" widget on your dashboard.`);
        return;
      }
      
      // Find the next empty row - just go to the bottom
      const maxRow = allWidgets.length > 0 ? Math.max(...allWidgets.map(w => w.grid_row)) : -1;
      const nextRow = maxRow + 1;
      
      // Simple INSERT - just add the new widget
      const response = await authApiRequest(API_ENDPOINTS.DASHBOARD_WIDGETS_ADD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          widgetType: widgetType,
          gridRow: nextRow,
          gridCol: 0
        })
      });

      if (response.ok) {
        // Refresh the dashboard to show the new widget
        window.location.reload();
      } else {
        throw new Error('Failed to add widget');
      }
    } catch (err) {
      console.error('Error adding widget:', err);
      alert('Failed to add widget. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  if (!userData) return null;
  
  // Only show to users with vendor or sites permissions
  const hasStoreAccess = hasPermission(userData, 'vendor') || hasPermission(userData, 'sites');
  if (!hasStoreAccess) return null;
  
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
          {/* Manage Orders - vendor or sites permission */}
          {(hasPermission(userData, 'vendor') || hasPermission(userData, 'sites')) && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('manage-orders', { title: 'Manage Orders' })}
              >
                Manage Orders
              </button>
            </li>
          )}
          
          {/* TikTok Connector - only show if user has purchased the tiktok-connector addon */}
          {hasAddon(userData, 'tiktok-connector') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('tiktok-connector', { title: 'TikTok Connector' })}
              >
                TikTok Connector
              </button>
            </li>
          )}
          
          {/* Walmart Connector - only show if user has purchased the walmart-connector addon */}
          {hasAddon(userData, 'walmart-connector') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('walmart-connector', { title: 'Walmart Marketplace' })}
              >
                Walmart Marketplace
              </button>
            </li>
          )}
          
          {/* Articles & Pages - sites permission only */}
          {hasPermission(userData, 'sites') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('my-articles', { title: 'Articles & Pages' })}
              >
                Articles & Pages
              </button>
            </li>
          )}
          
          {/* Promotions - vendor permission only */}
          {hasPermission(userData, 'vendor') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('manage-promotions', { title: 'Promotions' })}
              >
                Promotions
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
