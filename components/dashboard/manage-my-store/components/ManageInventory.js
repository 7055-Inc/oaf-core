import React, { useState, useEffect, useRef } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import { hasAddon } from '../../../../lib/userUtils';
import { uploadFile as csvUploadFile, getJobStatus as csvGetJobStatus } from '../../../../lib/csv';

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
  const [showAllProducts, setShowAllProducts] = useState(false); // Admin-only: show all platform products

  // Check user addons for dynamic columns
  const hasTikTokAddon = hasAddon(userData, 'tiktok-connector');
  const hasAmazonAddon = hasAddon(userData, 'amazon-connector');
  const hasEtsyAddon = hasAddon(userData, 'etsy-connector');
  const hasAnyMarketplaceAddon = hasTikTokAddon || hasAmazonAddon || hasEtsyAddon;
  
  // CSV Upload states
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvJobId, setCsvJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  // Refetch products when showAllProducts toggle changes
  useEffect(() => {
    fetchProductsWithInventory();
  }, [showAllProducts]);

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
      setSelectedProducts([]); // Clear selections when refetching
      
      // Admin can toggle to see all platform products
      const endpoint = showAllProducts && isAdmin 
        ? 'products/all?include=inventory,vendor' 
        : 'products/my';
      
      const response = await authApiRequest(endpoint);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const responseData = await response.json();
      const productsData = responseData.products || [];
      
      // For each product, get or create inventory record
      const productsWithInventory = await Promise.all(
        productsData.map(async (product) => {
          try {
            // Try to get existing inventory record with allocations
            const inventoryResponse = await authApiRequest(
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

  const handleSingleInventoryUpdate = async (productId, newQuantity, newReorderQty, reason = 'Manual adjustment') => {
    try {
      const response = await authApiRequest(
        `inventory/${productId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qty_on_hand: parseInt(newQuantity),
            reorder_qty: parseInt(newReorderQty),
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

        return authApiRequest(
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

  // CSV Upload functionality
  const handleCSVUploadStart = (jobId) => {
    setCsvJobId(jobId);
    setShowCSVModal(false);
    checkJobStatus(jobId);
  };

  const checkJobStatus = async (jobId) => {
    try {
      const data = await csvGetJobStatus(jobId);
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
    } catch (err) {
      setError('Failed to check job status');
    }
  };

  const handleViewHistory = async (product) => {
    setHistoryLoading(true);
    setShowHistoryModal(true);
    setSelectedProductHistory({ product, history: [] });

    try {
      const response = await authApiRequest(`inventory/${product.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedProductHistory({ 
          product, 
          history: data.history || [] 
        });
      }
    } catch (error) {
      console.error('Error fetching inventory history:', error);
      setSelectedProductHistory({ 
        product, 
        history: [],
        error: 'Failed to load history'
      });
    } finally {
      setHistoryLoading(false);
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

        {/* Admin-only toggle to show all platform products */}
        {isAdmin && (
          <div className={`admin-toggle-banner ${showAllProducts ? 'active' : 'inactive'}`}>
            <label>
              <input
                type="checkbox"
                checked={showAllProducts}
                onChange={(e) => setShowAllProducts(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Show All Platform Products
            </label>
            <span className="toggle-status">
              {showAllProducts 
                ? `👑 Admin View: Showing all ${products.length} products across all vendors`
                : '🔒 Showing only your products'
              }
            </span>
          </div>
        )}

        <div className="table-header">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search products by name, SKU, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="actions">
            <button onClick={() => setShowCSVModal(true)} className="secondary">
              Edit Inventory via CSV
            </button>
            
            <button onClick={handleSelectAll} className="secondary">
              {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
            </button>
            
            {selectedProducts.length > 0 && (
              <button onClick={() => setShowBulkModal(true)}>
                Bulk Update ({selectedProducts.length})
              </button>
            )}
          </div>
        </div>

        <div className="section-box">
          <table className="data-table">
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
                {showAllProducts && isAdmin && <th>Vendor</th>}
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
                  onViewHistory={handleViewHistory}
                  showVendor={showAllProducts && isAdmin}
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
        {showCSVModal && (
          <div className="modal-overlay" onClick={() => setShowCSVModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Upload Inventory CSV</h3>
                <button className="close-btn" onClick={() => setShowCSVModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p className="form-hint">Upload a CSV or Excel file with SKU and quantity columns to bulk update inventory.</p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const result = await csvUploadFile(file, 'inventory_upload');
                      handleCSVUploadStart(result.jobId);
                      setShowCSVModal(false);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* CSV Job Status Display */}
        {jobStatus && (
          <div className="toast-notification">
            <h4>CSV Processing Status</h4>
            <div className="toast-row">
              <span>Status:</span>
              <span className={`status-${jobStatus.status}`}>{jobStatus.status}</span>
            </div>
            <div><span>Progress: {jobStatus.progress}%</span></div>
            <div><span>Processed: {jobStatus.processedRows} / {jobStatus.totalRows}</span></div>
            {jobStatus.failedRows > 0 && (
              <div>
                <span>Failed: </span>
                <span className="status-failed">{jobStatus.failedRows}</span>
              </div>
            )}
            {(jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
              <button onClick={() => setJobStatus(null)} className="secondary">Dismiss</button>
            )}
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
              <h3 className="modal-title">
                Inventory History - {selectedProductHistory?.product?.name}
                <button onClick={() => setShowHistoryModal(false)} className="modal-close">×</button>
              </h3>
              <div>
                {historyLoading ? (
                  <div className="loading-state">Loading history...</div>
                ) : selectedProductHistory?.error ? (
                  <div className="error-state">{selectedProductHistory.error}</div>
                ) : selectedProductHistory?.history?.length > 0 ? (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Change Type</th>
                          <th>Previous Qty</th>
                          <th>New Qty</th>
                          <th>Change</th>
                          <th>Reason</th>
                          <th>User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProductHistory.history.map((entry, index) => (
                          <tr key={index}>
                            <td>{new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString()}</td>
                            <td>
                              <span className="status-badge" style={{ 
                                backgroundColor: entry.change_type === 'initial_stock' ? '#e3f2fd' : 
                                                entry.change_type === 'adjustment' ? '#fff3e0' : '#f3e5f5',
                                color: '#333'
                              }}>
                                {entry.change_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td>{entry.previous_qty}</td>
                            <td>{entry.new_qty}</td>
                            <td style={{ color: entry.quantity_change > 0 ? 'green' : entry.quantity_change < 0 ? 'red' : 'inherit' }}>
                              {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                            </td>
                            <td>{entry.reason || '-'}</td>
                            <td>
                              {entry.first_name && entry.last_name ? 
                                `${entry.first_name} ${entry.last_name}` : 
                                entry.username || 'System'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">No inventory history found for this product.</div>
                )}
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowHistoryModal(false)} className="secondary">Close</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// Individual product row component for inventory (moved inline)
function InventoryRow({ product, isSelected, onSelect, onInventoryUpdate, onViewHistory, showVendor, hasAnyMarketplaceAddon, hasTikTokAddon, hasAmazonAddon, hasEtsyAddon }) {
  const [editing, setEditing] = useState(false);
  const [newQuantity, setNewQuantity] = useState(product.inventory?.qty_on_hand || 0);
  const [newReorderQty, setNewReorderQty] = useState(product.inventory?.reorder_qty || 0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const handleSave = async () => {
    await onInventoryUpdate(product.id, newQuantity, newReorderQty, adjustmentReason || 'Manual adjustment');
    setEditing(false);
    setAdjustmentReason('');
  };

  const handleCancel = () => {
    setNewQuantity(product.inventory?.qty_on_hand || 0);
    setNewReorderQty(product.inventory?.reorder_qty || 0);
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
      return <span className="status-badge out-of-stock">Out of Stock</span>;
    } else if (available <= reorderLevel) {
      return <span className="status-badge low-stock">Low Stock</span>;
    } else {
      return <span className="status-badge in-stock">In Stock</span>;
    }
  };

  return (
    <tr className={isSelected ? 'selected' : ''}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(product.id, e.target.checked)}
        />
      </td>
      <td>
        <div>
          <strong>{product.name}</strong>
          <br />
          <small style={{ color: '#666' }}>{product.status}</small>
        </div>
      </td>
      <td>{product.sku}</td>
      {showVendor && (
        <td>
          <div>
            <span>{product.vendor_name || product.vendor?.username || 'Unknown'}</span>
            {product.vendor_id && (
              <small style={{ display: 'block', color: '#999' }}>ID: {product.vendor_id}</small>
            )}
          </div>
        </td>
      )}
      <td>
        {editing ? (
          <input
            type="number"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            min="0"
            style={{ width: '70px', textAlign: 'center' }}
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
      <td>
        {editing ? (
          <input
            type="number"
            value={newReorderQty}
            onChange={(e) => setNewReorderQty(e.target.value)}
            min="0"
            style={{ width: '70px', textAlign: 'center' }}
          />
        ) : (
          product.inventory?.reorder_qty || 0
        )}
      </td>
      <td>{getStatusBadge()}</td>
      <td>
        {editing ? (
          <div className="cell-actions" style={{ flexDirection: 'column', minWidth: '180px' }}>
            <input
              type="text"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Reason for change"
            />
            <div className="cell-actions">
              <button onClick={handleSave}>Save</button>
              <button onClick={handleCancel} className="secondary">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="cell-actions">
            <button onClick={() => setEditing(true)} className="secondary">Edit</button>
            <button onClick={() => window.open(`/dashboard/products/edit/${product.id}`, '_blank')} className="secondary">Edit Product</button>
            <button onClick={() => onViewHistory(product)} className="secondary">History</button>
          </div>
        )}
      </td>
    </tr>
  );
}
