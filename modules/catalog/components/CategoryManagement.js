'use client';
import { useState, useEffect, useRef } from 'react';
import {
  fetchAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchCategoryContent,
  updateCategoryContent,
  fetchCategorySeo,
  updateCategorySeo,
  fetchCategoryProducts,
  addCategoryProduct,
  removeCategoryProduct,
  searchCategoryProducts,
  searchCategoryVendors,
  uploadCategoryImages,
} from '../../../lib/catalog';
import { getApiUrl } from '../../../lib/config';

/**
 * CategoryManagement Component
 * 
 * Admin-only category management with:
 * - Hierarchical category tree display
 * - Category CRUD operations
 * - Content management (hero images, banners, descriptions, featured artists)
 * - SEO management (meta tags, structured data)
 * - Product associations
 * 
 * Uses global styles from modules/styles/forms.css
 */
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

  // Content and SEO data
  const [contentData, setContentData] = useState(null);
  const [seoData, setSeoData] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState({ hero: null, banner: null });
  
  // Product management
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);
  
  // Vendor/artist management
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

  useEffect(() => {
    if (editingCategory) {
      fetchCategoryExtras(editingCategory.id);
      loadCategoryProducts(editingCategory.id);
    } else {
      setCategoryProducts([]);
    }
  }, [editingCategory]);

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

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (productSearch.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => searchProducts(productSearch), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [productSearch, editingCategory]);

  useEffect(() => {
    if (vendorSearchTimeoutRef.current) clearTimeout(vendorSearchTimeoutRef.current);
    if (vendorSearch.length < 2) {
      setVendorSearchResults([]);
      setShowVendorSearchResults(false);
      return;
    }
    vendorSearchTimeoutRef.current = setTimeout(() => searchVendors(vendorSearch), 300);
    return () => { if (vendorSearchTimeoutRef.current) clearTimeout(vendorSearchTimeoutRef.current); };
  }, [vendorSearch]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchAllCategories();
      setCategories(data.categories);
      setFlatCategories(data.flat_categories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryProducts = async (categoryId) => {
    try {
      setLoadingProducts(true);
      const products = await fetchCategoryProducts(categoryId);
      setCategoryProducts(products || []);
    } catch (err) {
      console.error('Error fetching category products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCategoryExtras = async (categoryId) => {
    try {
      const [content, seo] = await Promise.all([
        fetchCategoryContent(categoryId),
        fetchCategorySeo(categoryId)
      ]);
      setContentData(content || {});
      setSeoData(seo || {});
      if (content?.featured_artists) {
        loadFeaturedVendors(content.featured_artists);
      } else {
        setFeaturedVendors([]);
      }
    } catch (error) {
      console.error('Error fetching category extras:', error);
    }
  };

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
      const vendorPromises = ids.map(async (id) => {
        const res = await fetch(getApiUrl(`users/profile/by-id/${id}`), {
          headers: { 'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}` }
        });
        if (res.ok) return res.json();
        return null;
      });
      const vendors = (await Promise.all(vendorPromises)).filter(v => v);
      setFeaturedVendors(vendors);
    } catch (err) {
      console.error('Error loading featured vendors:', err);
    }
  };

  const searchProducts = async (query) => {
    if (!editingCategory) return;
    try {
      setSearchLoading(true);
      const products = await searchCategoryProducts(query, editingCategory.id);
      setSearchResults(products || []);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Error searching products:', err);
      setSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const searchVendors = async (query) => {
    try {
      setVendorSearchLoading(true);
      const vendors = await searchCategoryVendors(query);
      const currentIds = featuredVendors.map(v => v.id);
      const filtered = (vendors || []).filter(v => !currentIds.includes(v.id));
      setVendorSearchResults(filtered);
      setShowVendorSearchResults(true);
    } catch (err) {
      console.error('Error searching vendors:', err);
      setVendorSearchResults([]);
      setShowVendorSearchResults(true);
    } finally {
      setVendorSearchLoading(false);
    }
  };

  const handleAddProduct = async (product) => {
    if (!editingCategory) return;
    try {
      await addCategoryProduct(editingCategory.id, product.id);
      setSuccess(`Added "${product.name}" to category`);
      setProductSearch('');
      setSearchResults([]);
      setShowSearchResults(false);
      loadCategoryProducts(editingCategory.id);
      loadCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRemoveProduct = async (productId) => {
    if (!editingCategory) return;
    if (!confirm('Remove this product from the category?')) return;
    try {
      await removeCategoryProduct(editingCategory.id, productId);
      setSuccess('Product removed from category');
      loadCategoryProducts(editingCategory.id);
      loadCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const addFeaturedVendor = (vendor) => {
    const updated = [...featuredVendors, vendor];
    setFeaturedVendors(updated);
    setContentData(prev => ({ ...prev, featured_artists: updated.map(v => v.id).join(',') }));
    setVendorSearch('');
    setVendorSearchResults([]);
    setShowVendorSearchResults(false);
  };

  const removeFeaturedVendor = (vendorId) => {
    const updated = featuredVendors.filter(v => v.id !== vendorId);
    setFeaturedVendors(updated);
    setContentData(prev => ({ ...prev, featured_artists: updated.length > 0 ? updated.map(v => v.id).join(',') : '' }));
  };

  const handleImageUpload = async (file, imageType) => {
    if (!file || !editingCategory) return;
    setUploadingImage(true);
    try {
      const result = await uploadCategoryImages([file], editingCategory.id);
      const uploadedUrl = result.urls && result.urls[0];
      if (uploadedUrl) {
        setContentData(prev => ({ ...prev, [imageType === 'hero' ? 'hero_image' : 'banner']: uploadedUrl }));
        setImagePreview(prev => ({ ...prev, [imageType]: URL.createObjectURL(file) }));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Image upload failed: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name,
          parent_id: formData.parent_id || null,
          description: formData.description
        });
        if (contentData) await updateCategoryContent(editingCategory.id, contentData);
        if (seoData) await updateCategorySeo(editingCategory.id, seoData);
        setSuccess('Category updated successfully');
      } else {
        await createCategory({
          name: formData.name,
          parent_id: formData.parent_id || null,
          description: formData.description
        });
        setSuccess('Category created successfully');
      }
      resetForm();
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
    setFormData({ name: category.name, parent_id: category.parent_id || '', description: category.description || '' });
    setShowAddForm(true);
    setTimeout(() => {
      const formElement = document.querySelector('[data-category-form]');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;
    try {
      await deleteCategory(categoryId);
      setSuccess('Category deleted successfully');
      loadCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
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
        <div className={`category-tree-item ${editingCategory?.id === category.id ? 'editing' : ''}`}>
          <div className="category-tree-info">
            <strong>{category.name}</strong>
            {editingCategory?.id === category.id && (
              <span className="status-badge info">EDITING</span>
            )}
            {category.description && (
              <div className="category-tree-desc">{category.description}</div>
            )}
            <div className="category-tree-meta">
              {category.child_count > 0 && `${category.child_count} subcategories`}
              {category.product_count > 0 && ` • ${category.product_count} products`}
              {category.parent_name && ` • Parent: ${category.parent_name}`}
            </div>
          </div>
          <div className="category-tree-actions">
            <button onClick={() => handleEdit(category)} className="small">Edit</button>
            <button onClick={() => handleDelete(category.id)} className="danger small">Delete</button>
          </div>
        </div>
        {category.children && category.children.length > 0 && renderCategoryTree(category.children, level + 1)}
      </div>
    ));
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
      {error && <div className="error-alert">{error}</div>}
      {success && <div className="success-alert">{success}</div>}

      {showAddForm && (
        <div data-category-form className="form-card">
          <h3>{editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="category-form-section">
              <h4>Basic Information</h4>
              <div className="form-group">
                <label>Category Name: *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Parent Category:</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                >
                  <option value="">No Parent (Top Level)</option>
                  {flatCategories
                    .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                    .map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {editingCategory && (
              <div className="category-form-section">
                <h4>Content & Media</h4>
                <div className="form-group">
                  <label>Hero Image:</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => { const file = e.target.files[0]; if (file) handleImageUpload(file, 'hero'); }}
                  />
                  {uploadingImage && <div className="upload-status">Uploading...</div>}
                  {(contentData?.hero_image || imagePreview.hero) && (
                    <div className="category-image-preview">
                      <img src={imagePreview.hero || contentData.hero_image} alt="Hero preview" />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Banner Image:</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => { const file = e.target.files[0]; if (file) handleImageUpload(file, 'banner'); }}
                  />
                  {(contentData?.banner || imagePreview.banner) && (
                    <div className="category-image-preview">
                      <img src={imagePreview.banner || contentData.banner} alt="Banner preview" />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Content Description:</label>
                  <textarea 
                    value={contentData?.description || ''} 
                    onChange={e => setContentData({ ...contentData, description: e.target.value })}
                    rows={4}
                    placeholder="Rich description for the category page..."
                  />
                </div>
                
                <div className="form-group">
                  <label>Featured Artists: <span className="status-badge info">{featuredVendors.length}</span></label>
                  <div ref={vendorSearchContainerRef} className="search-container">
                    <input 
                      type="text"
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      onFocus={() => vendorSearchResults.length > 0 && setShowVendorSearchResults(true)}
                      placeholder="Search vendors by name..."
                    />
                    {vendorSearchLoading && <div className="search-loading">Searching...</div>}
                    {showVendorSearchResults && vendorSearchResults.length > 0 && (
                      <div className="search-dropdown">
                        {vendorSearchResults.map(vendor => (
                          <div key={vendor.id} onClick={() => addFeaturedVendor(vendor)} className="search-dropdown-item">
                            <div className="category-product-info">
                              <div className="category-product-name">
                                {vendor.display_name || `${vendor.first_name || ''} ${vendor.last_name || ''}`.trim() || vendor.username}
                              </div>
                              <div className="category-product-meta">@{vendor.username} • {vendor.product_count || 0} products</div>
                            </div>
                            <span className="primary-text">+ Add</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {featuredVendors.length > 0 ? (
                    <div className="category-vendor-tags">
                      {featuredVendors.map(vendor => (
                        <div key={vendor.id} className="category-vendor-tag">
                          <span>{vendor.display_name || vendor.username}</span>
                          <button type="button" onClick={() => removeFeaturedVendor(vendor.id)}>×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-artists-text">No featured artists yet</div>
                  )}
                </div>
              </div>
            )}
            
            {editingCategory && (
              <div className="category-form-section">
                <h4>Products in Category <span className="status-badge info">{categoryProducts.length}</span></h4>
                <div ref={searchContainerRef} className="search-container">
                  <label>Add Products:</label>
                  <input 
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    placeholder="Search by product name or SKU..."
                  />
                  {searchLoading && <div className="search-loading">Searching...</div>}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="search-dropdown">
                      {searchResults.map(product => (
                        <div key={product.id} onClick={() => handleAddProduct(product)} className="search-dropdown-item">
                          {product.image_url && (
                            <img 
                              src={product.image_url.startsWith('http') ? product.image_url : `/api/media/serve/${product.image_url}`}
                              alt={product.name}
                              className="category-product-thumb"
                            />
                          )}
                          <div className="category-product-info">
                            <div className="category-product-name">{product.name}</div>
                            <div className="category-product-meta">
                              {product.sku && `SKU: ${product.sku} • `}${product.price} • {product.vendor_username}
                            </div>
                          </div>
                          <span className="primary-text">+ Add</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {loadingProducts ? (
                  <div className="loading-text">Loading products...</div>
                ) : categoryProducts.length > 0 ? (
                  <div className="category-product-list">
                    {categoryProducts.map(product => (
                      <div key={product.id} className="category-product-item">
                        {product.image_url && (
                          <img 
                            src={product.image_url.startsWith('http') ? product.image_url : `/api/media/serve/${product.image_url}`}
                            alt={product.name}
                            className="category-product-thumb"
                          />
                        )}
                        <div className="category-product-info">
                          <div className="category-product-name">{product.name}</div>
                          <div className="category-product-meta">
                            {product.sku && `SKU: ${product.sku} • `}${product.price} • {product.vendor_username}
                            {product.status !== 'active' && (
                              <span className={`status-badge ${product.status === 'draft' ? 'warning' : 'danger'}`}>{product.status}</span>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveProduct(product.id)} className="danger small">Remove</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="category-empty-state">No products in this category yet. Use the search above to add products.</div>
                )}
              </div>
            )}

            {editingCategory && (
              <div className="category-form-section">
                <h4>SEO & Meta Tags</h4>
                <div className="form-group">
                  <label>Meta Title:</label>
                  <input 
                    value={seoData?.meta_title || ''} 
                    onChange={e => setSeoData({ ...seoData, meta_title: e.target.value })}
                    placeholder="Category Name | Brakebee"
                  />
                </div>
                <div className="form-group">
                  <label>Meta Description:</label>
                  <textarea 
                    value={seoData?.meta_description || ''} 
                    onChange={e => setSeoData({ ...seoData, meta_description: e.target.value })}
                    rows={3}
                    placeholder="Explore amazing category artwork and products..."
                  />
                </div>
                <div className="form-group">
                  <label>Meta Keywords:</label>
                  <input 
                    value={seoData?.meta_keywords || ''} 
                    onChange={e => setSeoData({ ...seoData, meta_keywords: e.target.value })}
                    placeholder="category, art, artwork, brakebee"
                  />
                </div>
                <div className="form-group">
                  <label>Canonical URL:</label>
                  <input 
                    value={seoData?.canonical_url || ''} 
                    onChange={e => setSeoData({ ...seoData, canonical_url: e.target.value })}
                    placeholder="https://brakebee.com/category/name"
                  />
                </div>
                <div className="category-seo-note">
                  <strong>Note:</strong> Structured data (JSON-LD) is automatically generated for category pages based on the category name, description, and products.
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit">{editingCategory ? 'Update Category' : 'Create Category'}</button>
              <button type="button" onClick={resetForm} className="secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="content-header-actions">
        <button onClick={() => setShowAddForm(true)}>Add New Category</button>
      </div>

      <div>
        <h3>Categories</h3>
        {renderCategoryTree(categories)}
      </div>
    </div>
  );
}
