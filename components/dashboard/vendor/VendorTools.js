'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PolicyEditor from './PolicyEditor';
import PolicyHistory from './PolicyHistory';
import CSVUploadModal from '../../csv/CSVUploadModal';
import VendorOrders from '../../VendorOrders';
import ProductTypeModal from '../../ProductTypeModal';
import AddCategoryModal from '../../AddCategoryModal';
import VariationManager from '../../VariationManager';
import VariationBulkEditor from '../../VariationBulkEditor';
import ShipOrders from './ShipOrders';
import { authenticatedApiRequest, handleCsrfError } from '../../../lib/csrf';
import styles from '../../../pages/dashboard/Dashboard.module.css';
import slideInStyles from '../SlideIn.module.css';


// Main Vendor Tools Menu Component
export function VendorToolsMenu({ 
  userData, 
  collapsedSections, 
  toggleSection, 
  openSlideIn 
}) {
  const hasVendorPermission = userData?.permissions?.includes('vendor');
  const isAdmin = userData?.user_type === 'admin';

  if (!hasVendorPermission && !isAdmin) {
    return null;
  }

  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['vendor-tools'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('vendor-tools')}
      >
        Manage My Store
      </h3>
      
      {!collapsedSections['vendor-tools'] && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('my-products')}
            >
              My Products
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('add-product')}
            >
              Add New Product
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('my-policies')}
            >
              My Policies
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('manage-inventory')}
            >
              Manage Inventory
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('vendor-orders')}
            >
              Orders
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('ship-orders')}
            >
              Ship Orders
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

