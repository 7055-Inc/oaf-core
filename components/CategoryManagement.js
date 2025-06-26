'use client';
import { useState, useEffect } from 'react';

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
    description: ''
  });

  // Content and SEO data for the current editing category
  const [contentData, setContentData] = useState(null);
  const [seoData, setSeoData] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState({ hero: null, banner: null });

  useEffect(() => {
    loadCategories();
  }, []);

  // Load content and SEO data when editing a category
  useEffect(() => {
    if (editingCategory) {
      fetchCategoryExtras(editingCategory.id);
    }
  }, [editingCategory]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://api2.onlineartfestival.com/categories');
      if (!res.ok) {
        throw new Error('Failed to load categories');
      }
      const data = await res.json();
      setCategories(data.categories);
      setFlatCategories(data.flat_categories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Save basic category info
      const url = editingCategory 
        ? `https://api2.onlineartfestival.com/categories/${editingCategory.id}`
        : 'https://api2.onlineartfestival.com/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const requestBody = {
        name: formData.name,
        parent_id: formData.parent_id || null,
        description: formData.description
      };
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save category');
      }

      // If editing existing category, also save content and SEO
      if (editingCategory && contentData) {
        await fetch(`https://api2.onlineartfestival.com/categories/content/${editingCategory.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(contentData)
        });
      }

      if (editingCategory && seoData) {
        await fetch(`https://api2.onlineartfestival.com/categories/seo/${editingCategory.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(seoData)
        });
      }

      const result = await res.json();
      setSuccess(result.message);
      setShowAddForm(false);
      setEditingCategory(null);
      setFormData({ name: '', parent_id: '', description: '' });
      setContentData(null);
      setSeoData(null);
      setImagePreview({ hero: null, banner: null });
      loadCategories();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parent_id: category.parent_id || '',
      description: category.description || ''
    });
    setShowAddForm(true);
    
    // Scroll to the form after a brief delay to ensure it's rendered
    setTimeout(() => {
      const formElement = document.querySelector('[data-category-form]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const res = await fetch(`https://api2.onlineartfestival.com/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      setSuccess('Category deleted successfully');
      loadCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingCategory(null);
    setFormData({ name: '', parent_id: '', description: '' });
    setContentData(null);
    setSeoData(null);
    setImagePreview({ hero: null, banner: null });
  };

  const renderCategoryTree = (categoryList, level = 0) => {
    return categoryList.map(category => (
      <div key={category.id} style={{ marginLeft: `${level * 20}px` }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.5rem',
          border: editingCategory && editingCategory.id === category.id ? '2px solid #055474' : '1px solid #ddd',
          marginBottom: '0.5rem',
          borderRadius: '4px',
          backgroundColor: editingCategory && editingCategory.id === category.id ? '#f0f8ff' : '#f9f9f9'
        }}>
          <div style={{ flex: 1 }}>
            <strong>{category.name}</strong>
            {editingCategory && editingCategory.id === category.id && (
              <span style={{ 
                marginLeft: '0.5rem', 
                backgroundColor: '#055474', 
                color: 'white', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '12px', 
                fontSize: '0.7rem' 
              }}>
                EDITING
              </span>
            )}
            {category.description && (
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                {category.description}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
              {category.child_count > 0 && `${category.child_count} subcategories`}
              {category.product_count > 0 && ` • ${category.product_count} products`}
              {category.parent_name && ` • Parent: ${category.parent_name}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleEdit(category)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#055474',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Delete
            </button>
          </div>
        </div>
        {category.children && category.children.length > 0 && (
          renderCategoryTree(category.children, level + 1)
        )}
      </div>
    ));
  };

  // Fetch content, SEO for selected category
  const fetchCategoryExtras = async (categoryId) => {
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const [contentRes, seoRes] = await Promise.all([
        fetch(`https://api2.onlineartfestival.com/categories/content/${categoryId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        fetch(`https://api2.onlineartfestival.com/categories/seo/${categoryId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);
      setContentData(contentRes.content || {});
      setSeoData(seoRes.seo || {});
    } catch (error) {
      console.error('Error fetching category extras:', error);
    }
  };

  // Handle image upload
  const handleImageUpload = async (file, imageType) => {
    if (!file || !editingCategory) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('categoryId', editingCategory.id);
    formData.append('imageType', imageType);

    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/upload-category-images', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setContentData(prev => ({
          ...prev,
          [imageType === 'hero' ? 'hero_image' : 'banner']: result.url
        }));
        setImagePreview(prev => ({
          ...prev,
          [imageType]: URL.createObjectURL(file)
        }));
      } else {
        alert('Image upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return <div>Loading categories...</div>;
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Category Management</h2>
      
      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee', 
          color: '#c33', 
          borderRadius: '4px', 
          marginBottom: '1rem' 
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#efe', 
          color: '#363', 
          borderRadius: '4px', 
          marginBottom: '1rem' 
        }}>
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div data-category-form style={{ 
          background: '#f8f9fa', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          border: '2px solid #055474'
        }}>
          <h3 style={{ marginTop: 0, color: '#055474' }}>
            {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            {/* Basic Category Info */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Basic Information</h4>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Category Name: *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Parent Category:
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="">No Parent (Top Level)</option>
                  {flatCategories
                    .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Description:
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>

            {/* Content Section - Only show when editing existing category */}
            {editingCategory && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4>Content & Media</h4>
                
                {/* Hero Image Upload */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Hero Image:
                  </label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleImageUpload(file, 'hero');
                    }}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  {uploadingImage && <div style={{ color: '#666', fontSize: '0.9rem' }}>Uploading...</div>}
                  {(contentData?.hero_image || imagePreview.hero) && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img 
                        src={imagePreview.hero || contentData.hero_image} 
                        alt="Hero preview" 
                        style={{ maxWidth: '200px', maxHeight: '120px', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                        {contentData?.hero_image || 'Preview'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Banner Image Upload */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Banner Image:
                  </label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleImageUpload(file, 'banner');
                    }}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  {uploadingImage && <div style={{ color: '#666', fontSize: '0.9rem' }}>Uploading...</div>}
                  {(contentData?.banner || imagePreview.banner) && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img 
                        src={imagePreview.banner || contentData.banner} 
                        alt="Banner preview" 
                        style={{ maxWidth: '200px', maxHeight: '120px', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                        {contentData?.banner || 'Preview'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Description */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Content Description: 
                  </label>
                  <textarea 
                    value={contentData?.description || ''} 
                    onChange={e => setContentData({ ...contentData, description: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    rows={4}
                    placeholder="Rich description for the category page..."
                  />
                </div>
                
                {/* Featured Items */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Featured Products (comma IDs): 
                  </label>
                  <input 
                    value={contentData?.featured_products || ''} 
                    onChange={e => setContentData({ ...contentData, featured_products: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    placeholder="1,2,3"
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Featured Artists (comma IDs): 
                  </label>
                  <input 
                    value={contentData?.featured_artists || ''} 
                    onChange={e => setContentData({ ...contentData, featured_artists: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    placeholder="1,2,3"
                  />
                </div>
              </div>
            )}

            {/* SEO Section - Only show when editing existing category */}
            {editingCategory && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4>SEO & Meta Tags</h4>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Meta Title: 
                  </label>
                  <input 
                    value={seoData?.meta_title || ''} 
                    onChange={e => setSeoData({ ...seoData, meta_title: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    placeholder="Category Name - Online Art Festival"
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Meta Description: 
                  </label>
                  <textarea 
                    value={seoData?.meta_description || ''} 
                    onChange={e => setSeoData({ ...seoData, meta_description: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    rows={3}
                    placeholder="Explore amazing category artwork and products..."
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Meta Keywords: 
                  </label>
                  <input 
                    value={seoData?.meta_keywords || ''} 
                    onChange={e => setSeoData({ ...seoData, meta_keywords: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    placeholder="category, art, artwork, online art festival"
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Canonical URL: 
                  </label>
                  <input 
                    value={seoData?.canonical_url || ''} 
                    onChange={e => setSeoData({ ...seoData, canonical_url: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    placeholder="https://onlineartfestival.com/category/name"
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    JSON-LD Structured Data: 
                  </label>
                  <textarea 
                    value={seoData?.json_ld || ''} 
                    onChange={e => setSeoData({ ...seoData, json_ld: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    rows={4}
                    placeholder='{"@context":"https://schema.org","@type":"CollectionPage",...}'
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" style={{ 
                padding: '0.75rem 1.5rem', 
                backgroundColor: '#055474', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}>
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
              <button type="button" onClick={resetForm} style={{ 
                padding: '0.75rem 1.5rem', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category List */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          Add New Category
        </button>
      </div>

      {loading ? (
        <div>Loading categories...</div>
      ) : (
        <div>
          <h3>Categories</h3>
          {renderCategoryTree(categories)}
        </div>
      )}
    </div>
  );
} 