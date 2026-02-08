import React, { useState, useEffect } from 'react';
import { 
  fetchUserCategories, 
  deleteUserCategory,
  fetchUserCategoriesTree 
} from '../../../lib/websites/api';
import CategoryEditor from './CategoryEditor';

/**
 * CategoryManager Component
 * Displays user categories in a hierarchical tree structure
 * Allows creating, editing, and deleting categories
 */
export default function CategoryManager({ userData }) {
  const [categories, setCategories] = useState([]);
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const [flatCategories, treeCategories] = await Promise.all([
        fetchUserCategories(),
        fetchUserCategoriesTree()
      ]);
      setCategories(flatCategories);
      setCategoriesTree(treeCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setShowEditor(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowEditor(true);
  };

  const handleDelete = async (categoryId, categoryName) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUserCategory(categoryId);
      await loadCategories();
    } catch (err) {
      alert('Error deleting category: ' + err.message);
    }
  };

  const handleSave = async () => {
    setShowEditor(false);
    setEditingCategory(null);
    await loadCategories();
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingCategory(null);
  };

  const renderCategory = (category, depth = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    
    return (
      <div key={category.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div 
          style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            marginLeft: `${depth * 32}px`,
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>
                {hasChildren ? '📁' : '📄'}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                {category.name}
              </span>
              {category.slug && (
                <span style={{ fontSize: '13px', color: '#667eea', fontFamily: 'Monaco, monospace' }}>
                  /{category.slug}
                </span>
              )}
              {!category.is_visible && (
                <span style={{ 
                  background: '#fee', 
                  color: '#c33', 
                  fontSize: '11px', 
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  Hidden
                </span>
              )}
            </div>
            
            {category.description && (
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', lineHeight: 1.4 }}>
                {category.description}
              </div>
            )}
            
            {(category.page_title || category.meta_description || category.image_url) && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {category.page_title && (
                  <span style={{ 
                    background: '#eff6ff', 
                    color: '#1e40af', 
                    fontSize: '11px', 
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    SEO Title
                  </span>
                )}
                {category.meta_description && (
                  <span style={{ 
                    background: '#eff6ff', 
                    color: '#1e40af', 
                    fontSize: '11px', 
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    Meta Desc
                  </span>
                )}
                {category.image_url && (
                  <span style={{ 
                    background: '#eff6ff', 
                    color: '#1e40af', 
                    fontSize: '11px', 
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    Image
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
            <button 
              className="outline small"
              onClick={() => handleEdit(category)}
              title="Edit category"
            >
              Edit
            </button>
            <button 
              className="danger small"
              onClick={() => handleDelete(category.id, category.name)}
              title="Delete category"
            >
              Delete
            </button>
          </div>
        </div>
        
        {hasChildren && (
          <div style={{ background: '#fafafa' }}>
            {category.children.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280', fontSize: '16px' }}>
          Loading categories...
        </div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <CategoryEditor
          category={editingCategory}
          onSave={handleSave}
          onCancel={handleCancel}
          userData={userData}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700, color: '#111827' }}>
            Category Manager
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
            Organize your products and content into categories with full SEO support
          </p>
        </div>
        <button onClick={handleCreate}>
          + Add Category
        </button>
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
          Error: {error}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📂</div>
          <h3>No categories yet</h3>
          <p>Create your first category to start organizing your content</p>
          <button onClick={handleCreate} style={{ marginTop: '16px' }}>
            Create First Category
          </button>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          {categoriesTree.map(category => renderCategory(category, 0))}
        </div>
      )}

      <div style={{ 
        background: '#eff6ff', 
        border: '1px solid #bfdbfe', 
        borderRadius: '8px',
        padding: '20px',
        marginTop: '32px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>
          About Categories
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a', fontSize: '14px', lineHeight: 1.8 }}>
          <li>Categories help organize your products, articles, and content</li>
          <li>Create nested categories by setting a parent category</li>
          <li>Each category can have its own SEO settings (title, description, image)</li>
          <li>Control which categories appear on each site in the Site Customizer</li>
          <li>Hidden categories (visibility off) won't appear on any site</li>
        </ul>
      </div>
    </div>
  );
}
