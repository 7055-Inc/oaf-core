import React, { useState, useEffect } from 'react';
import { 
  fetchUserCategories, 
  createUserCategory, 
  updateUserCategory 
} from '../../../lib/websites/api';

/**
 * CategoryEditor Component
 * Full-featured category SEO editor with image, title, meta description, slug, etc.
 * Similar to main site's catalog category editor
 */
export default function CategoryEditor({ 
  category = null, 
  onSave, 
  onCancel,
  userData 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: null,
    image_url: '',
    page_title: '',
    meta_description: '',
    slug: '',
    is_visible: true,
    sort_order: 0,
    display_order: 0
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    loadCategories();
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        parent_id: category.parent_id || null,
        image_url: category.image_url || '',
        page_title: category.page_title || '',
        meta_description: category.meta_description || '',
        slug: category.slug || '',
        is_visible: category.is_visible !== undefined ? category.is_visible : true,
        sort_order: category.sort_order || 0,
        display_order: category.display_order || 0
      });
      setSlugEdited(!!category.slug);
    }
  }, [category]);

  const loadCategories = async () => {
    try {
      const data = await fetchUserCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleNameChange = (value) => {
    setFormData(prev => ({ ...prev, name: value }));
    
    // Auto-generate slug from name if slug hasn't been manually edited
    if (!slugEdited && value) {
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug: autoSlug }));
    }
  };

  const handleSlugChange = (value) => {
    setFormData(prev => ({ ...prev, slug: value }));
    setSlugEdited(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Category name is required');
      }

      if (formData.meta_description && formData.meta_description.length > 200) {
        throw new Error('Meta description should be 160 characters or less (200 max)');
      }

      // Create or update category
      if (category) {
        await updateUserCategory(category.id, formData);
      } else {
        await createUserCategory(formData);
      }

      if (onSave) {
        onSave();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Filter out current category from parent options to prevent self-referencing
  const availableParents = categories.filter(cat => !category || cat.id !== category.id);

  const metaDescLength = formData.meta_description?.length || 0;
  const metaDescColor = metaDescLength > 160 ? '#dc3545' : metaDescLength > 150 ? '#ffc107' : '#28a745';

  return (
    <div className="form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h3>{category ? 'Edit Category' : 'Add New Category'}</h3>
      
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#fee', 
          border: '1px solid #fcc', 
          color: '#c33',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label className="required">Category Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Paintings, Sculptures, Prints"
            required
            disabled={loading}
          />
          <div className="form-help">
            The main name of this category (used in navigation and listings)
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>URL Slug</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="auto-generated-from-name"
            disabled={loading}
          />
          <div className="form-help">
            URL-friendly identifier (auto-generated from name, can be customized)
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>SEO Page Title</label>
          <input
            type="text"
            value={formData.page_title}
            onChange={(e) => setFormData(prev => ({ ...prev, page_title: e.target.value }))}
            placeholder="Leave blank to use category name"
            disabled={loading}
          />
          <div className="form-help">
            Override the page title for SEO purposes (defaults to category name)
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            Meta Description
            <span style={{ color: metaDescColor, marginLeft: '8px', fontSize: '12px' }}>
              ({metaDescLength} / 160 recommended)
            </span>
          </label>
          <textarea
            value={formData.meta_description}
            onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
            placeholder="Brief description of this category for search engines (150-160 characters recommended)"
            rows={3}
            maxLength={200}
            disabled={loading}
          />
          <div className="form-help">
            SEO meta description for category pages (appears in search results)
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description of this category"
            rows={3}
            disabled={loading}
          />
          <div className="form-help">
            Internal description (for your reference)
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Category Image URL</label>
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
            placeholder="https://example.com/image.jpg"
            disabled={loading}
          />
          <div className="form-help">
            Hero or featured image for category pages
          </div>
        </div>

        {formData.image_url && (
          <div style={{ marginBottom: '20px', border: '2px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', maxWidth: '400px' }}>
            <img src={formData.image_url} alt="Category preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label>Parent Category</label>
          <select
            value={formData.parent_id || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value || null }))}
            disabled={loading}
          >
            <option value="">None (Root Category)</option>
            {availableParents.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="form-help">
            Optional: make this a subcategory of another category
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.is_visible}
              onChange={(e) => setFormData(prev => ({ ...prev, is_visible: e.target.checked }))}
              disabled={loading}
              style={{ width: 'auto', margin: '0 8px 0 0' }}
            />
            Category is visible
          </label>
          <div className="form-help">
            Master visibility toggle. Uncheck to hide this category on all sites.
          </div>
        </div>

        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
          <div>
            <label>Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              disabled={loading}
            />
          </div>
          <div>
            <label>Sort Order</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
          </button>
          <button 
            type="button" 
            className="secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
