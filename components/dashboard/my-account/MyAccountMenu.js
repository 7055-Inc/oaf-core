// My Account Menu Component
// This file will contain ONLY the menu building logic for My Account section
import React, { useState, useEffect } from 'react';
import { authApiRequest, API_ENDPOINTS } from '../../../lib/apiUtils';
import { hasPermission } from '../../../lib/userUtils';
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function MyAccountMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load current shortcuts to check which ones are already added
  useEffect(() => {
    loadShortcuts();
    
    // Listen for shortcut updates from the widget
    const handleShortcutUpdate = () => {
      loadShortcuts();
    };
    
    window.addEventListener('shortcuts-updated', handleShortcutUpdate);
    
    return () => {
      window.removeEventListener('shortcuts-updated', handleShortcutUpdate);
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

  if (!userData) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['my-account'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('my-account')}
      >
        <span className={styles.accountHeader}>
          My Account
        </span>
      </h3>
      {!collapsedSections['my-account'] && (
        <ul>
          <li>
            <div className={styles.menuItemContent}>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('edit-profile', { title: 'Edit Profile' })}
              >
                Edit Profile
              </button>
              {!hasShortcut('edit-profile') && (
                <button
                  className={styles.addShortcutButton}
                  onClick={() => addShortcut({
                    id: 'edit-profile',
                    label: 'Edit Profile',
                    icon: 'fas fa-user-edit',
                    slideInType: 'edit-profile'
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
              onClick={() => openSlideIn('view-profile', { title: 'View Profile' })}
            >
              View Profile
            </button>
          </li>
          <li>
            <div className={styles.menuItemContent}>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('my-orders', { title: 'My Orders' })}
              >
                My Orders
              </button>
              {!hasShortcut('my-orders') && (
                <button
                  className={styles.addShortcutButton}
                  onClick={() => addShortcut({
                    id: 'my-orders',
                    label: 'My Orders',
                    icon: 'fas fa-shopping-bag',
                    slideInType: 'my-orders'
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
            <div className={styles.menuItemContent}>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('email-settings', { title: 'Email Settings' })}
              >
                Email Settings
              </button>
              {!hasShortcut('email-settings') && (
                <button
                  className={styles.addShortcutButton}
                  onClick={() => addShortcut({
                    id: 'email-settings',
                    label: 'Email Settings',
                    icon: 'fas fa-envelope-open-text',
                    slideInType: 'email-settings'
                  })}
                  disabled={loading}
                  title="Add to shortcuts"
                >
                  <i className="fas fa-plus"></i>
                </button>
              )}
            </div>
          </li>
          {/* Payment Settings - Only show if user has stripe_connect permission */}
          {hasPermission(userData, 'stripe_connect') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('payment-settings', { title: 'Payment Settings' })}
              >
                Payment Settings
              </button>
            </li>
          )}
          {/* Shipping Settings - Only show if user has shipping permission */}
          {hasPermission(userData, 'shipping') && (
            <li>
              <div className={styles.menuItemContent}>
                <button 
                  className={styles.sidebarLink}
                  onClick={() => openSlideIn('shipping-settings', { title: 'Shipping Settings' })}
                >
                  Shipping Settings
                </button>
                {!hasShortcut('shipping-settings') && (
                  <button
                    className={styles.addShortcutButton}
                    onClick={() => addShortcut({
                      id: 'shipping-settings',
                      label: 'Shipping Settings',
                      icon: 'fas fa-shipping-fast',
                      slideInType: 'shipping-settings'
                    })}
                    disabled={loading}
                    title="Add to shortcuts"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                )}
              </div>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
