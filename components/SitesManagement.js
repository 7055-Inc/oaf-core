import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import CustomDomainManagement from './CustomDomainManagement';
import styles from './SitesManagement.module.css';

const SitesManagement = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form states
  const [siteForm, setSiteForm] = useState({
    site_name: '',
    subdomain: '',
    site_title: '',
    site_description: '',
    theme_name: 'default',
    status: 'draft'
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    parent_id: null,
    display_order: 0
  });

  const [subdomainCheck, setSubdomainCheck] = useState({
    checking: false,
    available: null,
    reason: null
  });

  // Load sites and categories on component mount
  useEffect(() => {
    fetchSites();
    fetchCategories();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/me');
      if (response.ok) {
        const data = await response.json();
        setSites(data);
      } else {
        throw new Error('Failed to fetch sites');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        throw new Error('Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const checkSubdomain = async (subdomain) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainCheck({ checking: false, available: null, reason: null });
      return;
    }

    setSubdomainCheck({ checking: true, available: null, reason: null });

    try {
      const response = await fetch(`https://api2.onlineartfestival.com/api/sites/check-subdomain/${subdomain}`);
      if (response.ok) {
        const data = await response.json();
        setSubdomainCheck({
          checking: false,
          available: data.available,
          reason: data.reason
        });
      }
    } catch (err) {
      setSubdomainCheck({ checking: false, available: null, reason: 'Error checking' });
    }
  };

  const handleSiteSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingSite 
        ? `https://api2.onlineartfestival.com/api/sites/${editingSite.id}`
        : 'https://api2.onlineartfestival.com/api/sites';
      
      const method = editingSite ? 'PUT' : 'POST';
      
      const response = await authenticatedApiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteForm)
      });

      if (response.ok) {
        await fetchSites();
        setShowCreateForm(false);
        setEditingSite(null);
        setSiteForm({
          site_name: '',
          subdomain: '',
          site_title: '',
          site_description: '',
          theme_name: 'default',
          status: 'draft'
        });
        setSubdomainCheck({ checking: false, available: null, reason: null });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save site');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingCategory 
        ? `https://api2.onlineartfestival.com/api/sites/categories/${editingCategory.id}`
        : 'https://api2.onlineartfestival.com/api/sites/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await authenticatedApiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryForm)
      });

      if (response.ok) {
        await fetchCategories();
        setShowCategoryForm(false);
        setEditingCategory(null);
        setCategoryForm({
          name: '',
          description: '',
          parent_id: null,
          display_order: 0
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save category');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSiteDelete = async (siteId) => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/${siteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchSites();
      } else {
        throw new Error('Failed to delete site');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCategoryDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchCategories();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (site) => {
    setEditingSite(site);
    setSiteForm({
      site_name: site.site_name,
      subdomain: site.subdomain,
      site_title: site.site_title || '',
      site_description: site.site_description || '',
      theme_name: site.theme_name,
      status: site.status
    });
    setShowCreateForm(true);
  };

  const startCategoryEdit = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id,
      display_order: category.display_order
    });
    setShowCategoryForm(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'draft': return '#ffc107';
      case 'inactive': return '#6c757d';
      case 'suspended': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading sites...</div>;
  }

  return (
    <div className={styles.sitesManagement}>
      <div className={styles.header}>
        <h2>Artist Website Management</h2>
        <p className={styles.subtitle}>Manage your personalized artist storefront</p>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Sites Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Your Artist Website</h3>
          {sites.length === 0 && (
            <button 
              className={styles.primaryButton}
              onClick={() => {
                setShowCreateForm(true);
                setEditingSite(null);
                setSiteForm({
                  site_name: '',
                  subdomain: '',
                  site_title: '',
                  site_description: '',
                  theme_name: 'default',
                  status: 'draft'
                });
              }}
            >
              Create Your Website
            </button>
          )}
        </div>

        {sites.length === 0 && !showCreateForm && (
          <div className={styles.emptyState}>
            <h4>No website created yet</h4>
            <p>Create your personalized artist website to showcase your work with your own subdomain!</p>
            <div className={styles.features}>
              <div className={styles.feature}>
                <strong>✨ Custom Subdomain:</strong> yourname.onlineartfestival.com
              </div>
              <div className={styles.feature}>
                <strong>🎨 Your Brand:</strong> Customize colors, logo, and content
              </div>
              <div className={styles.feature}>
                <strong>📱 Mobile Friendly:</strong> Looks great on all devices
              </div>
              <div className={styles.feature}>
                <strong>🛒 Integrated Shopping:</strong> Seamless cart and checkout
              </div>
            </div>
          </div>
        )}

        {sites.map((site) => (
          <div key={site.id} className={styles.siteCard}>
            <div className={styles.siteHeader}>
              <h4>{site.site_name}</h4>
              <div className={styles.siteActions}>
                <span 
                  className={styles.status}
                  style={{ backgroundColor: getStatusColor(site.status) }}
                >
                  {site.status}
                </span>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => startEdit(site)}
                >
                  Edit
                </button>
                <button 
                  className={styles.dangerButton}
                  onClick={() => handleSiteDelete(site.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className={styles.siteDetails}>
              <div className={styles.siteUrls}>
                <div className={styles.url}>
                  <strong>Subdomain:</strong> 
                  <a 
                    href={`https://${site.subdomain}.onlineartfestival.com`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    {site.subdomain}.onlineartfestival.com
                  </a>
                </div>
                {site.custom_domain && (
                  <div className={styles.url}>
                    <strong>Custom Domain:</strong> 
                    <a 
                      href={`https://${site.custom_domain}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      {site.custom_domain}
                    </a>
                  </div>
                )}
              </div>
              
              {site.site_description && (
                <p className={styles.siteDescription}>{site.site_description}</p>
              )}
              
              <div className={styles.siteMetadata}>
                <span>Theme: {site.theme_name}</span>
                <span>Created: {new Date(site.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Custom Domain Management */}
            <CustomDomainManagement site={site} />
          </div>
        ))}
      </div>

      {/* Site Creation/Edit Form */}
      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>{editingSite ? 'Edit Website' : 'Create Your Artist Website'}</h3>
            
            <form onSubmit={handleSiteSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="site_name">Website Name *</label>
                <input
                  type="text"
                  id="site_name"
                  value={siteForm.site_name}
                  onChange={(e) => setSiteForm({...siteForm, site_name: e.target.value})}
                  placeholder="e.g., John's Art Gallery"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="subdomain">Subdomain * <span className={styles.subdomainSuffix}>.onlineartfestival.com</span></label>
                <input
                  type="text"
                  id="subdomain"
                  value={siteForm.subdomain}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setSiteForm({...siteForm, subdomain: value});
                    checkSubdomain(value);
                  }}
                  placeholder="e.g., john-art"
                  required
                  disabled={editingSite}
                  pattern="[a-z0-9-]+"
                />
                {subdomainCheck.checking && (
                  <div className={styles.checkingMessage}>Checking availability...</div>
                )}
                {subdomainCheck.available === true && (
                  <div className={styles.availableMessage}>✓ Available!</div>
                )}
                {subdomainCheck.available === false && (
                  <div className={styles.unavailableMessage}>✗ {subdomainCheck.reason}</div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="site_title">Site Title</label>
                <input
                  type="text"
                  id="site_title"
                  value={siteForm.site_title}
                  onChange={(e) => setSiteForm({...siteForm, site_title: e.target.value})}
                  placeholder="e.g., John Smith - Contemporary Artist"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="site_description">Site Description</label>
                <textarea
                  id="site_description"
                  value={siteForm.site_description}
                  onChange={(e) => setSiteForm({...siteForm, site_description: e.target.value})}
                  placeholder="Tell visitors about your art..."
                  rows="3"
                />
              </div>



              <div className={styles.formGroup}>
                <label htmlFor="theme_name">Theme</label>
                <select
                  id="theme_name"
                  value={siteForm.theme_name}
                  onChange={(e) => setSiteForm({...siteForm, theme_name: e.target.value})}
                >
                  <option value="default">Default Theme</option>
                  <option value="minimal">Minimal Theme</option>
                  <option value="gallery">Gallery Theme</option>
                  <option value="studio">Studio Theme</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={siteForm.status}
                  onChange={(e) => setSiteForm({...siteForm, status: e.target.value})}
                >
                  <option value="draft">Draft (Not Public)</option>
                  <option value="active">Active (Public)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => {
                  setShowCreateForm(false);
                  setEditingSite(null);
                }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.primaryButton}
                  disabled={!editingSite && (!siteForm.subdomain || subdomainCheck.available === false)}
                >
                  {editingSite ? 'Update Website' : 'Create Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Custom Product Categories</h3>
          <button 
            className={styles.primaryButton}
            onClick={() => {
              setShowCategoryForm(true);
              setEditingCategory(null);
              setCategoryForm({
                name: '',
                description: '',
                parent_id: null,
                display_order: 0
              });
            }}
          >
            Add Category
          </button>
        </div>

        {categories.length === 0 && (
          <div className={styles.emptyState}>
            <h4>No custom categories yet</h4>
            <p>Create custom categories to organize your products on your website (e.g., "Paintings", "Sculptures", "Prints")</p>
          </div>
        )}

        {categories.length > 0 && (
          <div className={styles.categoryList}>
            {categories.map((category) => (
              <div key={category.id} className={styles.categoryCard}>
                <div className={styles.categoryHeader}>
                  <h4>{category.name}</h4>
                  <div className={styles.categoryActions}>
                    <button 
                      className={styles.secondaryButton}
                      onClick={() => startCategoryEdit(category)}
                    >
                      Edit
                    </button>
                    <button 
                      className={styles.dangerButton}
                      onClick={() => handleCategoryDelete(category.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {category.description && (
                  <p className={styles.categoryDescription}>{category.description}</p>
                )}
                
                <div className={styles.categoryMetadata}>
                  <span>Order: {category.display_order}</span>
                  {category.parent_id && (
                    <span>Parent: {categories.find(c => c.id === category.parent_id)?.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Creation/Edit Form */}
      {showCategoryForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>{editingCategory ? 'Edit Category' : 'Create Custom Category'}</h3>
            
            <form onSubmit={handleCategorySubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="category_name">Category Name *</label>
                <input
                  type="text"
                  id="category_name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  placeholder="e.g., Paintings"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="category_description">Description</label>
                <textarea
                  id="category_description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  placeholder="Describe this category..."
                  rows="2"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="parent_id">Parent Category</label>
                <select
                  id="parent_id"
                  value={categoryForm.parent_id || ''}
                  onChange={(e) => setCategoryForm({...categoryForm, parent_id: e.target.value || null})}
                >
                  <option value="">None (Top Level)</option>
                  {categories.filter(c => c.id !== editingCategory?.id).map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="display_order">Display Order</label>
                <input
                  type="number"
                  id="display_order"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({...categoryForm, display_order: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategory(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SitesManagement; 