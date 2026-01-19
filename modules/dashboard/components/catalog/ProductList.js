/**
 * ProductList Component
 * 
 * Displays a list of products with filtering, selection, and bulk actions.
 * Uses global CSS classes for styling.
 * 
 * @param {Object} props
 * @param {Object} props.userData - Current user data
 * @param {boolean} [props.adminView=false] - Show admin view (all products)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProducts, deleteProducts } from '../../../../lib/catalog';
import { getSmartMediaUrl, config } from '../../../../lib/config';

export default function ProductList({ userData, adminView = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [meta, setMeta] = useState({});
  const router = useRouter();

  const isAdmin = userData?.user_type === 'admin';

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchProducts({
        view: adminView && isAdmin ? 'all' : 'my',
        include: adminView ? 'inventory,images,vendor,children' : 'inventory,images,children',
        search: searchTerm || undefined,
      });
      
      setProducts(result.products || []);
      setMeta(result.meta || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminView, isAdmin, searchTerm]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        loadProducts();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Toggle expanded state for variable products
  const toggleExpanded = (productId) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Product selection handlers
  const handleProductSelect = (productId, isSelected) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (isSelected) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const parentProducts = products.filter(p => !p.parent_id);
    if (selectedProducts.size === parentProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(parentProducts.map(p => p.id)));
    }
  };

  // Get product thumbnail
  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      const imageUrl = typeof image === 'string' ? image : image.url;
      
      if (imageUrl.startsWith('http')) return imageUrl;
      if (imageUrl.startsWith('/temp_images/') || imageUrl.startsWith('/tmp/')) {
        return `${config.API_BASE_URL}${imageUrl}`;
      }
      return getSmartMediaUrl(imageUrl);
    }
    return null;
  };

  // Navigation handlers
  const handleEdit = (productId) => {
    router.push(`/dashboard/catalog/products/edit/${productId}`);
  };

  const handleView = (productId) => {
    router.push(`/products/${productId}`);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      await deleteProducts(Array.from(selectedProducts));
      await loadProducts();
      setSelectedProducts(new Set());
      setShowDeleteModal(false);
    } catch (err) {
      alert('Failed to delete products: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Get status badge class
  const getStatusClass = (status) => {
    const classes = {
      active: 'active',
      draft: 'muted',
      hidden: 'warning',
      deleted: 'danger',
    };
    return classes[status] || 'muted';
  };

  // Filter parent products
  const parentProducts = products.filter(product => {
    if (product.parent_id) return false;
    if (adminView && product.status === 'deleted') return false;
    return true;
  });

  // Stats
  const stats = {
    total: products.length,
    parents: parentProducts.length,
    drafts: products.filter(p => p.status === 'draft').length,
    active: products.filter(p => p.status === 'active').length,
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header with filters and actions */}
      <div className="table-header">
        <div className="search-box">
          <input
            type="text"
            className="form-input"
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="actions">
          {selectedProducts.size > 0 && (
            <button 
              className="btn btn-secondary"
              onClick={() => setSelectedProducts(new Set())}
            >
              Clear Selection
            </button>
          )}
          <button 
            className="btn btn-primary"
            onClick={() => router.push('/dashboard/catalog/products/new')}
          >
            Add New Product
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="list-filters">
        <div className="filter-stats">
          <span>Total: {stats.total}</span>
          <span>Parents: {stats.parents}</span>
          <span>Active: {stats.active}</span>
          <span>Drafts: {stats.drafts}</span>
          {selectedProducts.size > 0 && (
            <span><strong>Selected: {selectedProducts.size}</strong></span>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <div className="alert alert-warning" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{selectedProducts.size} product{selectedProducts.size === 1 ? '' : 's'} selected</span>
          <button
            className="btn btn-danger"
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      )}

      {/* Products Table */}
      <div style={{ marginTop: '20px', overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedProducts.size === parentProducts.length && parentProducts.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={{ width: '80px' }}>Image</th>
              <th>Product Name</th>
              <th>SKU</th>
              {adminView && <th>Vendor</th>}
              <th>Price</th>
              <th>Status</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parentProducts.map((product) => {
              const hasChildren = product.children && product.children.length > 0;
              const isExpanded = expandedProducts.has(product.id);
              
              return (
                <React.Fragment key={product.id}>
                  <ProductRow
                    product={product}
                    isChild={false}
                    isExpanded={isExpanded}
                    isSelected={selectedProducts.has(product.id)}
                    hasChildren={hasChildren}
                    showVendor={adminView}
                    onToggleExpand={() => toggleExpanded(product.id)}
                    onSelect={handleProductSelect}
                    onEdit={handleEdit}
                    onView={handleView}
                    getImage={getProductImage}
                    getStatusClass={getStatusClass}
                  />
                  {hasChildren && isExpanded && product.children.map(child => (
                    <ProductRow
                      key={child.id}
                      product={child}
                      isChild={true}
                      isExpanded={false}
                      isSelected={false}
                      hasChildren={false}
                      showVendor={adminView}
                      onToggleExpand={() => {}}
                      onSelect={() => {}}
                      onEdit={handleEdit}
                      onView={handleView}
                      getImage={getProductImage}
                      getStatusClass={getStatusClass}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {parentProducts.length === 0 && (
          <div className="empty-state">
            <div>
              <h3>No products found</h3>
              <p>{searchTerm ? 'Try a different search term.' : 'Create your first product to get started!'}</p>
              {!searchTerm && (
                <button 
                  className="btn btn-primary"
                  onClick={() => router.push('/dashboard/catalog/products/new')}
                >
                  Create Product
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <h2>Confirm Delete</h2>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="btn-icon"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="form-card">
              <p>
                <strong>You are about to delete {selectedProducts.size} product{selectedProducts.size === 1 ? '' : 's'}.</strong>
              </p>
              <p>
                These products will be marked as deleted and removed from your active product listings. 
                This action cannot be undone.
              </p>
              <p>
                <strong>Variable products:</strong> If you delete a parent product, all its variations will also be deleted.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleBulkDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Products'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ProductRow Component - Single product table row
 */
function ProductRow({
  product,
  isChild,
  isExpanded,
  isSelected,
  hasChildren,
  showVendor,
  onToggleExpand,
  onSelect,
  onEdit,
  onView,
  getImage,
  getStatusClass,
}) {
  const imageUrl = getImage(product);
  
  return (
    <tr className={isSelected ? 'selected' : ''} style={isChild ? { backgroundColor: '#f9fafb' } : {}}>
      <td>
        {!isChild && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(product.id, e.target.checked)}
          />
        )}
      </td>
      <td>
        <div style={{ 
          width: '60px', 
          height: '60px', 
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '20px' }}>🎨</span>
          )}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasChildren && !isChild && (
            <button
              onClick={onToggleExpand}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                padding: '4px',
                color: '#6b7280'
              }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {isChild && <span style={{ color: '#9ca3af', marginLeft: '16px' }}>└─</span>}
          <span style={{ fontWeight: isChild ? 'normal' : '500' }}>{product.name}</span>
          {product.product_type === 'variable' && !isChild && (
            <span className="status-badge info">Variable</span>
          )}
          {product.product_type === 'variant' && (
            <span className="status-badge muted">Variant</span>
          )}
        </div>
      </td>
      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#6b7280' }}>
        {product.sku || '—'}
      </td>
      {showVendor && (
        <td>
          {product.vendor?.business_name || 
           `${product.vendor?.first_name || ''} ${product.vendor?.last_name || ''}`.trim() || 
           product.vendor?.username || 
           `ID: ${product.vendor_id}`}
        </td>
      )}
      <td style={{ fontWeight: '500' }}>${parseFloat(product.price || 0).toFixed(2)}</td>
      <td>
        <span className={`status-badge ${getStatusClass(product.status)}`}>
          {product.status}
        </span>
      </td>
      <td>{product.inventory?.qty_available ?? 0}</td>
      <td>
        <div className="cell-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onView(product.id)}
          >
            View
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit(product.id)}
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}
