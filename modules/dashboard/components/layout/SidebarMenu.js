'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import menuConfig, { menuStyleColors } from '../../config/menuConfig';
import { hasPermission, isAdmin } from '../../../../lib/userUtils';
import { authApiRequest } from '../../../../lib/apiUtils';

// Random icons for shortcuts (used when menu item doesn't have an icon)
const SHORTCUT_ICONS = [
  'fa-star', 'fa-bookmark', 'fa-bolt', 'fa-heart', 'fa-gem',
  'fa-rocket', 'fa-fire', 'fa-crown', 'fa-certificate', 'fa-award'
];

function getRandomIcon() {
  return SHORTCUT_ICONS[Math.floor(Math.random() * SHORTCUT_ICONS.length)];
}

/**
 * Get the style color for a menu item based on its user-type visibility
 * - adminOnly → green
 * - artist only → purple
 * - promoter only → orange
 * - everyone/multiple types → default (no color)
 */
function getItemColor(item) {
  // Admin-only items are green
  if (item.adminOnly) {
    return menuStyleColors.adminOnly;
  }
  
  // Check userTypes for specific coloring
  if (item.userTypes && item.userTypes.length > 0) {
    const types = item.userTypes;
    
    // If only artist (or admin+artist), use purple
    if (types.includes('artist') && !types.includes('promoter') && !types.includes('community')) {
      return menuStyleColors.artist;
    }
    
    // If only promoter (or admin+promoter), use orange
    if (types.includes('promoter') && !types.includes('artist') && !types.includes('community')) {
      return menuStyleColors.promoter;
    }
  }
  
  // Default - no special color
  return menuStyleColors.default;
}

/**
 * Resolve the label for a menu item (supports conditional labels)
 * @param {Object} item - Menu item
 * @param {Object} userData - User data
 * @returns {string} - Resolved label
 */
function resolveLabel(item, userData) {
  // If item has a conditional label based on permission
  if (item.labelCondition) {
    const { permission, hasPermission: hasPermLabel, noPermission: noPermLabel } = item.labelCondition;
    const userHasPermission = hasPermission(userData, permission);
    return userHasPermission ? hasPermLabel : noPermLabel;
  }
  
  // Default: return static label
  return item.label;
}

/**
 * Check if user can see a menu item based on permissions
 */
function canUserSeeItem(item, userData) {
  if (!userData) return false;
  
  // Admins see everything
  if (isAdmin(userData)) return true;
  
  // Check adminOnly
  if (item.adminOnly) return false;
  
  // Check specific user types
  if (item.userTypes && item.userTypes.length > 0) {
    if (!item.userTypes.includes(userData.user_type)) return false;
  }
  
  // Check single permission
  if (item.permission) {
    if (!hasPermission(userData, item.permission)) return false;
  }
  
  // Check multiple permissions (user needs ANY of them)
  if (item.permissions && item.permissions.length > 0) {
    const hasAny = item.permissions.some(p => hasPermission(userData, p));
    if (!hasAny) return false;
  }
  
  return true;
}

/**
 * Check if a path is active (current route matches)
 */
function isPathActive(href, currentPath, exact = false) {
  if (exact) {
    return currentPath === href;
  }
  if (href === '/dashboard') {
    return currentPath === '/dashboard';
  }
  return currentPath.startsWith(href);
}

/**
 * Get notification count for a menu item
 */
function getNotificationCount(item, notifications) {
  if (!item.notificationKey || !notifications) return 0;
  return notifications[item.notificationKey] || 0;
}

