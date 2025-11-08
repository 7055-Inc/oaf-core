import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getSmartMediaUrl, config, getApiUrl } from '../../../../lib/config';
import styles from '../../../../pages/dashboard/Dashboard.module.css';

export default function MyProducts({ userData }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [showAllProducts]);

  const fetchCurrentUser = async () => {
    try {
      const response = await authApiRequest('users/me', {
        method: 'GET'
      });

      if (response.ok) {
        const userData = await response.json();
        setIsAdmin(userData.user_type === 'admin');
      }
    } catch (err) {
      // Silently handle errors - user just won't see admin features
    }
  };

  const fetchProducts = async () => {
    try {
      const endpoint = showAllProducts && isAdmin 
        ? 'products/all?include=inventory,images,vendor'
        : 'products/my?include=inventory,images';
        
      const response = await authApiRequest(endpoint, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (productId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleProductSelect = (productId, isSelected) => {
    const newSelected = new Set(selectedProducts);
    if (isSelected) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    const parentProducts = products.filter(product => !product.parent_id);
    if (selectedProducts.size === parentProducts.length) {
      // Deselect all
      setSelectedProducts(new Set());
    } else {
      // Select all parent products
      setSelectedProducts(new Set(parentProducts.map(p => p.id)));
    }
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      // Handle new format: {url, is_primary} or old format: string
      const imageUrl = typeof image === 'string' ? image : image.url;
      // Ensure absolute URL
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      // For temp images, serve directly from API domain
      if (imageUrl.startsWith('/temp_images/') || imageUrl.startsWith('/tmp/')) {
        return `${config.API_BASE_URL}${imageUrl}`;
      }
      // For processed images with media IDs, use smart serving
      return getSmartMediaUrl(imageUrl);
    }
    return null;
  };

  const handleEdit = (productId) => {
    router.push(`/dashboard/products/${productId}`);
  };

  const handleView = (productId) => {
    router.push(`/products/${productId}`);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const response = await authenticatedApiRequest(getApiUrl('products/bulk-delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_ids: Array.from(selectedProducts)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete products');
      }

      // Refresh the products list
      await fetchProducts();
      
      // Clear selections and close modal
      setSelectedProducts(new Set());
      setShowDeleteModal(false);
      
    } catch (err) {
      console.error('Error deleting products:', err);
      alert('Failed to delete products: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'active': styles.statusActive,
      'draft': styles.statusDraft,
      'hidden': styles.statusHidden,
      'deleted': styles.statusDeleted
    };
    
    return (
      <span className={`${styles.statusBadge} ${statusClasses[status] || ''}`}>
        {status}
      </span>
    );
  };

  const renderProductRow = (product, isChild = false) => {
    const hasChildren = product.children && product.children.length > 0;
    const isExpanded = expandedProducts.has(product.id);
    const isSelected = selectedProducts.has(product.id);
    const imageUrl = getProductImage(product);
    
    return (
      <tr key={product.id} className={isChild ? styles.childRow : styles.parentRow}>
        <td className={styles.checkboxCell}>
          {!isChild && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleProductSelect(product.id, e.target.checked)}
              className={styles.productCheckbox}
            />
          )}
        </td>
        <td className={styles.thumbnailCell}>
          <div className={styles.thumbnailContainer}>
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={product.name}
                className={styles.productThumbnail}
              />
            ) : (
              <div className={styles.noThumbnail}>
                🎨
              </div>
            )}
          </div>
        </td>
        <td className={styles.nameCell}>
          <div className={`${styles.productName} ${isChild ? styles.childProduct : ''}`}>
            {hasChildren && !isChild && (
              <button
                className={styles.expandButton}
                onClick={() => toggleExpanded(product.id)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            {isChild && <span className={styles.childIndicator}>└─</span>}
            <span className={styles.productNameText}>{product.name}</span>
            {product.product_type === 'variable' && !isChild && (
              <span className={styles.productTypeBadge}>Variable</span>
            )}
            {product.product_type === 'variant' && (
              <span className={styles.productTypeBadge}>Variant</span>
            )}
          </div>
        </td>
        <td className={styles.skuCell}>{product.sku}</td>
        {showAllProducts && (
          <td className={styles.vendorCell}>
            {product.vendor?.business_name || 
             `${product.vendor?.first_name} ${product.vendor?.last_name}`.trim() || 
             product.vendor?.username || 
             `ID: ${product.vendor_id}`}
          </td>
        )}
        <td className={styles.priceCell}>${product.price}</td>
        <td className={styles.statusCell}>
          {getStatusBadge(product.status)}
        </td>
        <td className={styles.stockCell}>
          {product.inventory?.qty_available || 0}
        </td>
        <td className={styles.actionsCell}>
          <div className={styles.actionButtons}>
            <button
              className="secondary"
              onClick={() => handleView(product.id)}
            >
              View
            </button>
            <button
              className="secondary"
              onClick={() => window.open(`/dashboard/products/${product.id}`, '_blank')}
            >
              Edit
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '16px', color: '#6c757d' }}>Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        backgroundColor: '#f8d7da', 
        color: '#721c24', 
        padding: '12px 16px', 
        borderRadius: '6px', 
        marginBottom: '24px',
        border: '1px solid #f5c6cb'
      }}>
        Error: {error}
      </div>
    );
  }

  // Filter only parent products (no parent_id) for main display
  const parentProducts = products.filter(product => {
    if (product.parent_id) return false; // Skip child products
    if (showAllProducts && product.status === 'deleted') return false; // Skip deleted products in "All Products" view
    return true;
  });

  return (
    <div>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            {isAdmin && (
              <div className={styles.adminToggle}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={showAllProducts}
                    onChange={(e) => setShowAllProducts(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                  <span className={styles.toggleText}>
                    {showAllProducts ? 'Showing All Products' : 'Show All Products'}
                  </span>
                </label>
              </div>
            )}
          </div>
          <div className={styles.headerActions}>
            <div className={styles.productCounts}>
              <span className={styles.countItem}>
                Total: {products.length}
              </span>
              <span className={styles.countItem}>
                Parents: {parentProducts.length}
              </span>
              <span className={styles.countItem}>
                Drafts: {products.filter(p => p.status === 'draft').length}
              </span>
              {selectedProducts.size > 0 && (
                <span className={styles.countItem}>
                  Selected: {selectedProducts.size}
                </span>
              )}
            </div>
            <div className={styles.headerButtons}>
              {selectedProducts.size > 0 && (
                <button 
                  className={styles.secondaryButton}
                  onClick={() => setSelectedProducts(new Set())}
                >
                  Clear Selection
                </button>
              )}
              <button 
                className={styles.primaryButton}
                onClick={() => router.push('/products/new')}
              >
                Add New Product
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedProducts.size > 0 && (
          <div className={styles.bulkActionsBar}>
            <div className={styles.bulkActionsContent}>
              <span className={styles.bulkActionsText}>
                {selectedProducts.size} product{selectedProducts.size === 1 ? '' : 's'} selected
              </span>
              <div className={styles.bulkActionsButtons}>
                <button
                  className={styles.bulkDeleteButton}
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxHeader}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === parentProducts.length && parentProducts.length > 0}
                    onChange={handleSelectAll}
                    className={styles.selectAllCheckbox}
                  />
                </th>
                <th className={styles.thumbnailHeader}>Image</th>
                <th>Product Name</th>
                <th>SKU</th>
                {showAllProducts && <th>Vendor</th>}
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
                    {renderProductRow(product)}
                    {hasChildren && isExpanded && 
                      product.children.map(child => renderProductRow(child, true))
                    }
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {parentProducts.length === 0 && (
            <div className={styles.emptyState}>
              <p>No products found. Create your first product to get started!</p>
              <button 
                className={styles.primaryButton}
                onClick={() => router.push('/products/new')}
              >
                Create Product
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Confirm Delete</h3>
                <button 
                  className={styles.closeButton}
                  onClick={() => setShowDeleteModal(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
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
              <div className={styles.modalActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className={styles.deleteButton}
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
