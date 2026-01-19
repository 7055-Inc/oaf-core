'use client';
import { useState, useEffect } from 'react';
import { fetchProducts, updateInventory, fetchInventoryHistory } from '../../../../lib/catalog';
import { uploadFile as csvUploadFile, getJobStatus as csvGetJobStatus } from '../../../../lib/csv';

/**
 * InventoryManager Component
 * Manages product inventory with bulk updates and CSV import
 */
export default function InventoryManager() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adjustingInventory, setAdjustingInventory] = useState(false);
  const [bulkAdjustment, setBulkAdjustment] = useState({ type: 'set', value: '', reason: '' });
  const [jobStatus, setJobStatus] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredProducts(products.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term)
      ));
    }
  }, [searchTerm, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setSelectedProducts([]);
      
      const { products: data } = await fetchProducts({
        view: 'my',
        include: 'inventory',
        limit: 500,
      });
      
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleSingleUpdate = async (productId, qty, reorderQty, reason) => {
    try {
      await updateInventory(productId, {
        qty_on_hand: parseInt(qty),
        reorder_qty: parseInt(reorderQty),
        change_type: 'manual_adjustment',
        reason: reason || 'Manual adjustment'
      });
      await loadProducts();
      setSuccess('Inventory updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProducts.length === 0 || !bulkAdjustment.value) return;
    
    setAdjustingInventory(true);
    try {
      for (const productId of selectedProducts) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        let newQty;
        const currentQty = product.inventory?.qty_on_hand || 0;
        switch (bulkAdjustment.type) {
          case 'set': newQty = parseInt(bulkAdjustment.value); break;
          case 'add': newQty = currentQty + parseInt(bulkAdjustment.value); break;
          case 'subtract': newQty = Math.max(0, currentQty - parseInt(bulkAdjustment.value)); break;
          default: newQty = currentQty;
        }

        await updateInventory(productId, {
          qty_on_hand: newQty,
          change_type: 'manual_adjustment',
          reason: bulkAdjustment.reason || 'Bulk adjustment'
        });
      }
      
      await loadProducts();
      setSuccess(`Updated ${selectedProducts.length} products`);
      setSelectedProducts([]);
      setBulkAdjustment({ type: 'set', value: '', reason: '' });
      setShowBulkModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdjustingInventory(false);
    }
  };

  const handleCSVUpload = async (file) => {
    try {
      const result = await csvUploadFile(file, 'inventory_upload');
      setShowCSVModal(false);
      pollJobStatus(result.jobId);
    } catch (err) {
      setError(err.message);
    }
  };

  const pollJobStatus = async (jobId) => {
    try {
      const data = await csvGetJobStatus(jobId);
      setJobStatus(data.job);
      
      if (data.job.status === 'processing' || data.job.status === 'pending') {
        setTimeout(() => pollJobStatus(jobId), 2000);
      } else if (data.job.status === 'completed') {
        await loadProducts();
        setSuccess('CSV import completed');
        setTimeout(() => setSuccess(null), 5000);
      } else if (data.job.status === 'failed') {
        setError(`CSV import failed: ${data.job.errorSummary}`);
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
      const history = await fetchInventoryHistory(product.id);
      setSelectedProductHistory({ product, history });
    } catch (err) {
      setSelectedProductHistory({ product, history: [], error: err.message });
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusBadge = (inv) => {
    const available = inv?.qty_available || 0;
    const reorder = inv?.reorder_qty || 0;
    if (available <= 0) return <span className="status-badge out-of-stock">Out of Stock</span>;
    if (available <= reorder) return <span className="status-badge low-stock">Low Stock</span>;
    return <span className="status-badge in-stock">In Stock</span>;
  };

  if (loading) {
    return <div className="loading-state"><div className="spinner"></div><p>Loading inventory...</p></div>;
  }

  return (
    <div>
      {error && <div className="error-alert">{error}</div>}
      {success && <div className="success-alert">{success}</div>}

      <div className="table-header">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="actions">
          <button onClick={() => setShowCSVModal(true)} className="secondary">CSV Import</button>
          <button onClick={handleSelectAll} className="secondary">
            {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
          </button>
          {selectedProducts.length > 0 && (
            <button onClick={() => setShowBulkModal(true)}>Bulk Update ({selectedProducts.length})</button>
          )}
        </div>
      </div>

      <div className="section-box">
        <table className="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0} onChange={handleSelectAll} /></th>
              <th>Product</th>
              <th>SKU</th>
              <th>On Hand</th>
              <th>Available</th>
              <th>Reorder Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <InventoryRow
                key={product.id}
                product={product}
                isSelected={selectedProducts.includes(product.id)}
                onSelect={(id, checked) => {
                  if (checked) setSelectedProducts([...selectedProducts, id]);
                  else setSelectedProducts(selectedProducts.filter(x => x !== id));
                }}
                onUpdate={handleSingleUpdate}
                onViewHistory={handleViewHistory}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="empty-state"><p>No products found.</p></div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Bulk Inventory Update</h3>
            <p>Selected {selectedProducts.length} products</p>
            <div>
              <label>Adjustment Type:</label>
              <select value={bulkAdjustment.type} onChange={e => setBulkAdjustment({...bulkAdjustment, type: e.target.value})}>
                <option value="set">Set to value</option>
                <option value="add">Add to current</option>
                <option value="subtract">Subtract from current</option>
              </select>
            </div>
            <div>
              <label>Value:</label>
              <input type="number" value={bulkAdjustment.value} onChange={e => setBulkAdjustment({...bulkAdjustment, value: e.target.value})} min="0" />
            </div>
            <div>
              <label>Reason:</label>
              <input type="text" value={bulkAdjustment.reason} onChange={e => setBulkAdjustment({...bulkAdjustment, reason: e.target.value})} placeholder="Optional reason" />
            </div>
            <div className="modal-actions">
              <button onClick={handleBulkUpdate} disabled={adjustingInventory || !bulkAdjustment.value}>
                {adjustingInventory ? 'Updating...' : 'Update'}
              </button>
              <button onClick={() => setShowBulkModal(false)} className="secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCSVModal && (
        <div className="modal-overlay" onClick={() => setShowCSVModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Upload Inventory CSV</h3>
            <p className="form-hint">Upload a CSV/Excel file with SKU and quantity columns.</p>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={e => e.target.files?.[0] && handleCSVUpload(e.target.files[0])} />
            <div className="modal-actions">
              <button onClick={() => setShowCSVModal(false)} className="secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Job Status Toast */}
      {jobStatus && (
        <div className="toast-notification">
          <h4>CSV Processing</h4>
          <p>Status: {jobStatus.status}</p>
          <p>Progress: {jobStatus.progress}%</p>
          {(jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
            <button onClick={() => setJobStatus(null)} className="secondary small">Dismiss</button>
          )}
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <h3 className="modal-title">History - {selectedProductHistory?.product?.name}</h3>
            {historyLoading ? (
              <div className="loading-state"><div className="spinner"></div></div>
            ) : selectedProductHistory?.error ? (
              <div className="error-state">{selectedProductHistory.error}</div>
            ) : selectedProductHistory?.history?.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Previous</th><th>New</th><th>Change</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {selectedProductHistory.history.map((entry, i) => (
                      <tr key={i}>
                        <td>{new Date(entry.created_at).toLocaleString()}</td>
                        <td>{entry.change_type?.replace('_', ' ')}</td>
                        <td>{entry.previous_qty}</td>
                        <td>{entry.new_qty}</td>
                        <td style={{ color: entry.quantity_change > 0 ? 'green' : entry.quantity_change < 0 ? 'red' : 'inherit' }}>
                          {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                        </td>
                        <td>{entry.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><p>No history found.</p></div>
            )}
            <div className="modal-actions">
              <button onClick={() => setShowHistoryModal(false)} className="secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryRow({ product, isSelected, onSelect, onUpdate, onViewHistory, getStatusBadge }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(product.inventory?.qty_on_hand || 0);
  const [reorderQty, setReorderQty] = useState(product.inventory?.reorder_qty || 0);
  const [reason, setReason] = useState('');

  const handleSave = () => {
    onUpdate(product.id, qty, reorderQty, reason);
    setEditing(false);
    setReason('');
  };

  const handleCancel = () => {
    setQty(product.inventory?.qty_on_hand || 0);
    setReorderQty(product.inventory?.reorder_qty || 0);
    setReason('');
    setEditing(false);
  };

  return (
    <tr className={isSelected ? 'selected' : ''}>
      <td><input type="checkbox" checked={isSelected} onChange={e => onSelect(product.id, e.target.checked)} /></td>
      <td><strong>{product.name}</strong><br/><small>{product.status}</small></td>
      <td>{product.sku}</td>
      <td>
        {editing ? (
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0" style={{ width: '70px' }} />
        ) : (
          product.inventory?.qty_on_hand || 0
        )}
      </td>
      <td>{product.inventory?.qty_available || 0}</td>
      <td>
        {editing ? (
          <input type="number" value={reorderQty} onChange={e => setReorderQty(e.target.value)} min="0" style={{ width: '70px' }} />
        ) : (
          product.inventory?.reorder_qty || 0
        )}
      </td>
      <td>{getStatusBadge(product.inventory)}</td>
      <td>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" style={{ fontSize: '12px' }} />
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={handleSave} className="small">Save</button>
              <button onClick={handleCancel} className="secondary small">Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setEditing(true)} className="secondary small">Edit</button>
            <button onClick={() => onViewHistory(product)} className="secondary small">History</button>
          </div>
        )}
      </td>
    </tr>
  );
}