// My Policies Slide-in Content
function MyPoliciesContent({ userId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shipping');
  
  // Policy states
  const [shippingPolicy, setShippingPolicy] = useState(null);
  const [returnPolicy, setReturnPolicy] = useState(null);
  const [shippingHistory, setShippingHistory] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  
  // UI states
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isEditingReturn, setIsEditingReturn] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicyData();
  }, []);

  const loadPolicyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load shipping policy
      const shippingResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/shipping-policy', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (shippingResponse.ok) {
        const shippingData = await shippingResponse.json();
        setShippingPolicy(shippingData.policy);
      }

      // Load return policy
      const returnResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/return-policy', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (returnResponse.ok) {
        const returnData = await returnResponse.json();
        setReturnPolicy(returnData.policy);
      }

      // Load shipping policy history
      const shippingHistoryResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/shipping-policy/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (shippingHistoryResponse.ok) {
        const shippingHistoryData = await shippingHistoryResponse.json();
        setShippingHistory(shippingHistoryData.history);
      }

      // Load return policy history
      const returnHistoryResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/return-policy/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (returnHistoryResponse.ok) {
        const returnHistoryData = await returnHistoryResponse.json();
        setReturnHistory(returnHistoryData.history);
      }
      
    } catch (err) {
      console.error('Error loading policy data:', err.message);
      handleCsrfError(err);
      setError('Failed to load policy data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (policyText, policyType) => {
    if (!policyText.trim()) {
      setError('Policy text cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const endpoint = policyType === 'return' ? 'return-policy' : 'shipping-policy';
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/vendor/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          policy_text: policyText.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save policy');
      }

      const result = await response.json();
      
      if (policyType === 'shipping') {
        setShippingPolicy(result.policy);
        setIsEditingShipping(false);
      } else {
        setReturnPolicy(result.policy);
        setIsEditingReturn(false);
      }
      
      setMessage(`${policyType === 'shipping' ? 'Shipping' : 'Return'} policy saved successfully!`);
      
      // Reload policy data to get updated history
      await loadPolicyData();
      
    } catch (err) {
      console.error('Error saving policy:', err.message);
      handleCsrfError(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolicy = async (policyType) => {
    const policyName = policyType === 'shipping' ? 'shipping' : 'return';
    
    if (!confirm(`Are you sure you want to delete your custom ${policyName} policy? This will revert to the site default policy.`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const endpoint = policyType === 'return' ? 'return-policy' : 'shipping-policy';
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/vendor/${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete policy');
      }
      
      setMessage(`Custom ${policyName} policy deleted successfully. Using default policy.`);
      
      // Reload policy data
      await loadPolicyData();
      
    } catch (err) {
      console.error('Error deleting policy:', err.message);
      handleCsrfError(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h2>My Policies</h2>
        </div>
        <div className={slideInStyles.content}>
          <div className="loading-state">Loading policies...</div>
        </div>
      </div>
    );
  }

  const currentPolicy = activeTab === 'shipping' ? shippingPolicy : returnPolicy;
  const currentHistory = activeTab === 'shipping' ? shippingHistory : returnHistory;
  const isEditing = activeTab === 'shipping' ? isEditingShipping : isEditingReturn;

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h2>My Policies</h2>
        <p>Customize your shipping and return policies or use the site defaults</p>
      </div>

      <div className={slideInStyles.content}>
        {/* Policy Type Tabs */}
        <div className="tab-container">
          <button 
            className={`tab ${activeTab === 'shipping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipping')}
          >
            Shipping Policy
          </button>
          <button 
            className={`tab ${activeTab === 'return' ? 'active' : ''}`}
            onClick={() => setActiveTab('return')}
          >
            Return Policy
          </button>
        </div>

        {/* Policy Editor */}
        <PolicyEditor
          policy={currentPolicy}
          policyType={activeTab}
          isEditing={isEditing}
          onSave={(policyText) => handleSavePolicy(policyText, activeTab)}
          onCancel={() => {
            if (activeTab === 'shipping') {
              setIsEditingShipping(false);
            } else {
              setIsEditingReturn(false);
            }
            setMessage('');
            setError(null);
          }}
          onEdit={() => {
            if (activeTab === 'shipping') {
              setIsEditingShipping(true);
            } else {
              setIsEditingReturn(true);
            }
            setMessage('');
            setError(null);
          }}
          onDelete={() => handleDeletePolicy(activeTab)}
          saving={saving}
          message={message}
          error={error}
        />

        {/* Policy History */}
        <PolicyHistory 
          history={currentHistory}
          policyType={activeTab}
        />
      </div>
    </div>
  );
}

// Manage Inventory Slide-in Content
function ManageInventoryContent({ userId, onBack }) {
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
            // Try to get existing inventory record
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
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h2>Manage Inventory</h2>
        </div>
        <div className={slideInStyles.content}>
          <div className="loading-state">Loading inventory data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h2>Manage Inventory</h2>
        <p>Manage product inventory levels and track changes</p>
      </div>

      <div className={slideInStyles.content}>
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
    </div>
  );
}

// Individual product row component for inventory
function InventoryRow({ product, isSelected, onSelect, onInventoryUpdate, showVendor }) {
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
    const available = product.inventory?.qty_available || 0;
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

// My Products Slide-in Content
function MyProductsContent({ userId, onBack }) {
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/users/me', {
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
        ? 'https://api2.onlineartfestival.com/products/all?include=inventory,images,vendor'
        : 'https://api2.onlineartfestival.com/products/my/?include=inventory,images';
        
      const response = await authenticatedApiRequest(endpoint, {
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

  if (loading) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h2>My Products</h2>
        </div>
        <div className={slideInStyles.content}>
          <div className="loading-state">Loading products...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h2>My Products</h2>
        </div>
        <div className={slideInStyles.content}>
          <div className="error-state">Error: {error}</div>
        </div>
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
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h2>{showAllProducts ? 'All Products' : 'My Products'}</h2>
      </div>
      <div className={slideInStyles.content}>
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
    </div>
  );
}

// Add Product Slide-in Content
function AddProductContent({ userId, onBack }) {
  // Product type and workflow state
  const [selectedProductType, setSelectedProductType] = useState(null);
  
  // Variable product workflow state
  const [workflowStep, setWorkflowStep] = useState('type-selection'); // 'type-selection', 'simple-form', 'variation-setup', 'bulk-edit'
  const [parentProduct, setParentProduct] = useState(null);
  const [variations, setVariations] = useState([]);
  const [currentVariationStep, setCurrentVariationStep] = useState(2); // Track which variation step we're on

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',
    category_id: '',
    user_category_id: '',
    sku: '',
    status: 'draft',
    // Inventory fields for initial setup
    beginning_inventory: 0,
    reorder_qty: 0,
    width: '',
    height: '',
    depth: '',
    weight: '',
    dimension_unit: 'in',
    weight_unit: 'lbs',
    parent_id: '',
    images: [],
    // Shipping fields
    ship_method: 'free',
    ship_rate: '',
    shipping_type: 'free',
    shipping_services: ''
  });

  // Multi-package state for calculated shipping
  const [packages, setPackages] = useState([
    {
      id: 1,
      length: '',
      width: '',
      height: '',
      weight: '',
      dimension_unit: 'in',
      weight_unit: 'lbs'
    }
  ]);

  const [categories, setCategories] = useState([]);
  const [userCategories, setUserCategories] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCarrierServices, setShowCarrierServices] = useState(false);
  const [availableCarriers, setAvailableCarriers] = useState([]);
  const [carrierRates, setCarrierRates] = useState({});
  const [checkingCarriers, setCheckingCarriers] = useState(false);
  const router = useRouter();

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
    loadUserCategories();
  }, []);

  // Handle product type selection
  const handleProductTypeSelection = (type) => {
    setSelectedProductType(type);
    setFormData(prev => ({ ...prev, product_type: type }));
    setWorkflowStep('simple-form');
  };

  // Handle variation workflow steps
  const handleVariationsUpdate = (newVariations) => {
    setVariations(newVariations);
  };

  // Generate SKU for variation
  const generateSKU = (baseSKU, combinationName, index) => {
    if (!baseSKU) return `VAR-${index + 1}`;
    
    const combinationCode = combinationName
      .split(' × ')
      .map(val => val.substring(0, 2).toUpperCase())
      .join('');
    
    return `${baseSKU}-${combinationCode}`;
  };

  // Generate unique SKU for main product
  const generateUniqueSKU = (productName) => {
    const cleanName = (productName || 'PROD').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    return `${cleanName}-${timestamp}`;
  };

  const handleProductTypeToggle = () => {
    const newType = selectedProductType === 'simple' ? 'variable' : 'simple';
    setSelectedProductType(newType);
    setFormData(prev => ({ ...prev, product_type: newType }));
    
    // Keep form data, just switch the workflow step
    if (newType === 'simple') {
      setWorkflowStep('simple-form');
    } else {
      setWorkflowStep('simple-form'); // Show form with variations section
    }
  };

  // Handle activating all draft products (they're already created!)
  const handleCreateVariableProducts = async (finalizedVariations) => {
    setLoading(true);
    setError(null);

    try {
      const parentProductId = parentProduct.id;

      if (!parentProductId) {
        throw new Error('Parent product not found.');
      }

      // Update all draft products with final edits and activate them
      const activationPromises = finalizedVariations.map(async (variation) => {
        const updatePayload = {
          // Only send user-editable fields from bulk editor + activation
          // DO NOT send backend fields like parent_id, product_type, etc.
          name: variation.name,
          description: variation.description,
          short_description: variation.shortDescription,
          price: parseFloat(variation.price),
          beginning_inventory: parseInt(variation.inventory) || 0,
          reorder_qty: parseInt(variation.reorder_qty) || parseInt(variation.inventory) || 0,
          sku: variation.sku,
          width: variation.dimensions?.width || '',
          height: variation.dimensions?.height || '',
          depth: variation.dimensions?.depth || '',
          weight: variation.dimensions?.weight || '',
          dimension_unit: variation.dimensions?.dimension_unit || 'in',
          weight_unit: variation.dimensions?.weight_unit || 'lbs',
          ship_method: variation.shipping?.ship_method || 'free',
          ship_rate: variation.shipping?.ship_rate || '',
          shipping_services: variation.shipping?.shipping_services || '',
          images: (variation.images || []).map(img => typeof img === 'string' ? img : img.url),
          status: 'active' // ACTIVATE the draft!
        };

        const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/${variation.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to activate variant "${variation.name}": ${errorData.error}`);
        }

        return await response.json();
      });

      await Promise.all(activationPromises);

      // Also activate the parent product (change from draft to active)
      const parentActivationResponse = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/${parentProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'active'
        })
      });

      if (!parentActivationResponse.ok) {
        const errorData = await parentActivationResponse.json();
        throw new Error(`Failed to activate parent product: ${errorData.error}`);
      }

      // Queue new product email for variable product
      try {
        const emailResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/emails/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey: 'new_product',
            templateData: { 
              product_name: parentProduct.name, 
              product_id: parentProductId,
              product_url: `https://onlineartfestival.com/products/${parentProductId}`,
              product_description: parentProduct.description || parentProduct.short_description || '',
              product_price: `$${parentProduct.price}`,
              product_image_url: parentProduct.images && parentProduct.images.length > 0 ? parentProduct.images[0] : '',
              product_variations: `${finalizedVariations.length} variations available`
            }
          })
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(`Email queue failed: ${errorData.error}`);
        }
      } catch (queueError) {
        // Don't fail the entire product creation if email fails
        setError(`Product activated successfully, but failed to send notification email: ${queueError.message}`);
      }

      // Success! All drafts are now active products
      onBack(); // Close slide-in and let user navigate to product if desired
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to build category hierarchy display string
  const buildCategoryPath = (category, allCategories) => {
    const path = [];
    let currentCategory = category;
    
    // Build path from child to parent
    while (currentCategory) {
      path.unshift(currentCategory.name);
      if (currentCategory.parent_id) {
        currentCategory = allCategories.find(c => c.id === currentCategory.parent_id);
      } else {
        currentCategory = null;
      }
    }
    
    return path.join(' > ');
  };

  const loadCategories = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle the API response format: { success: true, categories: [...], flat_categories: [...] }
        if (data.success && Array.isArray(data.flat_categories)) {
          // Use flat_categories for dropdown but maintain hierarchy info
          const flatCategories = data.flat_categories;
          
          // Sort categories by hierarchy path for better organization
          const sortedCategories = flatCategories.sort((a, b) => {
            const pathA = buildCategoryPath(a, flatCategories);
            const pathB = buildCategoryPath(b, flatCategories);
            return pathA.localeCompare(pathB);
          });
          
          setCategories(sortedCategories);
        } else {
          console.error('Invalid categories response format:', data);
          setCategories([]);
        }
      } else {
        console.error('Failed to load categories');
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const loadUserCategories = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setUserCategories(data);
        } else {
          console.error('User categories data is not an array:', data);
          setUserCategories([]);
        }
      } else {
        console.error('Failed to load user categories');
        setUserCategories([]);
      }
    } catch (error) {
      console.error('Error loading user categories:', error);
      setUserCategories([]);
    }
  };

  const handleAddNewCategory = async (categoryData) => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });
      
      if (response.ok) {
        const newCategory = await response.json();
        // API returns category object directly, not wrapped
        setUserCategories(prev => [...prev, newCategory]);
        setFormData(prev => ({ ...prev, user_category_id: newCategory.id }));
        setShowAddCategoryModal(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Failed to create category');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'parent_id' && value === '' ? null : value;
    setFormData({ ...formData, [name]: newValue });
    
    // Reset carrier services when shipping method changes
    if (name === 'ship_method') {
      setShowCarrierServices(false);
      setAvailableCarriers([]);
      if (value !== 'calculated') {
        setFormData(prev => ({ ...prev, shipping_services: '' }));
      }
    }
  };

  const handleServiceToggle = (serviceName, isChecked) => {
    setFormData(prev => {
      let services = prev.shipping_services ? prev.shipping_services.split(',').map(s => s.trim()) : [];
      
      if (isChecked) {
        // Add service if not already present
        if (!services.includes(serviceName)) {
          services.push(serviceName);
        }
      } else {
        // Remove service
        services = services.filter(s => s !== serviceName);
      }
      
      return {
        ...prev,
        shipping_services: services.join(', ')
      };
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setLoading(true);
    try {
      const uploadFormData = new FormData();
      files.forEach(file => {
        uploadFormData.append('images', file);
      });

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/upload?product_id=new', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) throw new Error('Failed to upload images');
      
      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        images: [...(Array.isArray(prev.images) ? prev.images : []), ...(Array.isArray(data.urls) ? data.urls : [])]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index) => {
    if (!Array.isArray(formData.images)) {
      return;
    }
    
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

  const handleSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields (less strict for drafts)
      if (!saveAsDraft && (!formData.name || !formData.price || !formData.category_id || !formData.sku)) {
        throw new Error('Please fill in all required fields');
      }

      // For calculated shipping, validate that at least one package has dimensions
      if (formData.ship_method === 'calculated' && !saveAsDraft) {
        const hasValidPackage = packages.some(pkg => 
          pkg.length && pkg.width && pkg.height && pkg.weight
        );
        if (!hasValidPackage) {
          throw new Error('For calculated shipping, please provide complete dimensions for at least one package');
        }
      }

      const payload = { 
        ...formData, 
        parent_id: formData.parent_id || null,
        category_id: parseInt(formData.category_id),
        user_category_id: formData.user_category_id ? parseInt(formData.user_category_id) : null,
        price: parseFloat(formData.price),
        beginning_inventory: parseInt(formData.beginning_inventory) || 0,
        reorder_qty: parseInt(formData.reorder_qty) || 0,
        // Variable products are ALWAYS saved as draft initially (activated at the end)
        status: (selectedProductType === 'variable' || saveAsDraft) ? 'draft' : 'active',
        packages: formData.ship_method === 'calculated' ? packages : [],
        product_type: selectedProductType
      };

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Failed to create product';
        
        // Handle duplicate SKU error with user-friendly message
        if (errorMessage.includes('Duplicate entry') && errorMessage.includes('uk_products_sku')) {
          errorMessage = `SKU "${formData.sku}" already exists. Please use a different SKU.`;
        }
        
        throw new Error(errorMessage);
      }

      const newProduct = await response.json();

      // Queue new product email
      try {
        const emailResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/emails/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey: 'new_product',
            templateData: { 
              product_name: newProduct.name, 
              product_id: newProduct.id,
              product_url: `https://onlineartfestival.com/products/${newProduct.id}`,
              product_description: newProduct.description || newProduct.short_description || '',
              product_price: `$${newProduct.price}`,
              product_image_url: newProduct.images && newProduct.images.length > 0 ? newProduct.images[0] : '',
              product_variations: ''
            }
          })
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(`Email queue failed: ${errorData.error}`);
        }
      } catch (queueError) {
        // Don't fail the entire product creation if email fails
        setError(`Product created successfully, but failed to send notification email: ${queueError.message}`);
      }

      // For variable products, move to variation setup instead of redirecting
      if (selectedProductType === 'variable') {
        // Store the parent product data with the new ID
        setParentProduct({
          ...newProduct,
          id: newProduct.id
        });
        setCurrentVariationStep(2); // Reset to step 2 when starting variation setup
        setWorkflowStep('variation-setup');
      } else {
        // For simple products, close slide-in
        onBack(); // Close slide-in and let user navigate to product if desired
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = (e) => {
    handleSubmit(e, true);
  };

  // Multi-package management functions
  const addPackage = () => {
    if (packages.length < 5) {
      setPackages([...packages, {
        id: packages.length + 1,
        length: '',
        width: '',
        height: '',
        weight: '',
        dimension_unit: 'in',
        weight_unit: 'lbs'
      }]);
    }
  };

  const removePackage = (packageId) => {
    if (packages.length > 1) {
      setPackages(packages.filter(pkg => pkg.id !== packageId));
    }
  };

  const updatePackage = (packageId, field, value) => {
    setPackages(packages.map(pkg => 
      pkg.id === packageId ? { ...pkg, [field]: value } : pkg
    ));
  };

  const checkCarrierAvailability = async () => {
    setCheckingCarriers(true);
    const available = [];
    const rates = {};
    
    // Validate that we have package dimensions
    const hasValidPackages = packages.some(pkg => 
      pkg.length && pkg.width && pkg.height && pkg.weight
    );
    
    if (!hasValidPackages) {
      setError('Please enter package dimensions before checking carrier rates');
      setCheckingCarriers(false);
      return;
    }
    
    // Use sample destination for rate calculation (New York)
    const sampleDestination = {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US'
    };
    
    try {
      // Create a temporary product for rate calculation
      const testProduct = {
        packages: packages.filter(pkg => pkg.length && pkg.width && pkg.height && pkg.weight)
      };
      
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/shipping/calculate-cart-shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cart_items: [{ product_id: 'test', quantity: 1 }],
          recipient_address: sampleDestination,
          test_packages: testProduct.packages // Send package data for testing
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.shipping_results && data.shipping_results.length > 0) {
          const shippingResult = data.shipping_results[0];
          
          if (shippingResult.available_rates && shippingResult.available_rates.length > 0) {
            // Group rates by carrier
            shippingResult.available_rates.forEach(rate => {
              if (!rates[rate.carrier]) {
                rates[rate.carrier] = [];
              }
              rates[rate.carrier].push(rate);
              
              if (!available.includes(rate.carrier)) {
                available.push(rate.carrier);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting shipping rates:', error);
    }
    
    // If no rates returned, show default carriers without rates
    if (available.length === 0) {
      available.push('UPS', 'USPS');
      rates['UPS'] = [{ service: 'Ground', cost: 'Calculating...', serviceCode: 'ups-ground' }];
      rates['USPS'] = [{ service: 'Priority Mail', cost: 'Calculating...', serviceCode: 'usps-priority' }];
    }
    
    setAvailableCarriers(available);
    setCarrierRates(rates);
    setCheckingCarriers(false);
    setShowCarrierServices(true);
    setError(null);
  };

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h2>Add New Product</h2>
      </div>
      <div className={slideInStyles.content}>
        <AddCategoryModal 
          isOpen={showAddCategoryModal} 
          onClose={() => setShowAddCategoryModal(false)} 
          onSubmit={handleAddNewCategory} 
        />
        
        {/* Product Type Selection */}
        {workflowStep === 'type-selection' && (
          <div>
            <div>
              <div>
                <h1>Choose Product Type</h1>
                <p>
                  Select whether you're creating a simple product or a variable product with multiple options.
                </p>
              </div>
              
              <div className={slideInStyles.productTypeCards}>
                <div 
                  className={slideInStyles.productTypeCard}
                  onClick={() => handleProductTypeSelection('simple')}
                >
                  <div className={slideInStyles.cardIcon}>📦</div>
                  <h3>Simple Product</h3>
                  <p>A single product with one price, one SKU, and basic options.</p>
                  <ul>
                    <li>One price point</li>
                    <li>Single inventory count</li>
                    <li>Basic product setup</li>
                  </ul>
                </div>
                
                <div 
                  className={slideInStyles.productTypeCard}
                  onClick={() => handleProductTypeSelection('variable')}
                >
                  <div className={slideInStyles.cardIcon}>🎨</div>
                  <h3>Variable Product</h3>
                  <p>A product with multiple variations like colors, sizes, or styles.</p>
                  <ul>
                    <li>Multiple variations</li>
                    <li>Different prices per variation</li>
                    <li>Separate inventory tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Product Form */}
        {selectedProductType && workflowStep === 'simple-form' && (
          <div>
            <div>
              <h1>
                {selectedProductType === 'simple' 
                  ? 'Add New Simple Product' 
                  : 'Step 1: Create Your Parent Product'
                }
              </h1>
              {selectedProductType === 'variable' && (
                <p>
                  This parent data will populate to all variations by default. You can edit each variation on an upcoming step.
                </p>
                            )}
            </div>
            {error && <div className="error-alert">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="section-box">
                <h2>Basic Information</h2>
                                  <div>
                    <label>Name *</label>
                              <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
                </div>

                  <div>
                    <label>Category *</label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a category</option>
                      {Array.isArray(categories) && categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {buildCategoryPath(category, categories)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Vendor Category</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        name="user_category_id"
                        value={formData.user_category_id}
                        onChange={handleChange}
                      >
                        <option value="">Select your category (optional)</option>
                        {Array.isArray(userCategories) && userCategories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setShowAddCategoryModal(true)}
                        className="secondary"
                      >
                        Add New
                      </button>
                    </div>
                    <small className={slideInStyles.helpText}>
                      Create your own categories to organize your products
                    </small>
                  </div>

                  <div>
                    <label>Product Type</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={selectedProductType === 'variable'}
                        onChange={handleProductTypeToggle}
                      />
                      <div className="toggle-labels">
                        <span className={selectedProductType === 'simple' ? 'active' : ''}>Simple</span>
                        <span className={selectedProductType === 'variable' ? 'active' : ''}>Variable</span>
                      </div>
                    </div>
                    <small className={slideInStyles.helpText}>
                      Variable products have multiple variations (colors, sizes, etc.)
                    </small>
                  </div>
                
                <div>
                  <label>Short Description</label>
                  <textarea
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="Brief description for product listings"
                  />
                  <small className={slideInStyles.helpText}>
                    This will be shown in search results and previews
                  </small>
                </div>

                <div>
                  <label>Full Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Complete product description with details"
                  />
                  <small className={slideInStyles.helpText}>
                    This complete description will be shown on your product page
                  </small>
                </div>
            </div>

              <div className="section-box">
                <h2>Pricing & Inventory</h2>
                                <div>
                  <label>Price *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={slideInStyles.currency}>$</span>
                              <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                />
            </div>
                </div>

                                <div>
                    <label>Beginning Inventory</label>
                              <input
                  type="number"
                  name="beginning_inventory"
                  value={formData.beginning_inventory}
                  onChange={handleChange}
                  min="0"
                  placeholder="Initial quantity on hand"
                />
                  <small className={slideInStyles.helpText}>
                    Starting inventory quantity when product is created
                  </small>
                </div>

                <div>
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    name="reorder_qty"
                    value={formData.reorder_qty}
                    onChange={handleChange}
                    min="0"
                    placeholder="Reorder when inventory reaches this level"
                  />
                  <small className={slideInStyles.helpText}>
                    Alert when inventory falls to this quantity
                  </small>
            </div>

                <div>
                    <label>SKU *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                maxLength={50}
                placeholder="Unique product identifier"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, sku: generateUniqueSKU(prev.name) }))}
                className="secondary"
              >
                Generate
              </button>
                    </div>
                                         <small className={slideInStyles.helpText}>
                       Click "Generate" to create a unique SKU based on the product name
                     </small>
            </div>

                                 
               </div>

                               <div className="section-box">
                  <h2>Dimensions & Weight</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                   <div>
                     <label>Width</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input
                 type="number"
                 name="width"
                 value={formData.width}
                 onChange={handleChange}
                 step="0.01"
                 min="0"
               />
                       <select
                         name="dimension_unit"
                         value={formData.dimension_unit}
                         onChange={handleChange}
                         style={{ minWidth: '60px' }}
                       >
                         <option value="in">in</option>
                         <option value="cm">cm</option>
                       </select>
                     </div>
             </div>

                   <div>
                     <label>Height</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input
                 type="number"
                 name="height"
                 value={formData.height}
                 onChange={handleChange}
                 step="0.01"
                 min="0"
               />
                       <select
                         name="dimension_unit"
                         value={formData.dimension_unit}
                         onChange={handleChange}
                         style={{ minWidth: '60px' }}
                       >
                         <option value="in">in</option>
                         <option value="cm">cm</option>
                       </select>
                     </div>
             </div>

                   <div>
                     <label>Depth</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input
                 type="number"
                 name="depth"
                 value={formData.depth}
                 onChange={handleChange}
                 step="0.01"
                 min="0"
               />
                       <select
                         name="dimension_unit"
                         value={formData.dimension_unit}
                         onChange={handleChange}
                         style={{ minWidth: '60px' }}
                       >
                         <option value="in">in</option>
                         <option value="cm">cm</option>
                       </select>
                     </div>
             </div>

                   <div>
                     <label>Weight</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input
                 type="number"
                 name="weight"
                 value={formData.weight}
                 onChange={handleChange}
                 step="0.01"
                 min="0"
                       />
                       <select
                         name="weight_unit"
                         value={formData.weight_unit}
                         onChange={handleChange}
                         style={{ minWidth: '60px' }}
                       >
                         <option value="lbs">lbs</option>
                         <option value="kg">kg</option>
               </select>
             </div>
                   </div>
             </div>
             </div>

                 <div className="section-box">
                   <h2>Shipping Information</h2>
                   <div>
                     <label>Shipping Method</label>
                     <select
                       name="ship_method"
                       value={formData.ship_method}
                       onChange={handleChange}
 
                     >
                       <option value="free">Free Shipping</option>
                       <option value="flat_rate">Flat Rate</option>
                       <option value="calculated">Calculated</option>
                     </select>
                   </div>

                   {formData.ship_method === 'flat_rate' && (
                     <div>
                       <label>Shipping Rate per Item</label>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <span className={slideInStyles.currency}>$</span>
                         <input
                           type="number"
                           name="ship_rate"
                           value={formData.ship_rate}
                           onChange={handleChange}
                           step="0.01"
                           min="0"
                         />
                       </div>
                       <small className={slideInStyles.helpText}>
                         This rate will be multiplied by the quantity ordered
                       </small>
                     </div>
                   )}

                   {formData.ship_method === 'calculated' && (
                     <div className="section-box">
                       <h3>Package Dimensions</h3>
                       <p>
                         Define each package that this product will ship in. For example, a dining set might have multiple packages: one for the table, one for each chair, etc.
                       </p>
                       
                       {packages.map((pkg, index) => (
                         <div key={pkg.id} className="form-card">
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                             <h3>Package {index + 1}</h3>
                             {packages.length > 1 && (
                               <button 
                                 type="button" 
                                 onClick={() => removePackage(pkg.id)}
                                 style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}
                               >
                                 Remove
                               </button>
                             )}
                           </div>
                           
                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                             <div>
                               <label>Length</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input
                                   type="number"
                                   value={pkg.length}
                                   onChange={(e) => updatePackage(pkg.id, 'length', e.target.value)}
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                 />
                                 <select
                                   value={pkg.dimension_unit}
                                   onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                   style={{ minWidth: '60px' }}
                                 >
                                   <option value="in">in</option>
                                   <option value="cm">cm</option>
                                 </select>
                               </div>
                             </div>

                             <div>
                               <label>Width</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input
                                   type="number"
                                   value={pkg.width}
                                   onChange={(e) => updatePackage(pkg.id, 'width', e.target.value)}
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                 />
                                 <select
                                   value={pkg.dimension_unit}
                                   onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                   style={{ minWidth: '60px' }}
                                 >
                                   <option value="in">in</option>
                                   <option value="cm">cm</option>
                                 </select>
                               </div>
                             </div>

                             <div>
                               <label>Height</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input
                                   type="number"
                                   value={pkg.height}
                                   onChange={(e) => updatePackage(pkg.id, 'height', e.target.value)}
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                 />
                                 <select
                                   value={pkg.dimension_unit}
                                   onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                   style={{ minWidth: '60px' }}
                                 >
                                   <option value="in">in</option>
                                   <option value="cm">cm</option>
                                 </select>
                               </div>
                             </div>

                             <div>
                               <label>Weight</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input
                                   type="number"
                                   value={pkg.weight}
                                   onChange={(e) => updatePackage(pkg.id, 'weight', e.target.value)}
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                 />
                                 <select
                                   value={pkg.weight_unit}
                                   onChange={(e) => updatePackage(pkg.id, 'weight_unit', e.target.value)}
                                   style={{ minWidth: '60px' }}
                                 >
                                   <option value="lbs">lbs</option>
                                   <option value="kg">kg</option>
                                 </select>
                               </div>
                             </div>
                           </div>
                         </div>
                       ))}
                       
                       {packages.length < 5 && (
                         <button 
                           type="button" 
                           onClick={addPackage}
                           style={{ background: 'transparent', color: 'var(--primary-color)', border: '2px dashed var(--primary-color)', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px' }}
                         >
                           Add Another Package
                         </button>
                       )}
                     </div>
                   )}

                   {formData.ship_method === 'calculated' && !showCarrierServices && (
                     <div>
                       <button 
                         type="button"
                         onClick={checkCarrierAvailability}
                         disabled={checkingCarriers}
                       >
                         {checkingCarriers ? 'Checking Available Carriers...' : 'Choose Carrier Services'}
                       </button>
                       <small className={slideInStyles.helpText}>
                         Click to check which carriers are available and select shipping services
                       </small>
                     </div>
                   )}

                   {formData.ship_method === 'calculated' && showCarrierServices && (
                     <div>
                       <label>Select Carrier Services</label>
                       <div className={slideInStyles.carrierServicesGrid}>
                                                    {availableCarriers.includes('UPS') && (
                             <div className={slideInStyles.carrierGroup}>
                             <h4>UPS Services</h4>
                             {carrierRates['UPS'] && carrierRates['UPS'].length > 0 ? (
                               carrierRates['UPS'].map((rate, index) => (
                                 <div key={index} className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id={`ups-${rate.serviceCode || index}`}
                                       checked={formData.shipping_services.includes(`UPS ${rate.service}`)}
                                       onChange={(e) => handleServiceToggle(`UPS ${rate.service}`, e.target.checked)}
                                     />
                                     <label htmlFor={`ups-${rate.serviceCode || index}`}>UPS {rate.service}</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>
                                     {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                   </span>
                                 </div>
                               ))
                             ) : (
                               <>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="ups-ground"
                                       checked={formData.shipping_services.includes('UPS Ground')}
                                       onChange={(e) => handleServiceToggle('UPS Ground', e.target.checked)}
                                     />
                                     <label htmlFor="ups-ground">UPS Ground</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="ups-3day"
                                       checked={formData.shipping_services.includes('UPS 3 Day Select')}
                                       onChange={(e) => handleServiceToggle('UPS 3 Day Select', e.target.checked)}
                                     />
                                     <label htmlFor="ups-3day">UPS 3 Day Select</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                               </>
                             )}
                           </div>
                         )}

                         {availableCarriers.includes('FedEx') && (
                           <div className={slideInStyles.carrierGroup}>
                             <h4>FedEx Services</h4>
                             {carrierRates['FedEx'] && carrierRates['FedEx'].length > 0 ? (
                               carrierRates['FedEx'].map((rate, index) => (
                                 <div key={index} className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id={`fedex-${rate.serviceCode || index}`}
                                       checked={formData.shipping_services.includes(`FedEx ${rate.service}`)}
                                       onChange={(e) => handleServiceToggle(`FedEx ${rate.service}`, e.target.checked)}
                                     />
                                     <label htmlFor={`fedex-${rate.serviceCode || index}`}>FedEx {rate.service}</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>
                                     {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                   </span>
                                 </div>
                               ))
                             ) : (
                               <>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="fedex-ground"
                                       checked={formData.shipping_services.includes('FedEx Ground')}
                                       onChange={(e) => handleServiceToggle('FedEx Ground', e.target.checked)}
                                     />
                                     <label htmlFor="fedex-ground">FedEx Ground</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                               </>
                             )}
                           </div>
                         )}

                         {availableCarriers.includes('USPS') && (
                           <div className={slideInStyles.carrierGroup}>
                             <h4>USPS Services</h4>
                             {carrierRates['USPS'] && carrierRates['USPS'].length > 0 ? (
                               carrierRates['USPS'].map((rate, index) => (
                                 <div key={index} className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id={`usps-${rate.serviceCode || index}`}
                                       checked={formData.shipping_services.includes(`USPS ${rate.service}`)}
                                       onChange={(e) => handleServiceToggle(`USPS ${rate.service}`, e.target.checked)}
                                     />
                                     <label htmlFor={`usps-${rate.serviceCode || index}`}>USPS {rate.service}</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>
                                     {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                   </span>
                                 </div>
                               ))
                             ) : (
                               <>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="usps-ground"
                                       checked={formData.shipping_services.includes('USPS Ground Advantage')}
                                       onChange={(e) => handleServiceToggle('USPS Ground Advantage', e.target.checked)}
                                     />
                                     <label htmlFor="usps-ground">USPS Ground Advantage</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="usps-priority"
                                       checked={formData.shipping_services.includes('USPS Priority Mail')}
                                       onChange={(e) => handleServiceToggle('USPS Priority Mail', e.target.checked)}
                                     />
                                     <label htmlFor="usps-priority">USPS Priority Mail</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="usps-express"
                                       checked={formData.shipping_services.includes('USPS Priority Mail Express')}
                                       onChange={(e) => handleServiceToggle('USPS Priority Mail Express', e.target.checked)}
                                     />
                                     <label htmlFor="usps-express">USPS Priority Mail Express</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                               </>
                             )}
                           </div>
                         )}
                       </div>
                       <small className={slideInStyles.helpText}>
                         Select which carrier services you want to offer to customers. Real-time rates will be calculated at checkout.
                       </small>
                       <div className={slideInStyles.carrierActions}>
                         <button 
                           type="button"
                           onClick={() => setShowCarrierServices(false)}
                           className="secondary"
                         >
                           Hide Carrier Services
                         </button>
                         <button 
                           type="button"
                           onClick={checkCarrierAvailability}
                           disabled={checkingCarriers}
                           className="secondary"
                         >
                           {checkingCarriers ? 'Rechecking...' : 'Recheck Carriers'}
                         </button>
                       </div>
                     </div>
                   )}
                 </div>

               <div className="section-box">
                 <h2>Images</h2>
                 <div>
               <input
                     type="file"
                     accept="image/*"
                     multiple
                     onChange={handleImageUpload}
                   />
                   <div>
                     {loading ? 'Uploading...' : 'Upload Images'}
             </div>
             </div>
                 
                   {Array.isArray(formData.images) && formData.images.length > 0 && (
                   <div>
                       {formData.images.map((imageUrl, index) => (
                         <div key={index}>
                           <div>
                             <img 
                               src={imageUrl.startsWith('http') ? imageUrl : `https://api2.onlineartfestival.com${imageUrl}`} 
                               alt={`Product ${index + 1}`} 
                             />
                           </div>
                           <div>
                             <button 
                               type="button" 
                               onClick={() => removeImage(index)}
                               className="secondary"
                             >
                               Remove
                             </button>
                           </div>
             </div>
                     ))}
             </div>
                 )}
             </div>

             {/* Variations Section - Only shown for variable products */}
             {selectedProductType === 'variable' && (
               <div className="section-box">
                 <h2>Product Variations</h2>
                 <div>
                   <p>
                     Variable products allow customers to choose from different options like colors, sizes, or styles. 
                     Each variation can have its own price, inventory, and images.
                   </p>
                   <p>
                     <strong>Note:</strong> You'll set up the specific variations and their details after creating the base product.
                   </p>
                 </div>
               </div>
             )}
 
             </div>
 
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <button 
                type="button" 
                onClick={handleSaveAsDraft}
                disabled={loading}
                className="secondary"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
          </div>
        )}

        {/* Variation Setup */}
        {selectedProductType === 'variable' && workflowStep === 'variation-setup' && (
          <div>
            <div>
              <div>
                <h1>
                  {currentVariationStep === 2 ? 'Step 2: Setup Product Variations' : 'Step 3: Select Variations'}
                </h1>
                <p>
                  {currentVariationStep === 2 
                    ? 'Choose the types of variations your product will have (color, size, style, etc.)'
                    : 'Choose which variations you want to create. Each will become a separate product.'
                  }
                </p>
              </div>
              {error && <div className="error-alert">{error}</div>}
              
              <VariationManager
                onNext={async (variations) => {
                  setVariations(variations);
                  setCurrentVariationStep(4);
                  
                  // Create draft child products with the variations data
                  setLoading(true);
                  setError(null);
                  
                  try {
                    const parentProductId = parentProduct.id;
                    
                    if (!parentProductId) {
                      throw new Error('Parent product not found. Please go back and create the parent product first.');
                    }
                    
                    if (!variations || variations.length === 0) {
                      throw new Error('No variations found. Please set up variations first.');
                    }
                    
                    // Create draft children for each variation combination
                    // Add delay between requests to prevent rate limiting
                    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                    
                    const createdDrafts = [];
                    
                    for (let i = 0; i < variations.length; i++) {
                      const variation = variations[i];
                      
                      // Add delay between product creation requests
                      if (i > 0) {
                        await delay(500); // 500ms delay between product creations (light throttling)
                      }
                      
                      const combinationName = variation.combination
                        .filter(c => c && c.valueName)
                        .map(c => c.valueName)
                        .join(' × ');
                      
                      const { id, created_at, updated_at, parent_id, ...parentProductWithoutId } = parentProduct;
                      const draftPayload = {
                        ...parentProductWithoutId,
                        name: `${parentProduct.name} - ${combinationName}`,
                        sku: generateSKU(parentProduct.sku || '', combinationName, i),
                        parent_id: parentProductId,
                        product_type: 'variant',
                        status: 'draft'
                      };

                      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(draftPayload)
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Failed to create draft for "${combinationName}": ${errorData.error}`);
                      }

                      const createdProduct = await response.json();
                      
                      // Store variation data with delays between requests
                      const variationCombos = variation.combination.filter(combo => combo && combo.typeId && combo.valueId);
                      
                      for (let j = 0; j < variationCombos.length; j++) {
                        const combo = variationCombos[j];
                        
                        // Add delay between variation creation requests
                        if (j > 0) {
                          await delay(200); // 200ms delay between variation creations (light throttling)
                        }
                        
                        const variationResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/variations', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            product_id: createdProduct.id,
                            variation_type_id: combo.typeId,
                            variation_value_id: combo.valueId
                          })
                        });

                        if (!variationResponse.ok) {
                          const errorData = await variationResponse.json();
                          throw new Error(`Failed to store variation data for "${combo.typeName}": ${errorData.error}`);
                        }
                      }
                      
                      createdDrafts.push(createdProduct);
                    }
                    setVariations(createdDrafts);
                    setWorkflowStep('bulk-edit');
                    
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                onBack={() => {
                  setWorkflowStep('simple-form');
                  setCurrentVariationStep(1);
                }}
                onVariationsChange={(variations) => {
                  setVariations(variations);
                }}
                onStepChange={setCurrentVariationStep}
                productId={parentProduct?.id} // Pass parent product ID
              />
            </div>
          </div>
        )}

        {/* Bulk Editor */}
        {selectedProductType === 'variable' && workflowStep === 'bulk-edit' && (
          <div>
            <div>
              <div>
                <h1>Step 4: Customize Product Variations</h1>
                <p>
                  Customize each variation before creating them as products. You can set individual prices, SKUs, and inventory levels.
                </p>
              </div>
              {error && <div className="error-alert">{error}</div>}
              
              <VariationBulkEditor
                variations={variations}
                parentProductData={parentProduct}
                onSave={handleCreateVariableProducts}
                onBack={() => setWorkflowStep('variation-setup')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Slide-in Content Renderer
export function VendorToolsSlideIn({ 
  slideInContent, 
  userData, 
  closeSlideIn 
}) {
  if (!slideInContent || !userData) return null;

  switch (slideInContent.type) {
    case 'my-policies':
      return <MyPoliciesContent userId={userData.id} onBack={closeSlideIn} />;
    case 'manage-inventory':
      return <ManageInventoryContent userId={userData.id} onBack={closeSlideIn} />;
    case 'vendor-orders':
      return (
        <div className={slideInStyles.container}>
          <div className={slideInStyles.header}>
            <button onClick={closeSlideIn} className={slideInStyles.backButton}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </button>
            <h2>Orders</h2>
          </div>
          <div className={slideInStyles.content}>
            <VendorOrders />
          </div>
        </div>
      );
    case 'my-products':
      return <MyProductsContent userId={userData.id} onBack={closeSlideIn} />;
    case 'add-product':
      return <AddProductContent userId={userData.id} onBack={closeSlideIn} />;
    case 'ship-orders':
      return <ShipOrders userId={userData.id} onBack={closeSlideIn} />;
    default:
      return null;
  }
}

// Helper to check if this menu handles a slide-in type
export const vendorToolsSlideInTypes = ['my-policies', 'manage-inventory', 'vendor-orders', 'my-products', 'add-product', 'ship-orders'];

// Default export for backward compatibility
export default VendorToolsMenu; 