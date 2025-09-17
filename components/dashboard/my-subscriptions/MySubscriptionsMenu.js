// My Subscriptions Menu Component
// This file contains ONLY the menu building logic for My Subscriptions section
import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../lib/csrf';
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function MySubscriptionsMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/dashboard-widgets/widget-data/my_shortcuts');
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/dashboard-widgets/shortcuts/add', {
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
  if (!userData) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['my-subscriptions'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('my-subscriptions')}
      >
        My Subscriptions
      </h3>
      {!collapsedSections['my-subscriptions'] && (
        <ul>
          <li>
            <div className={styles.menuItemContent}>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('manage-subscriptions', { title: 'Manage Subscriptions' })}
              >
                Manage
              </button>
              {!hasShortcut('manage-subscriptions') && (
                <button
                  className={styles.addShortcutButton}
                  onClick={() => addShortcut({
                    id: 'manage-subscriptions',
                    label: 'Manage Subscriptions',
                    icon: 'fas fa-cogs',
                    slideInType: 'manage-subscriptions'
                  })}
                  disabled={loading}
                  title="Add to shortcuts"
                >
                  <i className="fas fa-plus"></i>
                </button>
              )}
            </div>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('marketplace-subscriptions', { title: 'Marketplace Subscriptions' })}
            >
              Marketplace
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('verified-subscriptions', { title: 'Verified Subscriptions' })}
            >
              Verified
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('website-subscriptions', { title: 'Web Site Subscriptions' })}
            >
              Web Site
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('ship-subscriptions', { title: 'Ship Subscriptions' })}
            >
              Ship
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
