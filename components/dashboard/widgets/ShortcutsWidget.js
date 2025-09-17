import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../lib/csrf';
import styles from './shortcuts/shortcuts.module.css';

export default function ShortcutsWidget({ config, onConfigChange }) {
  const [shortcuts, setShortcuts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load initial data when component mounts
  useEffect(() => {
    loadShortcutsData();
  }, []);

  const loadShortcutsData = async () => {
    try {
      const response = await authenticatedApiRequest(
        'https://api2.onlineartfestival.com/api/dashboard-widgets/widget-data/my_shortcuts'
      );

      if (response.ok) {
        const result = await response.json();
        const shortcutsData = result.data.shortcuts || [];
        setShortcuts(shortcutsData);
        
              // Tell the grid to span 6 cells for shortcuts widget
              if (onConfigChange) {
                onConfigChange({ 
                  shortcuts: shortcutsData,
                  gridSpan: 6
                });
              }
      } else {
        throw new Error('Failed to load shortcuts');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadShortcutsData();
  };

  // Listen for shortcuts-updated events from menu
  useEffect(() => {
    const handleShortcutsUpdated = () => {
      handleRefresh();
    };

    window.addEventListener('shortcuts-updated', handleShortcutsUpdated);
    return () => {
      window.removeEventListener('shortcuts-updated', handleShortcutsUpdated);
    };
  }, [handleRefresh]);

  const handleShortcutClick = (shortcut) => {
    // Trigger the slide-in panel by dispatching a custom event
    // This integrates with the existing dashboard slide-in system
    const event = new CustomEvent('dashboard-open-slide-in', {
      detail: {
        type: shortcut.slideInType,
        title: shortcut.label
      }
    });
    window.dispatchEvent(event);
  };

  const handleRemoveShortcut = async (shortcutId, e) => {
    e.stopPropagation(); // Prevent shortcut click when removing
    
    setError(null);

    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/dashboard-widgets/shortcuts/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcutId })
      });

      if (response.ok) {
        const result = await response.json();
        setShortcuts(result.shortcuts);
        
        // Update parent widget config
        if (onConfigChange) {
          onConfigChange({ shortcuts: result.shortcuts });
        }
        
        // Notify menu components to refresh their state
        window.dispatchEvent(new CustomEvent('shortcuts-updated'));
      } else {
        throw new Error('Failed to remove shortcut');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className={styles.shortcutsWidget}>
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading shortcuts...</span>
        </div>
      </div>
    );
  }

  // Don't render if no shortcuts (widget should be hidden)
  if (!shortcuts || shortcuts.length === 0) {
    return null;
  }

  return (
    <div className={styles.shortcutsWidget}>
      <div className={styles.shortcutsHeader}>
        <span className={styles.shortcutsTitle}>My Shortcuts</span>
        <div className={styles.shortcutsHeaderRight}>
          <span className={styles.shortcutsCount}>Using {shortcuts.length}/10</span>
          <i 
            className="fas fa-sync-alt" 
            title="Refresh" 
            onClick={handleRefresh}
            style={{ cursor: 'pointer' }}
          ></i>
        </div>
      </div>
      
      {error && (
        <div className={styles.shortcutsError}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      <div className={styles.shortcutsGrid}>
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className={styles.shortcutItem}
            onClick={() => handleShortcutClick(shortcut)}
            title={shortcut.label}
          >
            <button
              className={styles.shortcutRemove}
              onClick={(e) => handleRemoveShortcut(shortcut.id, e)}
              title="Remove shortcut"
            >
              <i className="fas fa-times"></i>
            </button>
            
            <div className={styles.shortcutIcon}>
              <i className={shortcut.icon}></i>
            </div>
            
            <div className={styles.shortcutLabel}>
              {shortcut.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
