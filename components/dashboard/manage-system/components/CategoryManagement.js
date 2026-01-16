'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '../../../../lib/config';
import { authenticatedApiRequest } from '../../../../lib/csrf';

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
  
  // Product management states
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);
  
  // Vendor/artist management states
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorSearchResults, setVendorSearchResults] = useState([]);
  const [vendorSearchLoading, setVendorSearchLoading] = useState(false);
  const [showVendorSearchResults, setShowVendorSearchResults] = useState(false);
  const [featuredVendors, setFeaturedVendors] = useState([]);
  const vendorSearchTimeoutRef = useRef(null);
  const vendorSearchContainerRef = useRef(null);

  useEffect(() => {
    loadCategories();
  }, []);

  // Load content, SEO, and products when editing a category
  useEffect(() => {
    if (editingCategory) {
      fetchCategoryExtras(editingCategory.id);
      fetchCategoryProducts(editingCategory.id);
    } else {
      setCategoryProducts([]);
    }
  }, [editingCategory]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
      if (vendorSearchContainerRef.current && !vendorSearchContainerRef.current.contains(event.target)) {
        setShowVendorSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced product search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (productSearch.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(productSearch);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearch, editingCategory]);

  // Debounced vendor search
  useEffect(() => {
    if (vendorSearchTimeoutRef.current) {
      clearTimeout(vendorSearchTimeoutRef.current);
    }
    
    if (vendorSearch.length < 2) {
      setVendorSearchResults([]);
      setShowVendorSearchResults(false);
      return;
    }
    
    vendorSearchTimeoutRef.current = setTimeout(() => {
      searchVendors(vendorSearch);
    }, 300);
    
    return () => {
      if (vendorSearchTimeoutRef.current) {
        clearTimeout(vendorSearchTimeoutRef.current);
      }
    };
  }, [vendorSearch]);

  const fetchCategoryProducts = async (categoryId) => {
    try {
      setLoadingProducts(true);
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      const res = await fetch(getApiUrl(`categories/${categoryId}/products`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategoryProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching category products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const searchProducts = async (query) => {
    if (!editingCategory) return;
    try {
      setSearchLoading(true);
      const res = await fetch(
        getApiUrl(`categories/search-products?q=${encodeURIComponent(query)}&category_id=${editingCategory.id}`)
      );
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.products || []);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error('Error searching products:', err);
      setSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const addProductToCategory = async (product) => {
    if (!editingCategory) return;
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      const res = await fetch(getApiUrl(`categories/${editingCategory.id}/products`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ product_id: product.id })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message);
        setProductSearch('');
        setSearchResults([]);
        setShowSearchResults(false);
        fetchCategoryProducts(editingCategory.id);
        loadCategories(); // Refresh product counts
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.error);
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('Error adding product to category:', err);
      setError('Failed to add product');
      setTimeout(() => setError(null), 5000);
    }
  };

  const removeProductFromCategory = async (productId) => {
    if (!editingCategory) return;
    if (!confirm('Remove this product from the category?')) return;
    
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      const res = await fetch(getApiUrl(`categories/${editingCategory.id}/products/${productId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message);
        fetchCategoryProducts(editingCategory.id);
        loadCategories(); // Refresh product counts
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.error);
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('Error removing product from category:', err);
      setError('Failed to remove product');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Vendor/Artist search and management
  const searchVendors = async (query) => {
    try {
      setVendorSearchLoading(true);
      const res = await fetch(
        getApiUrl(`categories/search-vendors?q=${encodeURIComponent(query)}`)
      );
      const data = await res.json();
      if (res.ok) {
        // Filter out already featured vendors
        const currentIds = featuredVendors.map(v => v.id);
        const filtered = (data.vendors || []).filter(v => !currentIds.includes(v.id));
        setVendorSearchResults(filtered);
        setShowVendorSearchResults(true);
      } else {
        console.error('Vendor search failed:', data.error || 'Unknown error');
        setVendorSearchResults([]);
        setShowVendorSearchResults(true); // Show "no results" message
      }
    } catch (err) {
      console.error('Error searching vendors:', err);
      setVendorSearchResults([]);
      setShowVendorSearchResults(true);
    } finally {
      setVendorSearchLoading(false);
    }
  };

  const addFeaturedVendor = (vendor) => {
    const updated = [...featuredVendors, vendor];
    setFeaturedVendors(updated);
    // Update contentData with comma-separated IDs
    setContentData(prev => ({
      ...prev,
      featured_artists: updated.map(v => v.id).join(',')
    }));
    setVendorSearch('');
    setVendorSearchResults([]);
    setShowVendorSearchResults(false);
  };

  const removeFeaturedVendor = (vendorId) => {
    const updated = featuredVendors.filter(v => v.id !== vendorId);
    setFeaturedVendors(updated);
    // Update contentData with comma-separated IDs
    setContentData(prev => ({
      ...prev,
      featured_artists: updated.length > 0 ? updated.map(v => v.id).join(',') : ''
    }));
  };

  // Track if we've loaded vendors for the current category to avoid re-fetching
  const loadedVendorsForCategoryRef = useRef(null);

  // Load featured vendors ONLY when we start editing a category (not when contentData changes)
  useEffect(() => {
    const loadFeaturedVendors = async (featuredArtistsData) => {
      if (!featuredArtistsData) {
        setFeaturedVendors([]);
        return;
      }
      
      const ids = featuredArtistsData.split(',').map(id => id.trim()).filter(id => id);
      if (ids.length === 0) {
        setFeaturedVendors([]);
        return;
      }
      
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0];
        // Fetch vendor details for each ID using the profile endpoint
        const vendorPromises = ids.map(async (id) => {
          const res = await fetch(getApiUrl(`users/profile/by-id/${id}`), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            return data;
          }
          return null;
        });
        const vendors = (await Promise.all(vendorPromises)).filter(v => v);
        setFeaturedVendors(vendors);
      } catch (err) {
        console.error('Error loading featured vendors:', err);
      }
    };
    
    // Only load if we have content data AND we haven't loaded for this category yet
    if (contentData && editingCategory && loadedVendorsForCategoryRef.current !== editingCategory.id) {
      loadedVendorsForCategoryRef.current = editingCategory.id;
      loadFeaturedVendors(contentData.featured_artists);
    }
    
    // Reset the ref when we stop editing
    if (!editingCategory) {
      loadedVendorsForCategoryRef.current = null;
    }
  }, [contentData, editingCategory]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('categories'));
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
        ? getApiUrl(`categories/${editingCategory.id}`)
        : getApiUrl('categories');
      
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
        await fetch(getApiUrl(`categories/content/${editingCategory.id}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(contentData)
        });
      }

      if (editingCategory && seoData) {
        await fetch(getApiUrl(`categories/seo/${editingCategory.id}`), {
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
      
      const res = await fetch(getApiUrl(`categories/${categoryId}`), {
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
    setCategoryProducts([]);
    setProductSearch('');
    setSearchResults([]);
    setShowSearchResults(false);
    setVendorSearch('');
    setVendorSearchResults([]);
    setShowVendorSearchResults(false);
    setFeaturedVendors([]);
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
              className="primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="danger"
              style={{ padding: '6px 12px', fontSize: '12px' }}
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
        fetch(getApiUrl(`categories/content/${categoryId}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        fetch(getApiUrl(`categories/seo/${categoryId}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);
      setContentData(contentRes.content || {});
      setSeoData(seoRes.seo || {});
    } catch (error) {
      console.error('Error fetching category extras:', error);
    }
  };

  // Handle image upload using the standard media system
  const handleImageUpload = async (file, imageType) => {
    if (!file || !editingCategory) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('images', file); // Use 'images' to match the backend expectation

    try {
      const response = await authenticatedApiRequest(
        getApiUrl(`categories/upload?category_id=${editingCategory.id}`),
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        const uploadedUrl = result.urls && result.urls[0]; // Get first uploaded URL
        
        if (uploadedUrl) {
          setContentData(prev => ({
            ...prev,
            [imageType === 'hero' ? 'hero_image' : 'banner']: uploadedUrl
          }));
          setImagePreview(prev => ({
            ...prev,
            [imageType]: URL.createObjectURL(file)
          }));
        } else {
          throw new Error('No URL returned from upload');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Image upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Image upload failed: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div>
      
      {error && (
        <div className="error-alert" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-alert" style={{ marginBottom: '20px' }}>
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div data-category-form className="form-card" style={{ 
          marginBottom: '30px',
          border: '2px solid #055474'
        }}>
          <h3 style={{ marginTop: 0, color: '#495057', marginBottom: '20px' }}>
            {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            {/* Basic Category Info */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Basic Information</h4>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: '#495057',
                  fontSize: '14px'
                }}>
                  Category Name: *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: '#495057',
                  fontSize: '14px'
                }}>
                  Parent Category:
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
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
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: '#495057',
                  fontSize: '14px'
                }}>
                  Description:
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="form-input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Content Section - Only show when editing existing category */}
            {editingCategory && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4>Content & Media</h4>
                
                {/* Hero Image Upload */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
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
                
                {/* Featured Artists/Vendors */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Featured Artists: 
                    <span style={{ 
                      marginLeft: '0.5rem',
                      backgroundColor: '#055474', 
                      color: 'white', 
                      padding: '0.15rem 0.5rem', 
                      borderRadius: '10px', 
                      fontSize: '0.7rem' 
                    }}>
                      {featuredVendors.length}
                    </span>
                  </label>
                  
                  {/* Vendor Search */}
                  <div ref={vendorSearchContainerRef} style={{ position: 'relative', marginBottom: '0.75rem' }}>
                  <input 
                      type="text"
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      onFocus={() => vendorSearchResults.length > 0 && setShowVendorSearchResults(true)}
                      placeholder="Search vendors by name..."
                      style={{ 
                        display: 'block', 
                        width: '100%', 
                        padding: '0.5rem', 
                        borderRadius: '4px', 
                        border: '1px solid #ddd',
                        fontSize: '14px'
                      }}
                    />
                    {vendorSearchLoading && (
                      <div style={{ position: 'absolute', right: '10px', top: '8px', color: '#666', fontSize: '0.85rem' }}>
                        Searching...
                </div>
                    )}
                    
                    {/* Vendor Search Results Dropdown */}
                    {showVendorSearchResults && vendorSearchResults.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000
                      }}>
                        {vendorSearchResults.map(vendor => (
                          <div
                            key={vendor.id}
                            onClick={() => addFeaturedVendor(vendor)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #eee'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            {vendor.profile_image_path ? (
                              <img 
                                src={vendor.profile_image_path.startsWith('http') ? vendor.profile_image_path : `/api/media/serve/${vendor.profile_image_path}`}
                                alt=""
                                style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '50%' }}
                              />
                            ) : (
                              <div style={{ 
                                width: '32px', height: '32px', backgroundColor: '#e0e0e0', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.7rem'
                              }}>
                                {(vendor.display_name || vendor.username || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>
                                {vendor.display_name || `${vendor.first_name || ''} ${vendor.last_name || ''}`.trim() || vendor.username}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#666' }}>
                                @{vendor.username} • {vendor.product_count || 0} products
                              </div>
                            </div>
                            <div style={{ color: '#055474', fontSize: '0.75rem', fontWeight: '500' }}>+ Add</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* No results message */}
                    {vendorSearch.length >= 2 && !vendorSearchLoading && vendorSearchResults.length === 0 && showVendorSearchResults && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '0.75rem',
                        color: '#666',
                        textAlign: 'center',
                        fontSize: '0.85rem'
                      }}>
                        No vendors found matching "{vendorSearch}"
                      </div>
                    )}
                  </div>
                  
                  {/* Featured Vendors List */}
                  {featuredVendors.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {featuredVendors.map(vendor => (
                        <div 
                          key={vendor.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.35rem 0.5rem',
                            backgroundColor: '#f0f8ff',
                            border: '1px solid #055474',
                            borderRadius: '20px',
                            fontSize: '0.8rem'
                          }}
                        >
                          {vendor.profile_image_path ? (
                            <img 
                              src={vendor.profile_image_path.startsWith('http') ? vendor.profile_image_path : `/api/media/serve/${vendor.profile_image_path}`}
                              alt=""
                              style={{ width: '20px', height: '20px', objectFit: 'cover', borderRadius: '50%' }}
                            />
                          ) : (
                            <div style={{ 
                              width: '20px', height: '20px', backgroundColor: '#055474', borderRadius: '50%', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem'
                            }}>
                              {(vendor.display_name || vendor.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <span>{vendor.display_name || vendor.username}</span>
                          <button
                            type="button"
                            onClick={() => removeFeaturedVendor(vendor.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#d9534f',
                              cursor: 'pointer',
                              padding: '0 0.25rem',
                              fontSize: '1rem',
                              lineHeight: 1
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      No featured artists yet
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Products in Category Section */}
            {editingCategory && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Products in Category
                  <span style={{ 
                    backgroundColor: '#055474', 
                    color: 'white', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem' 
                  }}>
                    {categoryProducts.length}
                  </span>
                </h4>
                
                {/* Product Search */}
                <div ref={searchContainerRef} style={{ position: 'relative', marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Add Products:
                  </label>
                  <input 
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    placeholder="Search by product name or SKU..."
                    style={{ 
                      display: 'block', 
                      width: '100%', 
                      padding: '0.75rem', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}
                  />
                  {searchLoading && (
                    <div style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '38px', 
                      color: '#666',
                      fontSize: '0.9rem'
                    }}>
                      Searching...
                </div>
                  )}
                  
                  {/* Search Results Dropdown */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      zIndex: 1000
                    }}>
                      {searchResults.map(product => (
                        <div
                          key={product.id}
                          onClick={() => addProductToCategory(product)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          {product.image_url ? (
                            <img 
                              src={product.image_url.startsWith('http') ? product.image_url : `/api/media/serve/${product.image_url}`}
                              alt={product.name}
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                objectFit: 'cover', 
                                borderRadius: '4px',
                                border: '1px solid #eee'
                              }}
                            />
                          ) : (
                            <div style={{ 
                              width: '40px', 
                              height: '40px', 
                              backgroundColor: '#f0f0f0', 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#999',
                              fontSize: '0.7rem'
                            }}>
                              No img
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: '500', 
                              fontSize: '0.9rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {product.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>
                              {product.sku && `SKU: ${product.sku} • `}
                              ${product.price} • {product.vendor_username}
                            </div>
                          </div>
                          <div style={{ 
                            color: '#055474', 
                            fontWeight: '500',
                            fontSize: '0.8rem'
                          }}>
                            + Add
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showSearchResults && productSearch.length >= 2 && searchResults.length === 0 && !searchLoading && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '1rem',
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      No products found
                    </div>
                  )}
                </div>
                
                {/* Current Products List */}
                {loadingProducts ? (
                  <div style={{ color: '#666', padding: '1rem 0' }}>Loading products...</div>
                ) : categoryProducts.length > 0 ? (
                  <div style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {categoryProducts.map(product => (
                      <div 
                        key={product.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderBottom: '1px solid #eee',
                          backgroundColor: '#fafafa'
                        }}
                      >
                        {product.image_url ? (
                          <img 
                            src={product.image_url.startsWith('http') ? product.image_url : `/api/media/serve/${product.image_url}`}
                            alt={product.name}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              objectFit: 'cover', 
                              borderRadius: '4px',
                              border: '1px solid #eee'
                            }}
                          />
                        ) : (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            backgroundColor: '#e0e0e0', 
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999',
                            fontSize: '0.7rem'
                          }}>
                            No img
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: '500', 
                            fontSize: '0.9rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            {product.sku && `SKU: ${product.sku} • `}
                            ${product.price} • {product.vendor_username}
                            {product.status !== 'active' && (
                              <span style={{ 
                                marginLeft: '0.5rem',
                                color: product.status === 'draft' ? '#f0ad4e' : '#d9534f',
                                fontWeight: '500'
                              }}>
                                ({product.status})
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProductFromCategory(product.id)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #d9534f',
                            color: '#d9534f',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#d9534f';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#d9534f';
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    color: '#666', 
                    padding: '1.5rem', 
                    textAlign: 'center',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    border: '1px dashed #ddd'
                  }}>
                    No products in this category yet. Use the search above to add products.
                  </div>
                )}
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
                    placeholder="https://brakebee.com/category/name"
                  />
                </div>
                
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  backgroundColor: '#e8f4fd', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#0066cc'
                }}>
                  <strong>Note:</strong> Structured data (JSON-LD) is automatically generated for category pages based on the category name, description, and products.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px' }}>
              <button type="submit" className="primary">
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
              <button type="button" onClick={resetForm} className="secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category List */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowAddForm(true)}
          className="primary"
          style={{ marginBottom: '20px' }}
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