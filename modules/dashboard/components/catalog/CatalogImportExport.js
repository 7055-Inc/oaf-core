/**
 * CatalogImportExport Component
 * 
 * Handles bulk import/export of product catalog data via CSV/Excel files.
 * - Download: Export products with customizable fields and filters
 * - Upload: Update existing products by SKU
 * - New Products: Bulk create new products from template
 * 
 * Uses v2 API endpoints from catalog and csv modules.
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import { exportProducts, fetchCategories } from '../../../../lib/catalog';
import { 
  uploadFile as csvUploadFile, 
  getJobStatus as csvGetJobStatus, 
  downloadTemplate as csvDownloadTemplate,
  getReports as csvGetReports,
  saveReport as csvSaveReport,
  deleteReport as csvDeleteReport
} from '../../../../lib/csv';
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

export default function CatalogImportExport({ userData }) {
  const [activeTab, setActiveTab] = useState('download');
  const [selectedFields, setSelectedFields] = useState(['sku', 'name']);
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
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState('');
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
    if (selectedVendors.some(sv => sv.id === v.id)) return false;
    return name.includes(searchLower);
  }).slice(0, 10);
  
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
        const vendorUsers = (Array.isArray(data) ? data : []).filter(
          user => user.permissions?.vendor === true
        );
        setVendors(vendorUsers);
      }
    } catch (err) {
      // Silently fail
    }
  };
  
  const loadCategories = async () => {
    try {
      const data = await fetchCategories('flat');
      setCategories(data || []);
    } catch (err) {
      // Silently fail
    }
  };

  // Poll for job status
  useEffect(() => {
    let interval;
    if (jobStatus && jobStatus.status === 'processing') {
      interval = setInterval(checkJobStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [jobStatus]);

  const loadSavedReports = async () => {
    try {
      // Use v2 CSV API
      const reports = await csvGetReports();
      setSavedReports(reports || []);
    } catch (err) {
      // Silently fail
    }
  };

  const checkJobStatus = async () => {
    if (!jobStatus?.jobId) return;
    
    try {
      // Use v2 CSV API
      const job = await csvGetJobStatus(jobStatus.jobId);
      setJobStatus(job);
      
      if (job.status === 'completed') {
        setSuccess(`Successfully processed ${job.processedRows} products!`);
        setUploadFile(null);
      } else if (job.status === 'failed') {
        setError(`Processing failed: ${job.errorSummary || 'Unknown error'}`);
      }
    } catch (err) {
      // Continue polling
    }
  };

  const toggleField = (fieldKey) => {
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
    setSelectedFields(['sku', 'name']);
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
      // Use v2 CSV API
      const report = await csvSaveReport({
        name: reportName.trim(),
        reportType: 'product_export',
        config: { fields: selectedFields }
      });
      
      setSavedReports(prev => [...prev, report]);
      setShowSaveModal(false);
      setReportName('');
      setSuccess('Report saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedReport = async (reportId) => {
    if (!confirm('Delete this saved report?')) return;
    
    try {
      // Use v2 CSV API
      await csvDeleteReport(reportId);
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
      setSuccess('Report deleted');
    } catch (err) {
      setError(err.message || 'Failed to delete report');
    }
  };

  const buildReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use v2 API for export
      const blob = await exportProducts({
        fields: selectedFields,
        status: statusFilter,
        category_id: categoryFilter || undefined,
        format: 'xlsx',
        view: isAdmin ? 'all' : 'my'
      });

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
      // Use v2 CSV API
      const data = await csvUploadFile(uploadFile, 'product_upload');
      
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
      // Use v2 CSV API for template download
      const blob = await csvDownloadTemplate('product_upload', 'xlsx');

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_upload_template.xlsx';
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

  const getVisibleFields = (fields) => {
    return fields.filter(f => {
      if (f.addon && !isAdmin && !hasAddon(userData, f.addon)) {
        return false;
      }
      return true;
    });
  };

  return (
    <div className="import-export-manager">
      {/* Status Messages */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={clearMessages} className="btn-icon">×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {success}
          <button onClick={clearMessages} className="btn-icon">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-container">
        <button 
          className={`tab ${activeTab === 'download' ? 'active' : ''}`}
          onClick={() => setActiveTab('download')}
        >
          <i className="fas fa-download"></i> Download
        </button>
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <i className="fas fa-upload"></i> Upload
        </button>
        <button 
          className={`tab ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <i className="fas fa-plus"></i> New Products
        </button>
      </div>

      {/* Download Tab */}
      {activeTab === 'download' && (
        <div className="tab-content">
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Select which fields to include in your product catalog download. 
            SKU and Product Name are always included.
          </p>

          {/* Saved Reports */}
          {savedReports.length > 0 && (
            <div className="form-card" style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Saved Reports</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {savedReports.map(report => (
                  <div key={report.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button 
                      onClick={() => loadSavedReport(report)}
                      className="btn btn-primary btn-sm"
                    >
                      {report.name}
                    </button>
                    <button 
                      onClick={() => deleteSavedReport(report.id)}
                      className="btn-icon"
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
          <div className="form-card" style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>Filters</h4>
            <div className="form-grid-3">
              {/* Status Filter */}
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select"
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  {isAdmin && <option value="deleted">Deleted</option>}
                </select>
              </div>

              {/* Category Filter */}
              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-select"
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
              <div className="form-group">
                <label className="form-label">Price Range</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="number" 
                    className="form-input"
                    placeholder="Min" 
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    min="0"
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: '#999' }}>to</span>
                  <input 
                    type="number" 
                    className="form-input"
                    placeholder="Max" 
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    min="0"
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Wholesale Price Range */}
              {hasWholesale && (
                <div className="form-group">
                  <label className="form-label">Wholesale Price Range</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      className="form-input"
                      placeholder="Min" 
                      value={wholesalePriceMin}
                      onChange={(e) => setWholesalePriceMin(e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#999' }}>to</span>
                    <input 
                      type="number" 
                      className="form-input"
                      placeholder="Max" 
                      value={wholesalePriceMax}
                      onChange={(e) => setWholesalePriceMax(e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              )}

              {/* Vendor Filter - Admin Only */}
              {isAdmin && (
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Vendors (Admin)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Search vendors..."
                      value={vendorSearch}
                      onChange={(e) => {
                        setVendorSearch(e.target.value);
                        setShowVendorDropdown(true);
                      }}
                      onFocus={() => setShowVendorDropdown(true)}
                      onBlur={() => setTimeout(() => setShowVendorDropdown(false), 150)}
                    />
                    {showVendorDropdown && vendorSearch && (
                      <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredVendors.length > 0 ? (
                          filteredVendors.map(vendor => (
                            <button
                              key={vendor.id}
                              type="button"
                              onClick={() => addVendor(vendor)}
                              className="dropdown-item"
                              style={{ display: 'block', width: '100%', textAlign: 'left' }}
                            >
                              {vendor.display_name || vendor.username}
                            </button>
                          ))
                        ) : (
                          <div style={{ padding: '0.75rem', color: '#6c757d', textAlign: 'center' }}>No vendors found</div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedVendors.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {selectedVendors.map(vendor => (
                        <span key={vendor.id} className="status-badge info">
                          {vendor.display_name || vendor.username}
                          <button 
                            type="button"
                            onClick={() => removeVendor(vendor.id)}
                            style={{ background: 'none', border: 'none', marginLeft: '4px', cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedVendors.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>All vendors (no filter)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fields Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Fields to Include</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={selectAll} className="btn btn-secondary btn-sm">Select All</button>
              <button onClick={selectNone} className="btn btn-secondary btn-sm">Select None</button>
            </div>
          </div>

          {/* Field Categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {Object.entries(FIELD_CATEGORIES).map(([category, fields]) => {
              const visibleFields = getVisibleFields(fields);
              if (visibleFields.length === 0) return null;
              
              const categorySelected = visibleFields.every(f => selectedFields.includes(f.key));
              
              return (
                <div key={category} className="form-card">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                    <input 
                      type="checkbox"
                      checked={categorySelected}
                      onChange={(e) => selectCategory(visibleFields, e.target.checked)}
                    />
                    <span style={{ fontWeight: 600 }}>{category}</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                    {visibleFields.map(field => (
                      <label key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input 
                          type="checkbox"
                          checked={selectedFields.includes(field.key)}
                          onChange={() => toggleField(field.key)}
                          disabled={field.required}
                        />
                        <span>{field.label}</span>
                        {field.required && <span className="status-badge info" style={{ fontSize: '0.7rem' }}>Required</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Admin Fields */}
            {isAdmin && (
              <div className="form-card" style={{ background: 'rgba(255, 193, 7, 0.1)', border: '1px dashed #ffc107' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                  <input 
                    type="checkbox"
                    checked={ADMIN_FIELDS.every(f => selectedFields.includes(f.key))}
                    onChange={(e) => selectCategory(ADMIN_FIELDS, e.target.checked)}
                  />
                  <span style={{ fontWeight: 600 }}>Admin Fields</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                  {ADMIN_FIELDS.map(field => (
                    <label key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
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
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              onClick={() => setShowSaveModal(true)}
              className="btn btn-secondary"
              disabled={loading}
            >
              <i className="fas fa-save"></i> Save This Report
            </button>
            <button 
              onClick={buildReport}
              className="btn btn-primary"
              disabled={loading || selectedFields.length < 2}
            >
              {loading ? 'Building...' : <><i className="fas fa-file-excel"></i> Download Excel File</>}
            </button>
          </div>

          <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: '1rem' }}>
            {selectedFields.length} fields selected
          </p>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="tab-content">
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Upload a CSV or Excel file to update your existing products. 
            Products are matched by SKU - any field included will be updated.
            <strong style={{ color: '#dc3545' }}> Empty fields will be cleared.</strong>
          </p>

          <div className="form-card">
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#28a745' }}>
                  <i className="fas fa-file-csv" style={{ fontSize: '1.5rem' }}></i>
                  <span>{uploadFile.name}</span>
                  <span style={{ color: '#666', fontSize: '0.85rem' }}>
                    ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div style={{ color: '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: '#ccc' }}></i>
                  <span>Click to select CSV or Excel file</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => handleUpload(false)}
              className="btn btn-primary"
              disabled={!uploadFile || uploading}
              style={{ marginTop: '1rem' }}
            >
              {uploading ? 'Uploading...' : <><i className="fas fa-upload"></i> Upload & Update Products</>}
            </button>
          </div>

          {/* Job Status */}
          {jobStatus && (
            <div className="form-card" style={{ marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>Processing Status</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span className={`status-badge ${jobStatus.status === 'completed' ? 'success' : jobStatus.status === 'failed' ? 'danger' : 'warning'}`}>
                  {jobStatus.status}
                </span>
                {jobStatus.status === 'processing' && (
                  <div style={{ flex: 1, minWidth: '100px', height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--primary-color)', width: `${(jobStatus.processedRows / jobStatus.totalRows) * 100}%`, transition: 'width 0.3s' }} />
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
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Create new products by uploading a CSV or Excel file. Download the template first 
            to see all available fields.
          </p>

          <div className="form-card" style={{ marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>1. Download Template</h4>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Get a sample Excel file with all available fields and example data.
            </p>
            <button onClick={downloadTemplate} className="btn btn-secondary" disabled={loading}>
              <i className="fas fa-download"></i> Download Template
            </button>
          </div>

          <div className="form-card">
            <h4 style={{ margin: '0 0 0.5rem 0' }}>2. Upload New Products</h4>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#28a745' }}>
                  <i className="fas fa-file-csv" style={{ fontSize: '1.5rem' }}></i>
                  <span>{uploadFile.name}</span>
                  <span style={{ color: '#666', fontSize: '0.85rem' }}>
                    ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div style={{ color: '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: '#ccc' }}></i>
                  <span>Click to select CSV or Excel file</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => handleUpload(true)}
              className="btn btn-primary"
              disabled={!uploadFile || uploading}
              style={{ marginTop: '1rem' }}
            >
              {uploading ? 'Uploading...' : <><i className="fas fa-plus"></i> Upload & Create Products</>}
            </button>
          </div>

          {/* Job Status */}
          {jobStatus && (
            <div className="form-card" style={{ marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>Processing Status</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span className={`status-badge ${jobStatus.status === 'completed' ? 'success' : jobStatus.status === 'failed' ? 'danger' : 'warning'}`}>
                  {jobStatus.status}
                </span>
                {jobStatus.status === 'processing' && (
                  <div style={{ flex: 1, minWidth: '100px', height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--primary-color)', width: `${(jobStatus.processedRows / jobStatus.totalRows) * 100}%`, transition: 'width 0.3s' }} />
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
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <h2>Save Report Configuration</h2>
            </div>
            <p style={{ color: '#666', marginBottom: '1rem' }}>Save these field selections for quick access later.</p>
            <input 
              type="text"
              className="form-input"
              placeholder="Report name (e.g., 'Prices Only', 'Full Catalog')"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              autoFocus
              style={{ marginBottom: '1rem' }}
            />
            <div className="modal-actions">
              <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveReport} className="btn btn-primary" disabled={loading || !reportName.trim()}>
                {loading ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .import-export-manager {
          padding: 0;
        }
        
        .tab-content {
          padding: 1.5rem 0;
        }
        
        .drop-zone {
          border: 2px dashed #e9ecef;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 0;
        }
        
        .drop-zone:hover {
          border-color: var(--primary-color);
          background: rgba(5, 84, 116, 0.02);
        }
        
        .drop-zone.has-file {
          border-color: #28a745;
          background: rgba(40, 167, 69, 0.05);
        }
      `}</style>
    </div>
  );
}
