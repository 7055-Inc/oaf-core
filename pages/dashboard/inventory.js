'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { authenticatedApiRequest } from '../../lib/csrf';
import { authApiRequest } from '../../lib/apiUtils';
import { hasAddon } from '../../lib/userUtils';
import styles from './Inventory.module.css';

export default function InventoryManagement() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [userData, setUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkAdjustment, setBulkAdjustment] = useState({
    type: 'set', // 'set', 'add', 'subtract'
    value: '',
    reason: ''
  });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [adjustingInventory, setAdjustingInventory] = useState(false);

  const router = useRouter();

  // Check user addons for dynamic columns
  const hasTikTokAddon = userData ? hasAddon(userData, 'tiktok-connector') : false;
  const hasAmazonAddon = userData ? hasAddon(userData, 'amazon-connector') : false;
  const hasEtsyAddon = userData ? hasAddon(userData, 'etsy-connector') : false;
  const hasAnyMarketplaceAddon = hasTikTokAddon || hasAmazonAddon || hasEtsyAddon;

  useEffect(() => {
    fetchUserPermissions();
    fetchProductsWithInventory();
  }, []);

  useEffect(() => {
    // Filter products based on search term
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.vendor_name && product.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const fetchUserPermissions = async () => {
    try {
      const response = await authApiRequest('users/me');
      if (response.ok) {
        const userDataResponse = await response.json();
        setUserData(userDataResponse);
        setUserPermissions(userDataResponse);
      }
    } catch (err) {
      console.error('Error fetching user permissions:', err);
    }
  };

  const fetchProductsWithInventory = async () => {
    try {
      setLoading(true);
      // Get products (will show only user's products unless admin)
      const response = await authenticatedApiRequest('products');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const productsData = await response.json();
      
      // For each product, get or create inventory record
      const productsWithInventory = await Promise.all(
        productsData.map(async (product) => {
          try {
            // Try to get existing inventory record
            const inventoryResponse = await authenticatedApiRequest(
              `inventory/${product.id}`
            );
            
            let inventory;
            if (inventoryResponse.ok) {
              const inventoryData = await inventoryResponse.json();
              inventory = inventoryData.inventory;
            } else {
              // Create inventory record if it doesn't exist
              inventory = {
                qty_on_hand: product.available_qty || 0,
                qty_on_order: 0,
                qty_available: product.available_qty || 0,
                reorder_qty: 0
              };
            }
            
            return {
              ...product,
              inventory
            };
          } catch (err) {
            console.error(`Error fetching inventory for product ${product.id}:`, err);
            return {
              ...product,
              inventory: {
                qty_on_hand: product.available_qty || 0,
                qty_on_order: 0,
                qty_available: product.available_qty || 0,
                reorder_qty: 0
              }
            };
          }
        })
      );

      setProducts(productsWithInventory);
      setFilteredProducts(productsWithInventory);
    } catch (err) {
      setError('Failed to load inventory data');
      console.error('Error fetching products with inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId, isSelected) => {
    if (isSelected) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleSingleInventoryUpdate = async (productId, newQuantity, reason = 'Manual adjustment') => {
    try {
      const response = await authenticatedApiRequest(
        `inventory/${productId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qty_on_hand: parseInt(newQuantity),
            change_type: 'manual_adjustment',
            reason: reason
          })
        }
      );

      if (!response.ok) throw new Error('Failed to update inventory');

      // Refresh the products list
      await fetchProductsWithInventory();
      setSuccess('Inventory updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update inventory');
      console.error('Error updating inventory:', err);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProducts.length === 0 || !bulkAdjustment.value) {
      setError('Please select products and enter a value');
      return;
    }

    setAdjustingInventory(true);
    try {
      const updatePromises = selectedProducts.map(async (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        let newQuantity;
        switch (bulkAdjustment.type) {
          case 'set':
            newQuantity = parseInt(bulkAdjustment.value);
            break;
          case 'add':
            newQuantity = (product.inventory?.qty_on_hand || 0) + parseInt(bulkAdjustment.value);
            break;
          case 'subtract':
            newQuantity = Math.max(0, (product.inventory?.qty_on_hand || 0) - parseInt(bulkAdjustment.value));
            break;
          default:
            newQuantity = product.inventory?.qty_on_hand || 0;
        }

        return authenticatedApiRequest(
          `inventory/${productId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              qty_on_hand: newQuantity,
              change_type: 'manual_adjustment',
              reason: bulkAdjustment.reason || 'Bulk inventory adjustment'
            })
          }
        );
      });

      await Promise.all(updatePromises);
      
      // Refresh the products list
      await fetchProductsWithInventory();
      setSuccess(`Successfully updated inventory for ${selectedProducts.length} products`);
      setSelectedProducts([]);
      setBulkAdjustment({ type: 'set', value: '', reason: '' });
      setShowBulkModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update inventory for some products');
      console.error('Error in bulk update:', err);
    } finally {
      setAdjustingInventory(false);
    }
  };



  const isAdmin = userPermissions?.user_type === 'admin' || 
                  (userPermissions?.permissions && userPermissions.permissions.includes('admin'));

  if (loading) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <div className={styles.loading}>Loading inventory data...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Inventory Management</h1>
          <p>Manage product inventory levels and track changes</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.controls}>
          <div className={styles.searchSection}>
            <input
              type="text"
              placeholder="Search products by name, SKU, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.bulkActions}>
            <button
              onClick={handleSelectAll}
              className={styles.selectAllButton}
            >
              {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
            </button>
            
            {selectedProducts.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className={styles.bulkUpdateButton}
              >
                Bulk Update ({selectedProducts.length})
              </button>
            )}
            

          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.inventoryTable}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Product</th>
                <th>SKU</th>
                {isAdmin && <th>Vendor</th>}
                <th>On Hand</th>
                <th>On Order</th>
                <th>Available</th>
                {hasAnyMarketplaceAddon && <th>Total Allocated</th>}
                {hasTikTokAddon && <th>TT Allocated</th>}
                {hasAmazonAddon && <th>AMZ Allocated</th>}
                {hasEtsyAddon && <th>Etsy Allocated</th>}
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <InventoryRow
                  key={product.id}
                  product={product}
                  isSelected={selectedProducts.includes(product.id)}
                  onSelect={handleProductSelect}
                  onInventoryUpdate={handleSingleInventoryUpdate}
                  showVendor={isAdmin}
                  hasAnyMarketplaceAddon={hasAnyMarketplaceAddon}
                  hasTikTokAddon={hasTikTokAddon}
                  hasAmazonAddon={hasAmazonAddon}
                  hasEtsyAddon={hasEtsyAddon}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <p>No products found matching your search criteria.</p>
          </div>
        )}

        {/* Bulk Update Modal */}
        {showBulkModal && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h3>Bulk Inventory Update</h3>
              <p>Selected {selectedProducts.length} products</p>
              
              <div className={styles.formGroup}>
                <label>Adjustment Type:</label>
                <select
                  value={bulkAdjustment.type}
                  onChange={(e) => setBulkAdjustment({...bulkAdjustment, type: e.target.value})}
                  className={styles.select}
                >
                  <option value="set">Set to specific value</option>
                  <option value="add">Add to current inventory</option>
                  <option value="subtract">Subtract from current inventory</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Value:</label>
                <input
                  type="number"
                  value={bulkAdjustment.value}
                  onChange={(e) => setBulkAdjustment({...bulkAdjustment, value: e.target.value})}
                  className={styles.input}
                  min="0"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Reason (optional):</label>
                <input
                  type="text"
                  value={bulkAdjustment.reason}
                  onChange={(e) => setBulkAdjustment({...bulkAdjustment, reason: e.target.value})}
                  className={styles.input}
                  placeholder="e.g., New stock received, Inventory correction"
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  onClick={handleBulkUpdate}
                  disabled={adjustingInventory || !bulkAdjustment.value}
                  className={styles.updateButton}
                >
                  {adjustingInventory ? 'Updating...' : 'Update Inventory'}
                </button>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual product row component
function InventoryRow({ product, isSelected, onSelect, onInventoryUpdate, showVendor, hasAnyMarketplaceAddon, hasTikTokAddon, hasAmazonAddon, hasEtsyAddon }) {
  const [editing, setEditing] = useState(false);
  const [newQuantity, setNewQuantity] = useState(product.inventory?.qty_on_hand || 0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const handleSave = async () => {
    await onInventoryUpdate(product.id, newQuantity, adjustmentReason || 'Manual adjustment');
    setEditing(false);
    setAdjustmentReason('');
  };

  const handleCancel = () => {
    setNewQuantity(product.inventory?.qty_on_hand || 0);
    setAdjustmentReason('');
    setEditing(false);
  };

  const getStatusBadge = () => {
    // Use truly available (after allocations) for status, fallback to regular available
    const available = product.inventory?.qty_truly_available !== undefined 
      ? product.inventory.qty_truly_available 
      : product.inventory?.qty_available || 0;
    const reorderLevel = product.inventory?.reorder_qty || 0;
    
    if (available <= 0) {
      return <span className={styles.statusBadge + ' ' + styles.outOfStock}>Out of Stock</span>;
    } else if (available <= reorderLevel) {
      return <span className={styles.statusBadge + ' ' + styles.lowStock}>Low Stock</span>;
    } else {
      return <span className={styles.statusBadge + ' ' + styles.inStock}>In Stock</span>;
    }
  };

  return (
    <tr className={isSelected ? styles.selectedRow : ''}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(product.id, e.target.checked)}
        />
      </td>
      <td>
        <div className={styles.productInfo}>
          <strong>{product.name}</strong>
          <small>{product.status}</small>
        </div>
      </td>
      <td>{product.sku}</td>
      {showVendor && <td>{product.vendor_name || 'Unknown'}</td>}
      <td>
        {editing ? (
          <input
            type="number"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            className={styles.quantityInput}
            min="0"
          />
        ) : (
          product.inventory?.qty_on_hand || 0
        )}
      </td>
      <td>{product.inventory?.qty_on_order || 0}</td>
      <td>{product.inventory?.qty_available || 0}</td>
      {hasAnyMarketplaceAddon && <td>{product.inventory?.total_allocated || 0}</td>}
      {hasTikTokAddon && <td>{product.inventory?.tiktok_allocated || 0}</td>}
      {hasAmazonAddon && <td>{product.inventory?.amazon_allocated || 0}</td>}
      {hasEtsyAddon && <td>{product.inventory?.etsy_allocated || 0}</td>}
      <td>{product.inventory?.reorder_qty || 0}</td>
      <td>{getStatusBadge()}</td>
      <td>
        {editing ? (
          <div className={styles.editActions}>
            <input
              type="text"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Reason for change"
              className={styles.reasonInput}
            />
            <button onClick={handleSave} className={styles.saveButton}>Save</button>
            <button onClick={handleCancel} className={styles.cancelButton}>Cancel</button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              onClick={() => setEditing(true)}
              className={styles.editButton}
            >
              Edit
            </button>
            <button
              onClick={() => window.open(`/dashboard/products/${product.id}`, '_blank')}
              className={styles.viewButton}
            >
              View
            </button>
          </div>
        )}
      </td>
    </tr>
  );
} 