export default function SidebarMenu({ userData, collapsed, notifications = {} }) {
  const router = useRouter();
  const currentPath = router.asPath.split('?')[0];
  
  const [expandedSections, setExpandedSections] = useState(() => {
    const expanded = {};
    menuConfig.forEach(section => {
      if (section.items && isPathActive(section.href, currentPath)) {
        expanded[section.id] = true;
      }
    });
    return expanded;
  });
  
  // Shortcuts state
  const [shortcuts, setShortcuts] = useState([]);
  const [shortcutHrefs, setShortcutHrefs] = useState(new Set());

  // Load shortcuts on mount
  useEffect(() => {
    loadShortcuts();
    
    // Listen for shortcuts-updated events
    const handleUpdate = () => loadShortcuts();
    window.addEventListener('shortcuts-updated', handleUpdate);
    return () => window.removeEventListener('shortcuts-updated', handleUpdate);
  }, []);
  
  const loadShortcuts = async () => {
    try {
      const response = await authApiRequest('api/v2/system/dashboard-widgets/widget-data/my_shortcuts');
      if (response.ok) {
        const result = await response.json();
        const shortcutsData = result.data?.shortcuts || [];
        setShortcuts(shortcutsData);
        setShortcutHrefs(new Set(shortcutsData.map(s => s.href)));
      }
    } catch (err) {
      // Silently fail
    }
  };
  
  const addShortcut = async (label, href, sectionIcon) => {
    try {
      // Generate a unique ID from the href
      const id = href.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      
      // Use section icon or random icon
      const icon = `fas ${sectionIcon || getRandomIcon()}`;
      
      const response = await authApiRequest('api/v2/system/dashboard-widgets/shortcuts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortcut: { id, label, icon, href }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const updated = result.data?.shortcuts || result.shortcuts || [];
        setShortcuts(updated);
        setShortcutHrefs(new Set(updated.map(s => s.href)));
        window.dispatchEvent(new CustomEvent('shortcuts-updated'));
      }
    } catch (err) {
      console.error('Error adding shortcut:', err);
    }
  };
  
  const removeShortcut = async (href) => {
    try {
      const shortcut = shortcuts.find(s => s.href === href);
      if (!shortcut) return;
      
      const response = await authApiRequest('api/v2/system/dashboard-widgets/shortcuts/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcutId: shortcut.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        const updated = result.data?.shortcuts || result.shortcuts || [];
        setShortcuts(updated);
        setShortcutHrefs(new Set(updated.map(s => s.href)));
        window.dispatchEvent(new CustomEvent('shortcuts-updated'));
      }
    } catch (err) {
      console.error('Error removing shortcut:', err);
    }
  };

  useEffect(() => {
    setExpandedSections(prev => {
      const updated = { ...prev };
      menuConfig.forEach(section => {
        if (section.items && isPathActive(section.href, currentPath)) {
          updated[section.id] = true;
        }
      });
      return updated;
    });
  }, [currentPath]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Show loading state while user data is being fetched
  if (!userData) {
    return (
      <ul className="sidebar-menu-list">
        <li className="sidebar-menu-section">
          <div className="sidebar-menu-header" style={{ color: '#999', fontStyle: 'italic' }}>
            Loading menu...
          </div>
        </li>
      </ul>
    );
  }

  const visibleSections = menuConfig.filter(section => canUserSeeItem(section, userData));

  if (collapsed) {
    return (
      <ul className="sidebar-menu-list">
        {visibleSections.map(section => (
          <li key={section.id} className="sidebar-menu-section">
            <a 
              href={section.href || '#'}
              className={`sidebar-menu-header-collapsed ${isPathActive(section.href, currentPath, section.exact) ? 'active' : ''}`}
              title={section.label}
            >
              {section.icon ? (
                <i className={`fas ${section.icon}`}></i>
              ) : (
                section.label.charAt(0)
              )}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="sidebar-menu-list">
      {visibleSections.map(section => {
        const isExpanded = expandedSections[section.id];
        const isSectionActive = isPathActive(section.href, currentPath, section.exact);
        const hasItems = section.items && section.items.length > 0;
        const visibleItems = hasItems 
          ? section.items.filter(item => canUserSeeItem(item, userData))
          : [];

        return (
          <li key={section.id} className="sidebar-menu-section">
            <div className="sidebar-menu-header-wrapper">
              <a 
                href={section.href || '#'}
                className={`sidebar-menu-header ${isSectionActive ? 'active' : ''}`}
              >
                {section.label}
              </a>
              
              {visibleItems.length > 0 && (
                <button
                  className={`sidebar-menu-expand ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  aria-label={isExpanded ? `Collapse ${section.label}` : `Expand ${section.label}`}
                >
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                  >
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </button>
              )}
            </div>
            
            {visibleItems.length > 0 && (
              <ul className={`sidebar-menu-items ${isExpanded ? 'expanded' : ''}`}>
                {visibleItems.map(item => {
                  const itemLabel = resolveLabel(item, userData);
                  
                  if (item.items && Array.isArray(item.items)) {
                    const visibleChildren = item.items.filter(child => canUserSeeItem(child, userData));
                    if (visibleChildren.length === 0) return null;
                    return (
                      <li key={`sub-${itemLabel}`} className="sidebar-menu-subgroup">
                        <span className="sidebar-menu-subgroup-label">{itemLabel}</span>
                        <ul className="sidebar-menu-subgroup-items">
                          {visibleChildren.map(child => {
                            const childLabel = resolveLabel(child, userData);
                            const childColor = getItemColor(child);
                            const childStyle = childColor !== 'inherit' ? { color: childColor } : {};
                            const isChildShortcut = child.href && shortcutHrefs.has(child.href);
                            const canAddChildShortcut = child.href && !child.external && shortcuts.length < 10;
                            return (
                              <li key={child.href} className="sidebar-menu-item-wrapper">
                                <a
                                  href={child.href}
                                  className={`sidebar-menu-item ${!child.external && isPathActive(child.href, currentPath, child.exact) ? 'active' : ''}`}
                                  style={childStyle}
                                  {...(child.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                >
                                  {childLabel}
                                  {child.external && <i className="fas fa-external-link-alt" style={{ marginLeft: '6px', fontSize: '10px', opacity: 0.6 }}></i>}
                                </a>
                                {child.href && !child.external && (
                                  <button
                                    className={`sidebar-shortcut-btn ${isChildShortcut ? 'is-shortcut' : ''}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (isChildShortcut) {
                                        removeShortcut(child.href);
                                      } else if (canAddChildShortcut) {
                                        addShortcut(childLabel, child.href, section.icon);
                                      }
                                    }}
                                    title={isChildShortcut ? 'Remove from shortcuts' : 'Add to shortcuts'}
                                  >
                                    <i className={`fas ${isChildShortcut ? 'fa-star' : 'fa-plus'}`}></i>
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  }
                  const itemColor = getItemColor(item);
                  const colorStyle = itemColor !== 'inherit' ? { color: itemColor } : {};
                  const notificationCount = getNotificationCount(item, notifications);
                  const isShortcut = item.href && shortcutHrefs.has(item.href);
                  const canAddShortcut = item.href && !item.external && shortcuts.length < 10;
                  
                  return (
                    <li key={item.href || itemLabel} className="sidebar-menu-item-wrapper">
                      <a 
                        href={item.href || '#'}
                        className={`sidebar-menu-item ${!item.external && item.href && isPathActive(item.href, currentPath, item.exact) ? 'active' : ''}`}
                        style={colorStyle}
                        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {itemLabel}
                        {item.external && <i className="fas fa-external-link-alt" style={{ marginLeft: '6px', fontSize: '10px', opacity: 0.6 }}></i>}
                        {notificationCount > 0 && (
                          <span className="sidebar-notification-badge">{notificationCount}</span>
                        )}
                      </a>
                      {/* Shortcut toggle button */}
                      {item.href && !item.external && (
                        <button
                          className={`sidebar-shortcut-btn ${isShortcut ? 'is-shortcut' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isShortcut) {
                              removeShortcut(item.href);
                            } else if (canAddShortcut) {
                              addShortcut(itemLabel, item.href, section.icon);
                            }
                          }}
                          title={isShortcut ? 'Remove from shortcuts' : 'Add to shortcuts'}
                        >
                          <i className={`fas ${isShortcut ? 'fa-star' : 'fa-plus'}`}></i>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
