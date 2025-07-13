import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../../components/Header';
import { authenticatedApiRequest } from '../../../lib/csrf';
import styles from '../Dashboard.module.css';

export default function VendorProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/my/?include=inventory,images', {
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
      const imageUrl = product.images[0];
      // Ensure absolute URL
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      return `https://api2.onlineartfestival.com${imageUrl}`;
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/bulk-delete', {
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
              className={styles.secondaryButton}
              onClick={() => handleView(product.id)}
            >
              View
            </button>
            <button
              className={styles.primaryButton}
              onClick={() => handleEdit(product.id)}
            >
              Edit
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (error) return <div className={styles.container}>Error: {error}</div>;

  // Filter only parent products (no parent_id) for main display
  const parentProducts = products.filter(product => !product.parent_id);

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>My Products</h1>
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
                <>
                  {renderProductRow(product)}
                  {hasChildren && isExpanded && 
                    product.children.map(child => renderProductRow(child, true))
                  }
                </>
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
    </>
  );
} 