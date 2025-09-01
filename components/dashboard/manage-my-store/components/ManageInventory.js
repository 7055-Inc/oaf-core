import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { hasAddon } from '../../../../lib/userUtils';
import slideInStyles from '../../SlideIn.module.css';
import CSVUploadModal from '../../../csv/CSVUploadModal';

export default function ManageInventory({ userData }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkAdjustment, setBulkAdjustment] = useState({
    type: 'set', // 'set', 'add', 'subtract'
    value: '',
    reason: ''
  });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [adjustingInventory, setAdjustingInventory] = useState(false);

  // Check user addons for dynamic columns
  const hasTikTokAddon = hasAddon(userData, 'tiktok-connector');
  const hasAmazonAddon = hasAddon(userData, 'amazon-connector');
  const hasEtsyAddon = hasAddon(userData, 'etsy-connector');
  const hasAnyMarketplaceAddon = hasTikTokAddon || hasAmazonAddon || hasEtsyAddon;
  
  // CSV Upload states
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvJobId, setCsvJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);

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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/users/me');
      if (response.ok) {
        const userData = await response.json();
        setUserPermissions(userData);
      }
    } catch (err) {
      console.error('Error fetching user permissions:', err);
    }
  };

  const fetchProductsWithInventory = async () => {
    try {
      setLoading(true);
      // Get products (will show only user's products unless admin)
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const productsData = await response.json();
      
      // For each product, get or create inventory record
      const productsWithInventory = await Promise.all(
        productsData.map(async (product) => {
          try {
            // Try to get existing inventory record with allocations
            const inventoryResponse = await authenticatedApiRequest(
              `https://api2.onlineartfestival.com/inventory/${product.id}`
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
        `https://api2.onlineartfestival.com/inventory/${productId}`,
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
          `https://api2.onlineartfestival.com/inventory/${productId}`,
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

  // CSV Upload functionality
  const handleCSVUploadStart = (jobId) => {
    setCsvJobId(jobId);
    setShowCSVModal(false);
    checkJobStatus(jobId);
  };

  const checkJobStatus = async (jobId) => {
    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/csv/job/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJobStatus(data.job);
        
        if (data.job.status === 'processing' || data.job.status === 'pending') {
          // Check again in 2 seconds
          setTimeout(() => checkJobStatus(jobId), 2000);
        } else if (data.job.status === 'completed') {
          // Refresh inventory data
          await fetchProductsWithInventory();
          setSuccess('CSV processing completed successfully!');
          setTimeout(() => setSuccess(null), 5000);
        } else if (data.job.status === 'failed') {
          setError(`CSV processing failed: ${data.job.errorSummary}`);
        }
      }
    } catch (err) {
      setError('Failed to check job status');
    }
  };

  const isAdmin = userPermissions?.user_type === 'admin' || 
                  (userPermissions?.permissions && userPermissions.permissions.includes('admin'));

  if (loading) {
    return <div className="loading-state">Loading inventory data...</div>;
  }

  return (
    <div>
        {error && <div className="error-alert">{error}</div>}
        {success && <div className="success-alert">{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search products by name, SKU, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={slideInStyles.actions}>
            <button
              onClick={() => setShowCSVModal(true)}
              className="secondary"

            >
              Edit Inventory via CSV
            </button>
            
            <button
              onClick={handleSelectAll}
              className="secondary"
            >
              {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
            </button>
            
            {selectedProducts.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
              >
                Bulk Update ({selectedProducts.length})
              </button>
            )}
          </div>
        </div>

        <div className="section-box">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>Product</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>SKU</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>On Hand</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>On Order</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>Available</th>
                {hasAnyMarketplaceAddon && (
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>Total Allocated</th>
                )}
                {hasTikTokAddon && (
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>TT Allocated</th>
                )}
                {hasAmazonAddon && (
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>AMZ Allocated</th>
                )}
                {hasEtsyAddon && (
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>Etsy Allocated</th>
                )}
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>Reorder Level</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', fontSize: '0.8rem' }}>Actions</th>
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
                  showVendor={false}
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
          <div className="empty-state">
            <p>No products found matching your search criteria.</p>
          </div>
        )}

        {/* Bulk Update Modal */}
        {showBulkModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Bulk Inventory Update</h3>
              <p>Selected {selectedProducts.length} products</p>
              
              <div>
                <label>Adjustment Type:</label>
                <select
                  value={bulkAdjustment.type}
                  onChange={(e) => setBulkAdjustment({...bulkAdjustment, type: e.target.value})}
                >
                  <option value="set">Set to specific value</option>
                  <option value="add">Add to current inventory</option>
                  <option value="subtract">Subtract from current inventory</option>
                </select>
              </div>

              <div>
                <label>Value:</label>
                <input
                  type="number"
                  value={bulkAdjustment.value}
                  onChange={(e) => setBulkAdjustment({...bulkAdjustment, value: e.target.value})}
                  min="0"
                />
              </div>

              <div>
                <label>Reason (optional):</label>
                <input
                  type="text"
                  value={bulkAdjustment.reason}
                  onChange={(e) => setBulkAdjustment({...bulkAdjustment, reason: e.target.value})}
                  placeholder="e.g., New stock received, Inventory correction"
                />
              </div>

              <div className="modal-actions">
                <button
                  onClick={handleBulkUpdate}
                  disabled={adjustingInventory || !bulkAdjustment.value}
                >
                  {adjustingInventory ? 'Updating...' : 'Update Inventory'}
                </button>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSV Upload Modal */}
        <CSVUploadModal
          isOpen={showCSVModal}
          onClose={() => setShowCSVModal(false)}
          jobType="inventory_upload"
          title="Upload Inventory CSV"
          onUploadStart={handleCSVUploadStart}
        />

        {/* CSV Job Status Display */}
        {jobStatus && (
          <div style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px', 
            background: 'white', 
            padding: '1rem', 
            borderRadius: '8px', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '300px',
            zIndex: 1100
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>CSV Processing Status</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Status:</span>
              <span style={{ 
                fontWeight: 'bold', 
                color: jobStatus.status === 'completed' ? '#059669' : 
                      jobStatus.status === 'failed' ? '#dc2626' : '#f59e0b' 
              }}>
                {jobStatus.status}
              </span>
            </div>
            <div>
              <span>Progress: {jobStatus.progress}%</span>
            </div>
            <div>
              <span>Processed: {jobStatus.processedRows} / {jobStatus.totalRows}</span>
            </div>
            {jobStatus.failedRows > 0 && (
              <div>
                <span>Failed: </span>
                <span style={{ color: '#dc2626' }}>{jobStatus.failedRows}</span>
              </div>
            )}
            {(jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
              <button
                onClick={() => setJobStatus(null)}
                className="secondary"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
    </div>
  );
}

// Individual product row component for inventory (moved inline)
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
      return <span className={`${slideInStyles.statusBadge} ${slideInStyles.statusOutOfStock}`}>Out of Stock</span>;
    } else if (available <= reorderLevel) {
      return <span className={`${slideInStyles.statusBadge} ${slideInStyles.statusLowStock}`}>Low Stock</span>;
    } else {
      return <span className={`${slideInStyles.statusBadge} ${slideInStyles.statusInStock}`}>In Stock</span>;
    }
  };

  return (
    <tr style={{ 
      backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
      borderBottom: '1px solid #dee2e6'
    }}>
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(product.id, e.target.checked)}
        />
      </td>
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
        <div>
          <strong style={{ fontSize: '0.85rem' }}>{product.name}</strong>
          <br />
          <small style={{ color: '#666', fontSize: '0.7rem' }}>{product.status}</small>
        </div>
      </td>
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{product.sku}</td>
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
        {editing ? (
          <input
            type="number"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            min="0"
            style={{ width: '70px', textAlign: 'center', fontSize: '0.8rem' }}
          />
        ) : (
          product.inventory?.qty_on_hand || 0
        )}
      </td>
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{product.inventory?.qty_on_order || 0}</td>
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{product.inventory?.qty_available || 0}</td>
      {hasAnyMarketplaceAddon && (
        <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{product.inventory?.total_allocated || 0}</td>
      )}
      {hasTikTokAddon && (
        <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{product.inventory?.tiktok_allocated || 0}</td>
      )}
      {hasAmazonAddon && (
        <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{product.inventory?.amazon_allocated || 0}</td>
      )}
      {hasEtsyAddon && (
        <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{product.inventory?.etsy_allocated || 0}</td>
      )}
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{product.inventory?.reorder_qty || 0}</td>
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>{getStatusBadge()}</td>
      <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontSize: '0.85rem' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
            <input
              type="text"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Reason for change"
              style={{ fontSize: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleSave} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Save</button>
              <button onClick={handleCancel} className="secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setEditing(true)}
              className="secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              Edit
            </button>
            <button
              onClick={() => window.open(`/dashboard/products/${product.id}`, '_blank')}
              className="secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              View
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
