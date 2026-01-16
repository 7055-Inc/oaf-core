import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import { hasAddon } from '../../../../lib/userUtils';

// All available product fields organized by category
const FIELD_CATEGORIES = {
  'Basic Info': [
    { key: 'sku', label: 'SKU', required: true },
    { key: 'name', label: 'Product Name', required: true },
    { key: 'price', label: 'Price' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' }
  ],
  'Descriptions': [
    { key: 'short_description', label: 'Short Description' },
    { key: 'description', label: 'Full Description' }
  ],
  'Dimensions & Weight': [
    { key: 'width', label: 'Width' },
    { key: 'height', label: 'Height' },
    { key: 'depth', label: 'Depth' },
    { key: 'weight', label: 'Weight' },
    { key: 'dimension_unit', label: 'Dimension Unit' },
    { key: 'weight_unit', label: 'Weight Unit' }
  ],
  'Inventory': [
    { key: 'quantity', label: 'Quantity' },
    { key: 'reorder_qty', label: 'Reorder Quantity' }
  ],
  'Shipping': [
    { key: 'ship_method', label: 'Ship Method' },
    { key: 'ship_rate', label: 'Ship Rate' },
    { key: 'allow_returns', label: 'Return Policy' }
  ],
  'Search & Feeds': [
    { key: 'gtin', label: 'GTIN/UPC' },
    { key: 'mpn', label: 'MPN' },
    { key: 'google_product_category', label: 'Google Category' },
    { key: 'meta_description', label: 'Meta Description' },
    { key: 'custom_label_0', label: 'Custom Label 0' },
    { key: 'custom_label_1', label: 'Custom Label 1' },
    { key: 'custom_label_2', label: 'Custom Label 2' },
    { key: 'custom_label_3', label: 'Custom Label 3' },
    { key: 'custom_label_4', label: 'Custom Label 4' }
  ],
  'Marketplace': [
    { key: 'marketplace_enabled', label: 'Marketplace Enabled' }
  ],
  'Parent/Child': [
    { key: 'product_type', label: 'Product Type' },
    { key: 'parent_id', label: 'Parent ID' },
    { key: 'parent_sku', label: 'Parent SKU' }
  ],
  'Wholesale': [
    { key: 'wholesale_price', label: 'Wholesale Price', addon: 'wholesale-addon' },
    { key: 'wholesale_description', label: 'Wholesale Description', addon: 'wholesale-addon' }
  ]
};

// Admin-only fields
const ADMIN_FIELDS = [
  { key: 'vendor_username', label: 'Vendor Username' },
  { key: 'marketplace_category', label: 'Marketplace Category' },
  { key: 'product_id', label: 'Product ID' }
];

export default function CatalogManager({ userData }) {
  const [activeTab, setActiveTab] = useState('download');
  const [selectedFields, setSelectedFields] = useState(['sku', 'name']); // Always include these
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  
  // Save report modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportName, setReportName] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('active'); // Default to active
  const [selectedVendors, setSelectedVendors] = useState([]); // Admin only - multiple vendors
  const [vendorSearch, setVendorSearch] = useState(''); // Search input for vendors
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [wholesalePriceMin, setWholesalePriceMin] = useState('');
  const [wholesalePriceMax, setWholesalePriceMax] = useState('');
  
  // Data for dropdowns
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Filter vendors based on search
  const filteredVendors = vendors.filter(v => {
    const searchLower = vendorSearch.toLowerCase();
    const name = (v.display_name || v.username || '').toLowerCase();
    // Don't show already selected vendors
    if (selectedVendors.some(sv => sv.id === v.id)) return false;
    return name.includes(searchLower);
  }).slice(0, 10); // Limit results
  
  const addVendor = (vendor) => {
    setSelectedVendors(prev => [...prev, vendor]);
    setVendorSearch('');
    setShowVendorDropdown(false);
  };
  
  const removeVendor = (vendorId) => {
    setSelectedVendors(prev => prev.filter(v => v.id !== vendorId));
  };
  
  // Check user permissions
  const isAdmin = userData?.user_type === 'admin';
  const hasWholesale = hasAddon(userData, 'wholesale-addon') || isAdmin;

  useEffect(() => {
    loadSavedReports();
    loadCategories();
    if (isAdmin) {
      loadVendors();
    }
  }, [isAdmin]);
  
  const loadVendors = async () => {
    try {
      const response = await authApiRequest('admin/users');
      if (response.ok) {
        const data = await response.json();
        // Filter for users with vendor permission - data is an array directly
        const vendorUsers = (Array.isArray(data) ? data : []).filter(
          user => user.permissions?.vendor === true
        );
        setVendors(vendorUsers);
      }
    } catch (err) {
      // Silently fail - admin might not have manage_system permission
    }
  };
  
  const loadCategories = async () => {
    try {
      const response = await authApiRequest('categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.flat_categories || data.categories || []);
      }
    } catch (err) {
      // Silently fail
    }
  };

  // Poll for job status when we have a job
  useEffect(() => {
    let interval;
    if (jobStatus && jobStatus.status === 'processing') {
      interval = setInterval(checkJobStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [jobStatus]);

  const loadSavedReports = async () => {
    try {
      const response = await authApiRequest('csv/reports');
      if (response.ok) {
        const data = await response.json();
        setSavedReports(data.reports || []);
      }
    } catch (err) {
      // Silently fail - saved reports are optional
    }
  };

  const checkJobStatus = async () => {
    if (!jobStatus?.jobId) return;
    
    try {
      const response = await authApiRequest(`csv/job/${jobStatus.jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJobStatus(data.job);
        
        if (data.job.status === 'completed') {
          setSuccess(`Successfully processed ${data.job.processedRows} products!`);
          setUploadFile(null);
        } else if (data.job.status === 'failed') {
          setError(`Processing failed: ${data.job.errorSummary || 'Unknown error'}`);
        }
      }
    } catch (err) {
      // Continue polling
    }
  };

  const toggleField = (fieldKey) => {
    // Don't allow unchecking required fields
    if (fieldKey === 'sku' || fieldKey === 'name') return;
    
    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const selectCategory = (categoryFields, selected) => {
    const fieldKeys = categoryFields.map(f => f.key).filter(k => k !== 'sku' && k !== 'name');
    setSelectedFields(prev => {
      if (selected) {
        return [...new Set([...prev, ...fieldKeys])];
      } else {
        return prev.filter(f => !fieldKeys.includes(f) || f === 'sku' || f === 'name');
      }
    });
  };

  const selectAll = () => {
    const allFields = [];
    Object.values(FIELD_CATEGORIES).forEach(fields => {
      fields.forEach(f => {
        if (!f.addon || hasAddon(userData, f.addon) || isAdmin) {
          allFields.push(f.key);
        }
      });
    });
    if (isAdmin) {
      ADMIN_FIELDS.forEach(f => allFields.push(f.key));
    }
    setSelectedFields(allFields);
  };

  const selectNone = () => {
    setSelectedFields(['sku', 'name']); // Keep required fields
  };

  const loadSavedReport = (report) => {
    setSelectedFields(report.fields || ['sku', 'name']);
    setSuccess(`Loaded report: ${report.name}`);
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      setError('Please enter a report name');
      return;
    }

    setLoading(true);
    try {
      const response = await authApiRequest('csv/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName.trim(),
          fields: selectedFields
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSavedReports(prev => [...prev, data.report]);
        setShowSaveModal(false);
        setReportName('');
        setSuccess('Report saved successfully!');
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to save report');
      }
    } catch (err) {
      setError('Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedReport = async (reportId) => {
    if (!confirm('Delete this saved report?')) return;
    
    try {
      const response = await authApiRequest(`csv/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSavedReports(prev => prev.filter(r => r.id !== reportId));
        setSuccess('Report deleted');
      }
    } catch (err) {
      setError('Failed to delete report');
    }
  };

  const buildReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query params with selected fields and filters
      const params = new URLSearchParams();
      params.append('fields', selectedFields.join(','));
      
      // Status filter (required)
      params.append('status', statusFilter);
      
      // Admin filters
      if (isAdmin) {
        params.append('all', 'true'); // Admin can export all products
        if (selectedVendors.length > 0) {
          const vendorIdString = selectedVendors.map(v => v.id).join(',');
          console.log('Selected vendors:', selectedVendors, 'IDs:', vendorIdString);
          params.append('vendor_ids', vendorIdString);
        }
      }
      
      // Category filter
      if (categoryFilter) {
        params.append('category_id', categoryFilter);
      }
      
      // Price range filters
      if (priceMin) {
        params.append('price_min', priceMin);
      }
      if (priceMax) {
        params.append('price_max', priceMax);
      }
      
      // Wholesale price range filters (if user has addon or is admin)
      if (hasWholesale) {
        if (wholesalePriceMin) {
          params.append('wholesale_min', wholesalePriceMin);
        }
        if (wholesalePriceMax) {
          params.append('wholesale_max', wholesalePriceMax);
        }
      }

      // Request Excel format
      params.append('format', 'xlsx');
      
      const response = await authApiRequest(`csv/export/product_upload?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product_catalog_${statusFilter}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess('Excel file downloaded successfully!');
    } catch (err) {
      setError(err.message || 'Failed to download Excel file');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase();
      if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
        setError('Please select a CSV or Excel file');
        return;
      }
      setUploadFile(file);
      setError(null);
    }
  };

  const handleUpload = async (isNewProducts = false) => {
    if (!uploadFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('csv', uploadFile);
      formData.append('jobType', 'product_upload');

      const response = await authApiRequest('csv/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await response.json();
      setJobStatus({
        jobId: data.jobId,
        status: 'processing',
        totalRows: data.totalRows,
        processedRows: 0
      });
      
      setSuccess(`Upload started! Processing ${data.totalRows} products...`);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    setLoading(true);
    try {
      const response = await authApiRequest('csv/template/product_upload?format=xlsx');
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'new_products_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess('Template downloaded!');
    } catch (err) {
      setError('Failed to download template');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Filter fields based on user's addons
  const getVisibleFields = (fields) => {
    return fields.filter(f => {
      if (f.addon && !isAdmin && !hasAddon(userData, f.addon)) {
        return false;
      }
      return true;
    });
  };

  return (
    <div className="catalog-manager">
      {/* Status Messages */}
      {error && (
        <div className="error-alert" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={clearMessages} className="modal-close">×</button>
        </div>
      )}
      {success && (
        <div className="success-alert" style={{ marginBottom: '1rem' }}>
          {success}
          <button onClick={clearMessages} className="modal-close">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-button ${activeTab === 'download' ? 'active' : ''}`}
          onClick={() => setActiveTab('download')}
        >
          <i className="fas fa-download"></i> Download
        </button>
        <button 
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <i className="fas fa-upload"></i> Upload
        </button>
        <button 
          className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <i className="fas fa-plus"></i> New Products
        </button>
      </div>

      {/* Download Tab */}
      {activeTab === 'download' && (
        <div className="tab-content">
          <p className="tab-description">
            Select which fields to include in your product catalog download. 
            SKU and Product Name are always included.
          </p>

          {/* Saved Reports */}
          {savedReports.length > 0 && (
            <div className="saved-reports-section">
              <h4>Saved Reports</h4>
              <div className="saved-reports-list">
                {savedReports.map(report => (
                  <div key={report.id} className="saved-report-item">
                    <button 
                      onClick={() => loadSavedReport(report)}
                      className="saved-report-name"
                    >
                      {report.name}
                    </button>
                    <button 
                      onClick={() => deleteSavedReport(report.id)}
                      className="delete-report-btn"
                      title="Delete report"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters Section */}
          <div className="filters-section">
            <h4>Filters</h4>
            <div className="filters-grid">
              {/* Status Filter - Required */}
              <div className="filter-group">
                <label>Status</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  {isAdmin && <option value="deleted">Deleted</option>}
                </select>
              </div>

              {/* Category Filter */}
              <div className="filter-group">
                <label>Category</label>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="filter-group">
                <label>Price Range</label>
                <div className="range-inputs">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span>to</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Wholesale Price Range - Admin or wholesale addon */}
              {hasWholesale && (
                <div className="filter-group">
                  <label>Wholesale Price Range</label>
                  <div className="range-inputs">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={wholesalePriceMin}
                      onChange={(e) => setWholesalePriceMin(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                    <span>to</span>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={wholesalePriceMax}
                      onChange={(e) => setWholesalePriceMax(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              {/* Vendor Filter - Admin Only (Search & Multi-select) */}
              {isAdmin && (
                <div className="filter-group vendor-filter">
                  <label>👑 Vendors</label>
                  <div className="vendor-search-container">
                    <input 
                      type="text"
                      placeholder="Search vendors..."
                      value={vendorSearch}
                      onChange={(e) => {
                        setVendorSearch(e.target.value);
                        setShowVendorDropdown(true);
                      }}
                      onFocus={() => setShowVendorDropdown(true)}
                      onBlur={() => {
                        // Delay to allow click on dropdown option
                        setTimeout(() => setShowVendorDropdown(false), 150);
                      }}
                    />
                    {showVendorDropdown && vendorSearch && (
                      <div className="vendor-dropdown">
                        {filteredVendors.length > 0 ? (
                          filteredVendors.map(vendor => (
                            <button
                              key={vendor.id}
                              type="button"
                              onClick={() => addVendor(vendor)}
                              className="vendor-option"
                            >
                              {vendor.display_name || vendor.username}
                            </button>
                          ))
                        ) : (
                          <div className="vendor-no-results">No vendors found</div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedVendors.length > 0 && (
                    <div className="selected-vendors">
                      {selectedVendors.map(vendor => (
                        <span key={vendor.id} className="vendor-chip">
                          {vendor.display_name || vendor.username}
                          <button 
                            type="button"
                            onClick={() => removeVendor(vendor.id)}
                            className="chip-remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedVendors.length === 0 && (
                    <span className="filter-hint">All vendors (no filter)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fields Section Header */}
          <div className="fields-header">
            <h4>Fields to Include</h4>
            <div className="quick-actions">
              <button onClick={selectAll} className="secondary small">Select All</button>
              <button onClick={selectNone} className="secondary small">Select None</button>
            </div>
          </div>

          {/* Field Categories */}
          <div className="field-categories">
            {Object.entries(FIELD_CATEGORIES).map(([category, fields]) => {
              const visibleFields = getVisibleFields(fields);
              if (visibleFields.length === 0) return null;
              
              const categorySelected = visibleFields.every(f => 
                selectedFields.includes(f.key)
              );
              
              return (
                <div key={category} className="field-category">
                  <label className="category-header">
                    <input 
                      type="checkbox"
                      checked={categorySelected}
                      onChange={(e) => selectCategory(visibleFields, e.target.checked)}
                    />
                    <span className="category-title">{category}</span>
                  </label>
                  <div className="field-list">
                    {visibleFields.map(field => (
                      <label key={field.key} className="field-checkbox">
                        <input 
                          type="checkbox"
                          checked={selectedFields.includes(field.key)}
                          onChange={() => toggleField(field.key)}
                          disabled={field.required}
                        />
                        <span>{field.label}</span>
                        {field.required && <span className="required-badge">Required</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Admin Fields */}
            {isAdmin && (
              <div className="field-category admin-category">
                <label className="category-header">
                  <input 
                    type="checkbox"
                    checked={ADMIN_FIELDS.every(f => selectedFields.includes(f.key))}
                    onChange={(e) => selectCategory(ADMIN_FIELDS, e.target.checked)}
                  />
                  <span className="category-title">👑 Admin Fields</span>
                </label>
                <div className="field-list">
                  {ADMIN_FIELDS.map(field => (
                    <label key={field.key} className="field-checkbox">
                      <input 
                        type="checkbox"
                        checked={selectedFields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              onClick={() => setShowSaveModal(true)}
              className="secondary"
              disabled={loading}
            >
              <i className="fas fa-save"></i> Save This Report
            </button>
            <button 
              onClick={buildReport}
              disabled={loading || selectedFields.length < 2}
            >
              {loading ? 'Building...' : <><i className="fas fa-file-excel"></i> Download Excel File</>}
            </button>
          </div>

          <p className="field-count">
            {selectedFields.length} fields selected
          </p>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="tab-content">
          <p className="tab-description">
            Upload a CSV or Excel file to update your existing products. 
            Products are matched by SKU - any field included will be updated.
            <strong> Empty fields will be cleared.</strong>
          </p>

          <div className="upload-section">
            <div 
              className={`drop-zone ${uploadFile ? 'has-file' : ''}`}
              onClick={() => document.getElementById('catalogUploadInput').click()}
            >
              <input 
                type="file"
                id="catalogUploadInput"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              {uploadFile ? (
                <div className="file-info">
                  <i className="fas fa-file-csv"></i>
                  <span>{uploadFile.name}</span>
                  <span className="file-size">
                    ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div className="drop-prompt">
                  <i className="fas fa-cloud-upload-alt"></i>
                  <span>Click to select CSV or Excel file</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => handleUpload(false)}
              disabled={!uploadFile || uploading}
            >
              {uploading ? 'Uploading...' : <><i className="fas fa-upload"></i> Upload & Update Products</>}
            </button>
          </div>

          {/* Job Status */}
          {jobStatus && (
            <div className="job-status">
              <h4>Processing Status</h4>
              <div className="status-info">
                <span className={`status-badge ${jobStatus.status}`}>
                  {jobStatus.status}
                </span>
                {jobStatus.status === 'processing' && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(jobStatus.processedRows / jobStatus.totalRows) * 100}%` }}
                    />
                  </div>
                )}
                <span>{jobStatus.processedRows} / {jobStatus.totalRows} rows</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Products Tab */}
      {activeTab === 'new' && (
        <div className="tab-content">
          <p className="tab-description">
            Create new products by uploading a CSV or Excel file. Download the template first 
            to see all available fields.
          </p>

          <div className="template-section">
            <h4>1. Download Template</h4>
            <p>Get a sample Excel file with all available fields and example data.</p>
            <button onClick={downloadTemplate} className="secondary" disabled={loading}>
              <i className="fas fa-download"></i> Download Template
            </button>
          </div>

          <div className="upload-section">
            <h4>2. Upload New Products</h4>
            <div 
              className={`drop-zone ${uploadFile ? 'has-file' : ''}`}
              onClick={() => document.getElementById('newProductsInput').click()}
            >
              <input 
                type="file"
                id="newProductsInput"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              {uploadFile ? (
                <div className="file-info">
                  <i className="fas fa-file-csv"></i>
                  <span>{uploadFile.name}</span>
                  <span className="file-size">
                    ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div className="drop-prompt">
                  <i className="fas fa-cloud-upload-alt"></i>
                  <span>Click to select CSV or Excel file</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => handleUpload(true)}
              disabled={!uploadFile || uploading}
            >
              {uploading ? 'Uploading...' : <><i className="fas fa-plus"></i> Upload & Create Products</>}
            </button>
          </div>

          {/* Job Status */}
          {jobStatus && (
            <div className="job-status">
              <h4>Processing Status</h4>
              <div className="status-info">
                <span className={`status-badge ${jobStatus.status}`}>
                  {jobStatus.status}
                </span>
                {jobStatus.status === 'processing' && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(jobStatus.processedRows / jobStatus.totalRows) * 100}%` }}
                    />
                  </div>
                )}
                <span>{jobStatus.processedRows} / {jobStatus.totalRows} rows</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Report Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Save Report Configuration</h3>
            <p>Save these field selections for quick access later.</p>
            <input 
              type="text"
              placeholder="Report name (e.g., 'Prices Only', 'Full Catalog')"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => setShowSaveModal(false)} className="secondary">
                Cancel
              </button>
              <button onClick={handleSaveReport} disabled={loading || !reportName.trim()}>
                {loading ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .catalog-manager {
          padding: 1rem 0;
        }
        
        .tabs-container {
          display: flex;
          gap: 0;
          border-bottom: 2px solid var(--border-color, #e9ecef);
          margin-bottom: 1.5rem;
        }
        
        .tab-button {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          cursor: pointer;
          font-size: 0.95rem;
          color: var(--text-secondary, #666);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        
        .tab-button:hover {
          color: var(--primary-color, #055474);
        }
        
        .tab-button.active {
          color: var(--primary-color, #055474);
          border-bottom-color: var(--primary-color, #055474);
          font-weight: 600;
        }
        
        .tab-content {
          padding: 1rem 0;
        }
        
        .tab-description {
          color: var(--text-secondary, #666);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        
        .tab-description strong {
          color: var(--error-color, #dc3545);
        }
        
        .saved-reports-section {
          background: var(--background-light, #f8f9fa);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        
        .saved-reports-section h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.9rem;
        }
        
        .saved-reports-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .saved-report-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .saved-report-name {
          background: var(--primary-color, #055474);
          color: white;
          border: none;
          padding: 0.4rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
        }
        
        .saved-report-name:hover {
          opacity: 0.9;
        }
        
        .delete-report-btn {
          background: none;
          border: none;
          color: var(--text-secondary, #666);
          cursor: pointer;
          padding: 0.25rem;
        }
        
        .delete-report-btn:hover {
          color: var(--error-color, #dc3545);
        }
        
        .filters-section {
          background: var(--background-light, #f8f9fa);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        
        .filters-section h4 {
          margin: 0 0 1rem 0;
          font-size: 0.95rem;
        }
        
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        
        .filter-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary, #666);
        }
        
        .filter-group select,
        .filter-group input {
          padding: 0.5rem;
          border: 1px solid var(--border-color, #e9ecef);
          border-radius: 4px;
          font-size: 0.9rem;
          background: white;
        }
        
        .filter-group select:focus,
        .filter-group input:focus {
          outline: none;
          border-color: var(--primary-color, #055474);
        }
        
        .range-inputs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .vendor-filter {
          grid-column: span 2;
        }
        
        .vendor-search-container {
          position: relative;
        }
        
        .vendor-search-container input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid var(--border-color, #e9ecef);
          border-radius: 4px;
          font-size: 0.9rem;
          color: #333;
          background: white;
        }
        
        .vendor-search-container input:focus {
          outline: none;
          border-color: var(--primary-color, #055474);
        }
        
        .vendor-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid var(--border-color, #e9ecef);
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .vendor-option {
          display: block;
          width: 100%;
          padding: 0.5rem;
          text-align: left;
          background: white;
          border: none;
          border-bottom: 1px solid var(--border-color, #f0f0f0);
          cursor: pointer;
          font-size: 0.9rem;
          color: #333;
        }
        
        .vendor-option:hover {
          background: var(--background-light, #f8f9fa);
          color: #000;
        }
        
        .vendor-option:last-child {
          border-bottom: none;
        }
        
        .vendor-no-results {
          padding: 0.75rem;
          color: #6c757d;
          background: white;
          font-size: 0.9rem;
          text-align: center;
          font-style: italic;
        }
        
        .selected-vendors {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.5rem;
        }
        
        .vendor-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: var(--primary-color, #055474);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
        }
        
        .chip-remove {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          font-size: 1rem;
          line-height: 1;
          opacity: 0.8;
        }
        
        .chip-remove:hover {
          opacity: 1;
        }
        
        .filter-hint {
          font-size: 0.8rem;
          color: var(--text-secondary, #999);
          font-style: italic;
        }
        
        .range-inputs input {
          flex: 1;
          min-width: 0;
        }
        
        .range-inputs span {
          color: var(--text-secondary, #999);
          font-size: 0.85rem;
        }
        
        .fields-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .fields-header h4 {
          margin: 0;
          font-size: 0.95rem;
        }
        
        .quick-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .quick-actions button {
          font-size: 0.8rem;
          padding: 0.4rem 0.75rem;
        }
        
        .field-categories {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .field-category {
          background: var(--background-light, #f8f9fa);
          padding: 1rem;
          border-radius: 8px;
        }
        
        .field-category.admin-category {
          background: rgba(255, 193, 7, 0.1);
          border: 1px dashed #ffc107;
        }
        
        .category-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          margin-bottom: 0.75rem;
          width: fit-content;
        }
        
        .category-header input[type="checkbox"] {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
        }
        
        .category-title {
          font-weight: 600;
          white-space: nowrap;
        }
        
        .field-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.5rem;
          padding-left: 1.5rem;
        }
        
        .field-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .field-checkbox input[type="checkbox"] {
          flex-shrink: 0;
          width: 14px;
          height: 14px;
        }
        
        .field-checkbox input:disabled {
          cursor: not-allowed;
        }
        
        .required-badge {
          font-size: 0.7rem;
          background: var(--primary-color, #055474);
          color: white;
          padding: 0.15rem 0.4rem;
          border-radius: 3px;
          flex-shrink: 0;
        }
        
        .action-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .field-count {
          text-align: center;
          color: var(--text-secondary, #666);
          font-size: 0.85rem;
          margin-top: 1rem;
        }
        
        .upload-section, .template-section {
          margin-bottom: 2rem;
        }
        
        .template-section h4, .upload-section h4 {
          margin: 0 0 0.5rem 0;
        }
        
        .template-section p {
          color: var(--text-secondary, #666);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        
        .drop-zone {
          border: 2px dashed var(--border-color, #e9ecef);
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1rem;
        }
        
        .drop-zone:hover {
          border-color: var(--primary-color, #055474);
          background: rgba(5, 84, 116, 0.02);
        }
        
        .drop-zone.has-file {
          border-color: var(--success-color, #28a745);
          background: rgba(40, 167, 69, 0.05);
        }
        
        .drop-prompt {
          color: var(--text-secondary, #666);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .drop-prompt i {
          font-size: 2rem;
          color: var(--border-color, #ccc);
        }
        
        .file-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: var(--success-color, #28a745);
        }
        
        .file-info i {
          font-size: 1.5rem;
        }
        
        .file-size {
          color: var(--text-secondary, #666);
          font-size: 0.85rem;
        }
        
        .job-status {
          background: var(--background-light, #f8f9fa);
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
        }
        
        .job-status h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.9rem;
        }
        
        .status-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .status-badge.processing {
          background: rgba(255, 193, 7, 0.2);
          color: #856404;
        }
        
        .status-badge.completed {
          background: rgba(40, 167, 69, 0.2);
          color: #155724;
        }
        
        .status-badge.failed {
          background: rgba(220, 53, 69, 0.2);
          color: #721c24;
        }
        
        .progress-bar {
          flex: 1;
          min-width: 100px;
          height: 8px;
          background: var(--border-color, #e9ecef);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: var(--primary-color, #055474);
          transition: width 0.3s;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
        }
        
        .modal-content h3 {
          margin: 0 0 0.5rem 0;
        }
        
        .modal-content p {
          color: var(--text-secondary, #666);
          margin-bottom: 1rem;
        }
        
        .modal-content input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color, #e9ecef);
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 1rem;
        }
        
        .modal-buttons {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}

