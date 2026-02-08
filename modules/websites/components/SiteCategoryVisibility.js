import React, { useState, useEffect } from 'react';
import { 
  fetchUserCategories, 
  fetchSiteCategories,
  updateSiteCategoryVisibility 
} from '../../../lib/websites/api';

/**
 * SiteCategoryVisibility Component
 * Controls which categories are visible on a specific site
 * Users may have 20 categories but only want 5-10 visible per site
 */
export default function SiteCategoryVisibility({ site, onUpdate }) {
  const [allCategories, setAllCategories] = useState([]);
  const [visibleCategories, setVisibleCategories] = useState([]);
  const [visibility, setVisibility] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (site?.id) {
      loadCategories();
    }
  }, [site?.id]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all user categories and site-specific visible categories
      const [all, siteSpecific] = await Promise.all([
        fetchUserCategories(),
        fetchSiteCategories(site.id)
      ]);
      
      setAllCategories(all);
      setVisibleCategories(siteSpecific);
      
      // Build visibility map
      const visMap = {};
      const siteVisibleIds = new Set(siteSpecific.map(c => c.id));
      
      all.forEach(cat => {
        // If category is in site-specific list, it's explicitly visible
        // If not in list, default to visible (show all unless explicitly hidden)
        visMap[cat.id] = siteVisibleIds.size === 0 ? true : siteVisibleIds.has(cat.id);
      });
      
      setVisibility(visMap);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (categoryId) => {
    setVisibility(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
    setSuccessMessage(null);
  };

  const handleSelectAll = () => {
    const newVisibility = {};
    allCategories.forEach(cat => {
      newVisibility[cat.id] = true;
    });
    setVisibility(newVisibility);
    setSuccessMessage(null);
  };

  const handleDeselectAll = () => {
    const newVisibility = {};
    allCategories.forEach(cat => {
      newVisibility[cat.id] = false;
    });
    setVisibility(newVisibility);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      // Build visibility array for API
      const visibilityArray = allCategories.map(cat => ({
        category_id: cat.id,
        is_visible: visibility[cat.id] || false
      }));
      
      await updateSiteCategoryVisibility(site.id, visibilityArray);
      
      setSuccessMessage('Category visibility updated successfully!');
      
      if (onUpdate) {
        onUpdate();
      }
      
      // Reload to get fresh data
      await loadCategories();
    } catch (err) {
      console.error('Error saving visibility:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!site?.id) {
    return (
      <div className="empty-state">
        <p>Select a site to manage category visibility.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="form-card">
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280', fontSize: '16px' }}>
          Loading categories...
        </div>
      </div>
    );
  }

  if (allCategories.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📂</div>
        <h4>No categories yet</h4>
        <p>Create categories first in the Category Manager to control their visibility per site.</p>
      </div>
    );
  }

  const visibleCount = Object.values(visibility).filter(v => v).length;

  return (
    <div className="form-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          Category Visibility
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
          Choose which categories appear on this site. {visibleCount} of {allCategories.length} categories selected.
        </p>
      </div>

      {error && (
        <div style={{ 
          background: '#fee', 
          border: '1px solid #fcc', 
          color: '#c33',
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{ 
          background: '#d1fae5', 
          border: '1px solid #86efac', 
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {successMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          className="secondary small"
          onClick={handleSelectAll}
          disabled={saving}
        >
          Select All
        </button>
        <button 
          className="secondary small"
          onClick={handleDeselectAll}
          disabled={saving}
        >
          Deselect All
        </button>
      </div>

      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '6px', 
        overflow: 'hidden',
        marginBottom: '24px',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {allCategories.map(category => {
          const isVisible = visibility[category.id];
          const hasParent = category.parent_id;
          
          return (
            <div 
              key={category.id} 
              style={{ 
                borderBottom: '1px solid #e5e7eb',
                transition: 'background 0.2s',
                background: isVisible ? '#f0fdf4' : '#ffffff'
              }}
            >
              <label style={{ 
                display: 'flex',
                alignItems: 'flex-start',
                padding: '14px 16px',
                cursor: 'pointer',
                gap: '12px'
              }}>
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => handleToggle(category.id)}
                  disabled={saving}
                  style={{ 
                    width: '18px',
                    height: '18px',
                    marginTop: '2px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap'
                  }}>
                    {hasParent && <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>↳ </span>}
                    {category.name}
                    {category.slug && (
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#667eea', 
                        fontFamily: 'Monaco, monospace',
                        fontWeight: 'normal'
                      }}>
                        /{category.slug}
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <div style={{ 
                      fontSize: '13px',
                      color: '#6b7280',
                      marginTop: '4px',
                      lineHeight: 1.4
                    }}>
                      {category.description}
                    </div>
                  )}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      <div style={{ 
        display: 'flex',
        justifyContent: 'flex-end',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <button 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Visibility Settings'}
        </button>
      </div>

      <div style={{ 
        background: '#eff6ff', 
        border: '1px solid #bfdbfe', 
        borderRadius: '6px',
        padding: '16px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
          How Category Visibility Works
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a', fontSize: '13px', lineHeight: 1.7 }}>
          <li>Control which categories appear on this specific site</li>
          <li>Categories unchecked here will not appear in navigation or product listings</li>
          <li>Products in hidden categories will still be visible if accessed directly</li>
          <li>Use this to show different categories on different sites (e.g., Portfolio site vs Teaching site)</li>
          <li>Categories must also be marked "visible" in the Category Manager to appear</li>
        </ul>
      </div>
    </div>
  );
}
