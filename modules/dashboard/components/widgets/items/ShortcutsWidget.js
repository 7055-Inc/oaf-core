import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authApiRequest, API_ENDPOINTS } from '../../../../../lib/apiUtils';
import styles from './shortcuts/shortcuts.module.css';

export default function ShortcutsWidget({ config, onConfigChange }) {
  const [shortcuts, setShortcuts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadShortcutsData = useCallback(async () => {
    try {
      const response = await authApiRequest(
        `${API_ENDPOINTS.DASHBOARD_WIDGETS_DATA}/my_shortcuts`
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
  }, [onConfigChange]);

  // Load initial data when component mounts
  useEffect(() => {
    loadShortcutsData();
  }, [loadShortcutsData]);

  // Listen for shortcuts-updated events from menu
  useEffect(() => {
    const handleShortcutsUpdated = () => {
      loadShortcutsData();
    };

    window.addEventListener('shortcuts-updated', handleShortcutsUpdated);
    return () => {
      window.removeEventListener('shortcuts-updated', handleShortcutsUpdated);
    };
  }, [loadShortcutsData]);

  const handleRemoveShortcut = async (shortcutId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError(null);

    try {
      const response = await authApiRequest(API_ENDPOINTS.DASHBOARD_WIDGETS_SHORTCUT_REMOVE, {
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

  // Show empty state with helpful message
  if (!shortcuts || shortcuts.length === 0) {
    return (
      <div className={styles.shortcutsWidget}>
        <div className={styles.shortcutsHeader}>
          <span className={styles.shortcutsTitle}>My Shortcuts</span>
        </div>
        <div className={styles.emptyState}>
          <i className="fas fa-star"></i>
          <p>No shortcuts yet!</p>
          <span>Click the <i className="fas fa-plus"></i> icon next to any menu item to add it here for quick access.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shortcutsWidget}>
      <div className={styles.shortcutsHeader}>
        <span className={styles.shortcutsTitle}>My Shortcuts</span>
        <div className={styles.shortcutsHeaderRight}>
          <span className={styles.shortcutsCount}>{shortcuts.length}/10</span>
        </div>
      </div>
      
      {error && (
        <div className={styles.shortcutsError}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      <div className={styles.shortcutsGrid}>
        {shortcuts.map((shortcut) => {
          // Support both new href-based and legacy slideInType shortcuts
          const href = shortcut.href || '#';
          const isLegacy = !shortcut.href && shortcut.slideInType;
          
          return (
            <Link
              key={shortcut.id}
              href={href}
              className={styles.shortcutItem}
              title={shortcut.label}
              onClick={isLegacy ? (e) => {
                e.preventDefault();
                // Trigger legacy slide-in for old shortcuts
                window.dispatchEvent(new CustomEvent('dashboard-open-slide-in', {
                  detail: { type: shortcut.slideInType, title: shortcut.label }
                }));
              } : undefined}
            >
              <button
                className={styles.shortcutRemove}
                onClick={(e) => handleRemoveShortcut(shortcut.id, e)}
                title="Remove shortcut"
              >
                <i className="fas fa-times"></i>
              </button>
              
              <div className={styles.shortcutIcon}>
                <i className={shortcut.icon || 'fas fa-star'}></i>
              </div>
              
              <div className={styles.shortcutLabel}>
                {shortcut.label}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
