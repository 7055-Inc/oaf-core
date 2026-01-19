'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import menuConfig, { menuStyleColors } from '../../config/menuConfig';
import { hasPermission, isAdmin } from '../../../../lib/userUtils';

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

export default function SidebarMenu({ userData, collapsed }) {
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
              {section.label.charAt(0)}
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
                  const itemColor = getItemColor(item);
                  const colorStyle = itemColor !== 'inherit' ? { color: itemColor } : {};
                  
                  return (
                    <li key={item.href}>
                      <a 
                        href={item.href}
                        className={`sidebar-menu-item ${isPathActive(item.href, currentPath, item.exact) ? 'active' : ''}`}
                        style={colorStyle}
                      >
                        {item.label}
                      </a>
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
