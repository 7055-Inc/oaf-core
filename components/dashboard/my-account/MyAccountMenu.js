// My Account Menu Component
// Most items migrated to new sidebar - only unmigrated items remain here
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { authApiRequest, API_ENDPOINTS } from '../../../lib/apiUtils';
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function MyAccountMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {},
  notifications = {}
}) {
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadShortcuts();
    
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
  
  const totalNotifications = (notifications.awaiting_response || 0);
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['my-account'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('my-account')}
      >
        <span className={styles.accountHeader}>
          My Account
          {totalNotifications > 0 && (
            <span className={styles.notificationBadge}>{totalNotifications}</span>
          )}
        </span>
      </h3>
      {!collapsedSections['my-account'] && (
        <ul>
          {/* My Orders - Still uses slide-in (Commerce module not migrated) */}
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
          
          {/* My Tickets - External link */}
          <li>
            <Link href="/help/tickets" className={styles.sidebarLink}>
              My Tickets
              {notifications.awaiting_response > 0 && (
                <span className={styles.notificationBadge}>{notifications.awaiting_response}</span>
              )}
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
