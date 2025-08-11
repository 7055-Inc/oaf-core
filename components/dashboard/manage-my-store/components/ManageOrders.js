import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, handleCsrfError, refreshAuthToken } from '../../../../lib/csrf';
import slideInStyles from '../../SlideIn.module.css';
import ShipSubscriptions from '../../my-subscriptions/components/ShipSubscriptions';

export default function ManageOrders({ userData }) {
  // Add defensive check for userData
  if (!userData) {
    return <div>Loading user data...</div>;
  }
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unshipped');
  const [orders, setOrders] = useState([]);
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [standaloneLabels, setStandaloneLabels] = useState([]);
  const [selectedStandaloneLabels, setSelectedStandaloneLabels] = useState([]);
  const [selectedForMerge, setSelectedForMerge] = useState([]); // Temp selection for merging
  const [mergedGroups, setMergedGroups] = useState({}); // { groupId: [item_ids] }
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [labelForm, setLabelForm] = useState({ length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' });
  const [packages, setPackages] = useState([labelForm]); // Array for multi-packages
  const [rates, setRates] = useState([]); // For displaying fetched rates
  const [showAllRates, setShowAllRates] = useState(false); // For 'see more'
  const [selectedRate, setSelectedRate] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [groupForms, setGroupForms] = useState({}); // { groupId: { carrier, trackingNumber, packages, rates, selectedRate } }
  const [singleItemForms, setSingleItemForms] = useState({}); // { itemId: { carrier, trackingNumber, packages, rates, selectedRate } }

  // Restore states
  const [batchResults, setBatchResults] = useState([]); // For displaying success/errors
  
  // Pagination for shipped orders
  const [shippedOrdersLimit, setShippedOrdersLimit] = useState(50);

  // Shipping subscription modal state
  const [showShippingModal, setShowShippingModal] = useState(false);

  // Check if user has shipping permission
  const hasShippingPermission = (userData && userData.permissions && userData.permissions.includes('shipping')) || false;

  // Handle shipping access request
  const handleShippingAccess = () => {
    setShowShippingModal(true);
  };

  // Handle shipping modal close
  const handleShippingModalClose = async () => {
    setShowShippingModal(false);
    // Force token refresh to get updated permissions
    await refreshAuthToken();
    // Reload page to update userData with new permissions
    window.location.reload();
  };

  useEffect(() => {
    if (activeTab === 'labels') {
      fetchLabels();
      fetchStandaloneLabels();
    } else {
      fetchOrders(activeTab);
    }
  }, [activeTab]);

  const fetchOrders = async (tab) => {
      setLoading(true);
    try {
      const status = tab === 'unshipped' ? 'unshipped' : 'shipped';
      const token = localStorage.getItem('token'); // Get auth token (common in your app)
      const response = await fetch(`https://api2.onlineartfestival.com/vendor/orders/my?status=${status}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/shipping/my-labels', {
        method: 'GET'
      });

      const data = await response.json();
      if (data.success) {
        setLabels(data.labels || []);
      } else {
        console.error('Error fetching labels:', data.error);
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
      handleCsrfError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandaloneLabels = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/standalone-labels', {
        method: 'GET'
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Standalone API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 403) {
          console.log('No permission for standalone labels');
          setStandaloneLabels([]);
          return;
        } else if (response.status === 500) {
          console.log('Server error for standalone labels');
          setStandaloneLabels([]);
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setStandaloneLabels(data.labels || []);
      } else {
        console.error('Error fetching standalone labels:', data.error);
        setStandaloneLabels([]);
      }
    } catch (error) {
      console.error('Error fetching standalone labels:', error);
      setStandaloneLabels([]);
      handleCsrfError(error);
    }
  };

  const voidLabel = async (labelId, trackingNumber) => {
    if (!confirm('Are you sure you want to void this label? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/shipping/cancel-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          trackingNumber: trackingNumber,
          labelId: labelId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Label voided successfully! The order item has been reset to pending status and can be re-shipped.');
        // Refresh the labels to show updated status
        fetchLabels();
      } else {
        alert(data.error || 'Failed to void label');
      }
    } catch (error) {
      console.error('Error voiding label:', error);
      handleCsrfError(error);
      alert('Failed to void label: ' + error.message);
    }
  };

  const printSelectedLabels = async () => {
    if (selectedLabels.length === 0) {
      alert('Please select labels to print');
      return;
    }

    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/shipping/batch-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ labelIds: selectedLabels })
      });

      const data = await response.json();
      
      if (data.downloadUrl) {
        // Open the batch PDF in a new tab
        window.open(`https://api2.onlineartfestival.com${data.downloadUrl}`, '_blank');
      } else {
        alert(data.message || 'Batch processing completed');
      }
    } catch (error) {
      console.error('Error processing batch labels:', error);
      handleCsrfError(error);
      alert('Failed to process batch labels: ' + error.message);
    }
  };

  const toggleSection = (type, id, isGroup = false) => {
    const key = isGroup ? `group_${id}` : `item_${id}`;
    if (activeSection && activeSection.key === key && activeSection.type === type) {
      setActiveSection(null);
      } else {
      setActiveSection({ type, key, id, isGroup });
      
      // Initialize packages array for label creation if it doesn't exist
      if (type === 'label') {
        const currentForm = getFormData(id, isGroup);
        if (!currentForm.packages || currentForm.packages.length === 0) {
          updateFormData(id, isGroup, { 
            packages: [{ length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }]
          });
        }
      }
    }
  };

  const toggleMergeSelection = (itemId) => {
    setSelectedForMerge(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const isSelectedForMerge = (itemId) => selectedForMerge.includes(itemId);

  const mergeSelected = () => {
    if (selectedForMerge.length < 2) return;
    
    // Validate that all selected items have the same shipping address
    const selectedItems = orders.flatMap(order => 
      order.items.filter(item => selectedForMerge.includes(item.item_id))
        .map(item => ({ ...item, order }))
    );
    
    if (selectedItems.length === 0) return;
    
    const firstAddress = selectedItems[0].order.shipping_address;
    const addressMismatch = selectedItems.some(item => {
      const addr = item.order.shipping_address;
      return (
        addr?.street !== firstAddress?.street ||
        addr?.address_line_2 !== firstAddress?.address_line_2 ||
        addr?.city !== firstAddress?.city ||
        addr?.state !== firstAddress?.state ||
        addr?.zip !== firstAddress?.zip ||
        addr?.country !== firstAddress?.country
      );
    });
    
    if (addressMismatch) {
      alert('Cannot merge items with different shipping addresses. All items in a merged shipment must be going to the same address.');
      return;
    }
    
    const groupId = `group_${Date.now()}`;
    setMergedGroups(prev => ({ ...prev, [groupId]: selectedForMerge }));
    setSelectedForMerge([]);
    console.log('Merged group:', groupId, selectedForMerge);
  };

  const unmergeGroup = (groupId) => {
    if (!confirm('Are you sure you want to unmerge this shipment? Items will be returned to individual processing.')) {
      return;
    }
    
    setMergedGroups(prev => {
      const newGroups = { ...prev };
      delete newGroups[groupId];
      return newGroups;
    });
    
    // Clear any form data for this group
    setGroupForms(prev => {
      const newForms = { ...prev };
      delete newForms[groupId];
      return newForms;
    });
    
    // Close any active sections for this group
    if (activeSection && activeSection.isGroup && activeSection.id === groupId) {
      setActiveSection(null);
    }
  };

  const getFormData = (id, isGroup = false) => {
    if (isGroup) {
      return groupForms[id] || { carrier: '', trackingNumber: '', packages: [], rates: [], selectedRate: null, forceCardPayment: false };
    } else {
      return singleItemForms[id] || { carrier: '', trackingNumber: '', packages: [], rates: [], selectedRate: null, forceCardPayment: false };
    }
  };

  const updateFormData = (id, isGroup, updates) => {
    if (isGroup) {
      setGroupForms(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...updates } }));
    } else {
      setSingleItemForms(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...updates } }));
    }
  };

  const fetchRates = async (id, isGroup = false) => {
    const form = getFormData(id, isGroup);
    const itemId = isGroup ? mergedGroups[id][0] : id; // Use first item in group for API
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api2.onlineartfestival.com/api/shipping/get-label-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ item_id: itemId, packages: form.packages })
      });
      if (!response.ok) throw new Error('Failed to fetch rates');
        const data = await response.json();
      updateFormData(id, isGroup, { rates: data.rates || [], selectedRate: data.rates[0] || null });
    } catch (error) {
      console.error('Error fetching rates:', error);
    }
  };

  const purchaseLabel = (id, isGroup, rate) => {
    console.log(`Purchasing label for ${isGroup ? 'group' : 'item'} ${id} with rate:`, rate);
    // Later: Call batch endpoint
  };

  const addPackage = (id, isGroup = false) => {
    const form = getFormData(id, isGroup);
    const newPackages = [...form.packages, { length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }];
    updateFormData(id, isGroup, { packages: newPackages });
  };

  const removePackage = (id, isGroup, index) => {
    const form = getFormData(id, isGroup);
    const newPackages = form.packages.filter((_, i) => i !== index);
    updateFormData(id, isGroup, { packages: newPackages });
  };

  const updatePackage = (id, isGroup, index, field, value) => {
    const form = getFormData(id, isGroup);
    if (!form.packages || !form.packages[index]) return; // Prevent error if packages undefined or index out of range
    const newPackages = form.packages.map((pkg, i) => i === index ? { ...pkg, [field]: value } : pkg);
    updateFormData(id, isGroup, { packages: newPackages });
  };



  // Restore processBatch (scans all)
  const processBatch = async () => {
    const batch = [];
    
    // Scan single items
    orders.forEach(order => {
      order.items.forEach(item => {
        const form = getFormData(item.item_id, false);
        if (form.trackingNumber && form.carrier) {
          batch.push({ id: item.item_id, isGroup: false, type: 'tracking', data: { carrier: form.carrier, trackingNumber: form.trackingNumber } });
        } else if (form.selectedRate) {
          batch.push({ id: item.item_id, isGroup: false, type: 'label', data: { selected_rate: form.selectedRate, packages: form.packages, force_card_payment: form.forceCardPayment } });
        }
      });
    });
    
    // Scan groups
    Object.keys(mergedGroups).forEach(groupId => {
      const form = getFormData(groupId, true);
      if (form.trackingNumber && form.carrier) {
        batch.push({ id: groupId, isGroup: true, type: 'tracking', data: { carrier: form.carrier, trackingNumber: form.trackingNumber }, itemIds: mergedGroups[groupId] });
      } else if (form.selectedRate) {
        batch.push({ id: groupId, isGroup: true, type: 'label', data: { selected_rate: form.selectedRate, packages: form.packages, force_card_payment: form.forceCardPayment }, itemIds: mergedGroups[groupId] });
      }
    });
    
    if (batch.length === 0) {
      alert('No completed forms to process.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api2.onlineartfestival.com/api/shipping/process-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ batch })
      });
      
      if (!response.ok) throw new Error('Batch processing failed');
      const data = await response.json();
      setBatchResults(data.results);
      // Refresh orders and clear forms
      fetchOrders(activeTab);
      setActiveSection(null);
      setGroupForms({});
      setSingleItemForms({});
      setCarrier('');
      setTrackingNumber('');
      setPackages([{ length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }]);
      setRates([]);
      setSelectedRate(null);
    } catch (error) {
      console.error('Error processing batch:', error);
      alert('Failed to process batch');
    }
  };

  const cancelLabel = async (trackingNumber, carrier) => {
    if (!confirm(`Are you sure you want to cancel this ${carrier} label?\n\nTracking: ${trackingNumber}\n\nThis will reset the order item to "pending" status so you can create a new label.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api2.onlineartfestival.com/api/shipping/cancel-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ trackingNumber, carrier })
      });

      if (!response.ok) {
        throw new Error('Label cancellation failed');
      }

      const result = await response.json();
      
      alert(`Label cancelled successfully!\n\nTracking: ${trackingNumber}\nCarrier: ${carrier}\n\nThe order item has been reset to "pending" status and can now be reshipped.`);
      
      // Refresh orders to show updated status
      fetchOrders(activeTab);
      
    } catch (error) {
      console.error('Error cancelling label:', error);
      alert(`Failed to cancel label: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading orders...</div>;
  }

  return (
    <div>
                {/* Tabs */}
        <div className="tab-container" style={{ 
          display: 'flex', 
          borderBottom: '2px solid #dee2e6', 
          marginBottom: '20px' 
        }}>
          <button 
            className={`tab ${activeTab === 'unshipped' ? 'active' : ''}`}
            onClick={() => setActiveTab('unshipped')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === 'unshipped' ? '#fff' : 'transparent',
              borderBottom: activeTab === 'unshipped' ? '2px solid #3e1c56' : '2px solid transparent',
              color: activeTab === 'unshipped' ? '#3e1c56' : '#6c757d',
              fontWeight: activeTab === 'unshipped' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Unshipped Orders
          </button>
          <button 
            className={`tab ${activeTab === 'shipped' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipped')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === 'shipped' ? '#fff' : 'transparent',
              borderBottom: activeTab === 'shipped' ? '2px solid #3e1c56' : '2px solid transparent',
              color: activeTab === 'shipped' ? '#3e1c56' : '#6c757d',
              fontWeight: activeTab === 'shipped' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Shipped Orders
          </button>
          <button 
            className={`tab ${activeTab === 'labels' ? 'active' : ''}`}
            onClick={() => setActiveTab('labels')}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === 'labels' ? '#fff' : 'transparent',
              borderBottom: activeTab === 'labels' ? '2px solid #3e1c56' : '2px solid transparent',
              color: activeTab === 'labels' ? '#3e1c56' : '#6c757d',
              fontWeight: activeTab === 'labels' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Label Library
          </button>
        </div>
        {activeTab === 'unshipped' && (
          <div>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
              <button className="secondary" onClick={mergeSelected} disabled={selectedForMerge.length < 2}>
              Merge Selected ({selectedForMerge.length})
                      </button>
              <button className="secondary" onClick={processBatch}>
              Process Completed
                      </button>
            </div>
            {/* Table-like Headers - Desktop Only */}
            <div className="orders-table-header" style={{
              display: 'grid',
              gridTemplateColumns: '50px minmax(60px, 80px) minmax(60px, 80px) minmax(80px, 100px) minmax(150px, 1fr) minmax(60px, 70px) minmax(120px, 140px) 50px minmax(100px, 120px)',
              gap: '10px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '14px',
              marginBottom: '10px',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              <span>Merge</span>
              <span>OAF PO</span>
              <span>Order #</span>
              <span>Order Date</span>
              <span>Ship To</span>
              <span>Status</span>
              <span>Product</span>
              <span>Qty</span>
              <span>Process</span>
            </div>

            {/* Add responsive styles */}
            <style jsx>{`
              @media (max-width: 768px) {
                .orders-table-header {
                  display: none !important;
                }
                .item-row {
                  display: block !important;
                  padding: 15px !important;
                  border: none !important;
                  background: transparent !important;
                }
                .mobile-label {
                  display: inline-block;
                  font-weight: 600;
                  color: #6c757d;
                  width: 80px;
                  font-size: 12px;
                }
                .mobile-section {
                  margin-bottom: 12px;
                  padding-bottom: 8px;
                  border-bottom: 1px solid #f0f0f0;
                }
                .mobile-section:last-child {
                  border-bottom: none;
                }
              }
            `}</style>

            {/* Order Items List */}
            {!orders || orders.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>No unshipped orders found.</p>
            ) : (
              // Flatten orders to item-centric view, excluding merged items
              orders.flatMap(order => 
                (order.items || []).filter(item => {
                  // Hide items that are already in merged groups
                  const allMergedItems = Object.values(mergedGroups).flat();
                  return !allMergedItems.includes(item.item_id);
                }).map(item => (
                  <div key={`${order.order_id}-${item.item_id}`} className="order-item-card" style={{
                    marginBottom: '10px'
                  }}>
                    {/* Main Item Row */}
                    <div className="item-row" style={{
                      display: 'grid',
                      gridTemplateColumns: '50px minmax(60px, 80px) minmax(60px, 80px) minmax(80px, 100px) minmax(150px, 1fr) minmax(60px, 70px) minmax(120px, 140px) 50px minmax(100px, 120px)',
                      gap: '10px',
                      padding: '15px',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: '100%',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      overflow: 'hidden'
                    }}>
                      {/* Merge Checkbox */}
                      <div className="mobile-section">
                <input
                          type="checkbox" 
                          checked={isSelectedForMerge(item.item_id)}
                          onChange={() => toggleMergeSelection(item.item_id)}
                        />
                      </div>

                      {/* OAF PO (Item ID) - Remove label */}
                      <div className="mobile-section" style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        #{item.item_id}
                      </div>

                      {/* Order Number - Remove label */}
                      <div className="mobile-section" style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        #{order.order_id}
                      </div>

                      {/* Order Date */}
                      <div className="mobile-section" style={{ 
                        fontSize: '13px', 
                        color: '#6c757d',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>

                      {/* Ship To (4-line format) */}
                      <div className="mobile-section" style={{ 
                        fontSize: '13px', 
                        lineHeight: '1.3',
                        overflow: 'hidden',
                        maxHeight: '80px'
                      }}>
                        <span className="mobile-label">Ship To:</span>
                        <div style={{ marginTop: '4px' }}>
                          <div style={{ 
                            fontWeight: '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{order.customer_name || 'No name'}</div>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{order.shipping_address?.street || 'No address'}</div>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{order.shipping_address?.address_line_2 || ''}</div>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {order.shipping_address?.city || 'No city'}, {order.shipping_address?.state || 'No state'} {order.shipping_address?.zip || 'No zip'}
                          </div>
                        </div>
                      </div>

                      {/* Status - Remove label */}
                      <div className="mobile-section">
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: item.item_status === 'shipped' ? '#d4edda' : 
                                         item.item_status === 'delivered' ? '#d1ecf1' : '#f8f9fa',
                          color: item.item_status === 'shipped' ? '#155724' : 
                                 item.item_status === 'delivered' ? '#0c5460' : '#6c757d'
                        }}>
                          {item.item_status || 'pending'}
                        </span>
                      </div>

                      {/* Product - Remove label */}
                      <div className="mobile-section" style={{ 
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.product_name}
                      </div>

                      {/* Quantity - Separate column */}
                      <div className="mobile-section" style={{ 
                        fontSize: '14px',
                        fontWeight: 'bold', 
                        color: '#3e1c56',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {item.quantity}
                      </div>

                      {/* Process Buttons - Compact table style */}
                      <div className="mobile-section" style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '3px',
                        overflow: 'hidden',
                        maxWidth: '100%'
                      }}>
            <button
              className="secondary"
                          onClick={() => toggleSection('tracking', item.item_id, false)}
                          style={{ 
                            fontSize: '10px', 
                            padding: '2px 4px',
                            whiteSpace: 'nowrap',
                            minWidth: '0',
                            width: '100%',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          Tracking
            </button>
                  {hasShippingPermission ? (
                    <button
                      className="secondary"
                      onClick={() => toggleSection('label', item.item_id, false)}
                      style={{ 
                        fontSize: '10px', 
                        padding: '2px 4px',
                        whiteSpace: 'nowrap',
                        minWidth: '0',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      Add Label
                    </button>
                  ) : (
                    <button
                      className="secondary"
                      onClick={handleShippingAccess}
                      style={{ 
                        fontSize: '10px', 
                        padding: '2px 4px',
                        whiteSpace: 'nowrap',
                        minWidth: '0',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        backgroundColor: '#ffc107',
                        borderColor: '#ffc107',
                        color: '#000'
                      }}
                    >
                      Get Access
                    </button>
                  )}
                      </div>
                    </div>

                    {/* Expandable Form Section */}
                        {activeSection && activeSection.id === item.item_id && !activeSection.isGroup && (
                      <div className="expanded-form" style={{
                        borderTop: '1px solid #dee2e6',
                        padding: '15px',
                        backgroundColor: '#f8f9fa'
                      }}>
                            {activeSection.type === 'tracking' ? (
                          <div className="tracking-form">
                            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Add Tracking Information</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', alignItems: 'center' }}>
                              <label style={{ fontWeight: '500' }}>Carrier:</label>
                              <select 
                                className="form-control"
                                value={getFormData(item.item_id, false).carrier} 
                                onChange={e => updateFormData(item.item_id, false, { carrier: e.target.value })}
                                style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                              >
                                  <option value="">Select Carrier</option>
                                  <option value="UPS">UPS</option>
                                  <option value="FedEx">FedEx</option>
                                  <option value="USPS">USPS</option>
                  </select>
                              
                              <label style={{ fontWeight: '500' }}>Tracking Number:</label>
                              <input 
                                type="text" 
                                className="form-control"
                                value={getFormData(item.item_id, false).trackingNumber} 
                                onChange={e => updateFormData(item.item_id, false, { trackingNumber: e.target.value })}
                                style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                placeholder="Enter tracking number"
                              />
                            </div>
                </div>
                            ) : (
                          <div className="label-form">
                            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Create Shipping Label</h4>
                            
                            {/* Package Dimensions */}
                            <div className="packages-section">
                                {(getFormData(item.item_id, false).packages || []).map((pkg, index) => (
                                <div key={index} className="package-row" style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(6, 1fr) auto',
                                  gap: '10px',
                                  alignItems: 'center',
                                  marginBottom: '10px',
                                  padding: '10px',
                                  backgroundColor: '#fff',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '4px'
                                }}>
                                  <input 
                                    type="number" 
                                    placeholder="Length" 
                                    value={pkg.length} 
                                    onChange={e => updatePackage(item.item_id, false, index, 'length', e.target.value)}
                                    style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                  />
                                  <input 
                                    type="number" 
                                    placeholder="Width" 
                                    value={pkg.width} 
                                    onChange={e => updatePackage(item.item_id, false, index, 'width', e.target.value)}
                                    style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                  />
                                  <input 
                                    type="number" 
                                    placeholder="Height" 
                                    value={pkg.height} 
                                    onChange={e => updatePackage(item.item_id, false, index, 'height', e.target.value)}
                                    style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                  />
                                  <select 
                                    value={pkg.dimUnit} 
                                    onChange={e => updatePackage(item.item_id, false, index, 'dimUnit', e.target.value)}
                                    style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                  >
                                      <option value="in">in</option>
                                      <option value="cm">cm</option>
                                    </select>
                                  <input 
                                    type="number" 
                                    placeholder="Weight" 
                                    value={pkg.weight} 
                                    onChange={e => updatePackage(item.item_id, false, index, 'weight', e.target.value)}
                                    style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                  />
                                  <select 
                                    value={pkg.weightUnit} 
                                    onChange={e => updatePackage(item.item_id, false, index, 'weightUnit', e.target.value)}
                                    style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                  >
                                      <option value="lb">lb</option>
                                      <option value="oz">oz</option>
                                      <option value="kg">kg</option>
                                    </select>
                                  {index > 0 && (
                                    <button 
                                      onClick={() => removePackage(item.item_id, false, index)}
                                      className="secondary"
                                      style={{ fontSize: '12px', padding: '4px 8px' }}
                                    >
                                      Remove
                                    </button>
                                  )}
        </div>
                                ))}
                              
                              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button 
                                  className="secondary" 
                                  onClick={() => addPackage(item.item_id, false)}
                                >
                                  Add Another Package
                                </button>
                                <button 
                                  className="secondary" 
                                  onClick={() => fetchRates(item.item_id, false)}
                                >
                                  Get Shipping Rates
                                </button>
                              </div>
                            </div>

                            {/* Rate Selection */}
                                {(getFormData(item.item_id, false).rates || []).length > 0 && (
                              <div className="rates-section" style={{ marginTop: '20px' }}>
                                <h5 style={{ marginBottom: '10px' }}>Choose Shipping Rate:</h5>
                                <div className="rates-list">
                                    {(showAllRates ? (getFormData(item.item_id, false).rates || []) : (getFormData(item.item_id, false).rates || []).slice(0,1)).map(rate => (
                                    <div key={rate.service} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '10px',
                                      border: '1px solid #dee2e6',
                                      borderRadius: '4px',
                                      marginBottom: '8px',
                                      backgroundColor: getFormData(item.item_id, false).selectedRate?.service === rate.service ? '#e3f2fd' : '#fff'
                                    }}>
                <input
                                          type="radio" 
                                          checked={getFormData(item.item_id, false).selectedRate?.service === rate.service}
                                          onChange={() => updateFormData(item.item_id, false, { selectedRate: rate })}
                                        style={{ marginRight: '10px' }}
                                        />
                                      <span style={{ fontWeight: '500' }}>{rate.service}</span>
                                      <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>${rate.cost.toFixed(2)}</span>
          </div>
        )                                )}
                                {!showAllRates && (getFormData(item.item_id, false).rates || []).length > 1 && (
                                  <button 
                                    onClick={() => setShowAllRates(true)}
                                    style={{ color: '#007bff', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                                  >
                                    See more shipping options
                                  </button>
        )}
                </div>
                
                {/* Payment Method Override for Single Items */}
                {userData?.permissions?.includes('stripe_connect') && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '4px' 
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={getFormData(item.item_id, false).forceCardPayment || false}
                        onChange={(e) => updateFormData(item.item_id, false, { forceCardPayment: e.target.checked })}
                        style={{ marginRight: '6px' }}
                      />
                      <span style={{ fontSize: '12px' }}>
                        Charge card directly (bypass balance)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
      </div>
                        )}
        </div>
                              )}
                            </div>
                ))
              )
        )}
            {batchResults.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3>Batch Results</h3>
                <ul>
                  {batchResults.map((result, index) => (
                    <li key={index}>
                      {result.id}: {result.status} {result.tracking ? `- Tracking: ${result.tracking}` : ''} 
                      {result.labelUrl ? <a href={result.labelUrl} target="_blank">Download Label</a> : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Shipped Orders Tab */}
        {activeTab === 'shipped' && (
          <div>
            {/* Table-like Headers - Desktop Only */}
            <div className="shipped-orders-table-header" style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(60px, 80px) minmax(60px, 80px) minmax(80px, 100px) minmax(150px, 1fr) minmax(60px, 70px) minmax(120px, 140px) 50px minmax(100px, 120px)',
              gap: '10px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '14px',
              marginBottom: '10px',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              <span>OAF PO</span>
              <span>Order #</span>
              <span>Ship Date</span>
              <span>Ship To</span>
              <span>Status</span>
              <span>Product</span>
              <span>Qty</span>
              <span>Tracking</span>
            </div>

            {/* Add responsive styles */}
            <style jsx>{`
              @media (max-width: 768px) {
                .shipped-orders-table-header {
                  display: none !important;
                }
                .shipped-item-row {
                  display: block !important;
                  padding: 15px !important;
                  border: none !important;
                  background: transparent !important;
                }
                .shipped-mobile-label {
                  display: inline-block;
                  font-weight: 600;
                  color: #6c757d;
                  width: 80px;
                  font-size: 12px;
                }
                .shipped-mobile-section {
                  margin-bottom: 12px;
                  padding-bottom: 8px;
                  border-bottom: 1px solid #f0f0f0;
                }
                .shipped-mobile-section:last-child {
                  border-bottom: none;
                }
              }
            `}</style>

            {/* Shipped Order Items List */}
            {!orders || orders.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>No shipped orders found.</p>
            ) : (
              // Flatten orders to item-centric view, sort by most recent first, limit results
              orders
                .flatMap(order => 
                  (order.items || []).map(item => ({ ...item, order }))
                )
                .sort((a, b) => new Date(b.order.created_at) - new Date(a.order.created_at))
                .slice(0, shippedOrdersLimit)
                .map(({ order, ...item }) => (
                  <div key={`${order.order_id}-${item.item_id}`} className="shipped-order-item-card" style={{
                    marginBottom: '10px'
                  }}>
                    {/* Main Item Row */}
                    <div className="shipped-item-row" style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(60px, 80px) minmax(60px, 80px) minmax(80px, 100px) minmax(150px, 1fr) minmax(60px, 70px) minmax(120px, 140px) 50px minmax(100px, 120px)',
                      gap: '10px',
                      padding: '15px',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: '100%',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      overflow: 'hidden'
                    }}>
                      {/* OAF PO (Item ID) */}
                      <div className="shipped-mobile-section" style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        #{item.item_id}
                      </div>

                      {/* Order Number */}
                      <div className="shipped-mobile-section" style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        #{order.order_id}
                      </div>

                      {/* Ship Date (using order date for now) */}
                      <div className="shipped-mobile-section" style={{ 
                        fontSize: '13px', 
                        color: '#6c757d',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>

                      {/* Ship To (4-line format) */}
                      <div className="shipped-mobile-section" style={{ 
                        fontSize: '13px', 
                        lineHeight: '1.3',
                        overflow: 'hidden',
                        maxHeight: '80px'
                      }}>
                        <span className="shipped-mobile-label">Ship To:</span>
                        <div style={{ marginTop: '4px' }}>
                          <div style={{ 
                            fontWeight: '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{order.customer_name || 'No name'}</div>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{order.shipping_address?.street || 'No address'}</div>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{order.shipping_address?.address_line_2 || ''}</div>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {order.shipping_address?.city || 'No city'}, {order.shipping_address?.state || 'No state'} {order.shipping_address?.zip || 'No zip'}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="shipped-mobile-section">
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: item.item_status === 'shipped' ? '#d4edda' : 
                                         item.item_status === 'delivered' ? '#d1ecf1' : '#f8f9fa',
                          color: item.item_status === 'shipped' ? '#155724' : 
                                 item.item_status === 'delivered' ? '#0c5460' : '#6c757d'
                        }}>
                          {item.item_status || 'pending'}
                        </span>
                      </div>

                      {/* Product */}
                      <div className="shipped-mobile-section" style={{ 
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.product_name}
                      </div>

                      {/* Quantity */}
                      <div className="shipped-mobile-section" style={{ 
                        fontSize: '14px',
                        fontWeight: 'bold', 
                        color: '#3e1c56',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {item.quantity}
                      </div>

                      {/* Tracking Information */}
                      <div className="shipped-mobile-section" style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '5px',
                        overflow: 'hidden',
                        maxWidth: '100%'
                      }}>
                        <span className="shipped-mobile-label">Tracking:</span>
                        {item.tracking_number ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: '500',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#28a745'
                            }}>
                              {item.tracking_number}
                            </div>
                            <button
                              className="secondary"
                              onClick={() => cancelLabel(item.tracking_number, item.carrier || 'FedEx')}
                              style={{ 
                                fontSize: '10px', 
                                padding: '2px 4px',
                                backgroundColor: '#ff6b6b',
                                borderColor: '#ff5252',
                                color: 'white',
                                whiteSpace: 'nowrap',
                                minWidth: '0',
                                width: '100%',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#6c757d' }}>No tracking</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}

            {/* Load More Button */}
            {orders && orders.length > 0 && (() => {
              const totalShippedItems = orders.flatMap(order => 
                (order.items || []).map(item => ({ ...item, order }))
              ).length;
              return totalShippedItems > shippedOrdersLimit && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '20px', 
                  padding: '15px',
                  borderTop: '1px solid #dee2e6'
                }}>
                  <button
                    onClick={() => setShippedOrdersLimit(prev => prev + 50)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#007bff',
                      fontSize: '14px',
                      fontWeight: '500',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: '5px 10px'
                    }}
                  >
                    Load More ({totalShippedItems - shippedOrdersLimit} remaining)
                  </button>
    </div>
  );
            })()}
          </div>
        )}

        {activeTab === 'labels' && (
          <div>
            {selectedLabels.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ccc' }}>
                <button 
                  className="primary" 
                  onClick={printSelectedLabels}
                  style={{ marginRight: '10px' }}
                >
                  Print All Selected Labels ({selectedLabels.length})
                </button>
                <button 
                  className="secondary" 
                  onClick={() => setSelectedLabels([])}
                >
                  Clear Selection
                </button>
              </div>
            )}
            
            {!labels || labels.length === 0 ? (
              <p>No labels found in your library.</p>
            ) : (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLabels(labels.map(l => l.db_id));
                            } else {
                              setSelectedLabels([]);
                            }
                          }}
                          checked={selectedLabels.length === labels.length && labels.length > 0}
                        />
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Order #</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Customer</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Product</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Service</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Date</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map(label => (
                      <tr key={label.db_id} style={{ 
                        borderBottom: '1px solid #ddd',
                        textDecoration: label.status === 'voided' ? 'line-through' : 'none',
                        opacity: label.status === 'voided' ? 0.6 : 1
                      }}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedLabels.includes(label.db_id)}
                            disabled={label.status === 'voided'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLabels([...selectedLabels, label.db_id]);
                              } else {
                                setSelectedLabels(selectedLabels.filter(id => id !== label.db_id));
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {label.type === 'standalone' ? 'Standalone' : label.order_id}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.customer_name}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {label.quantity}x {label.product_name}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.service_name}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {new Date(label.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {label.status !== 'voided' && label.type === 'order' && (
                            <button 
                              onClick={() => voidLabel(label.db_id, label.tracking_number)}
                              style={{ 
                                color: '#dc3545', 
                                background: 'none', 
                                border: '1px solid #dc3545', 
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                marginRight: '10px',
                                fontSize: '12px'
                              }}
                            >
                              Void Label
                            </button>
                          )}
                          {label.status !== 'voided' && label.type === 'standalone' && (
                            <span style={{ color: '#6c757d', fontSize: '12px', marginRight: '10px' }}>
                              Standalone labels cannot be voided
                            </span>
                          )}
                          {label.status === 'voided' ? (
                            <>
                              <span style={{ color: '#6c757d', fontSize: '12px', marginRight: '10px' }}>VOIDED</span>
                              <span 
                                style={{ 
                                  color: '#aaa', 
                                  textDecoration: 'none', 
                                  cursor: 'not-allowed',
                                  fontSize: '14px'
                                }}
                              >
                                View Label
                              </span>
                            </>
                          ) : (
                            <a 
                              href={label.label_file_path.includes('/user_') 
                                ? `https://api2.onlineartfestival.com/api/shipping/labels/${encodeURIComponent(label.label_file_path.split('/').pop())}`
                                : `https://main.onlineartfestival.com${label.label_file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#007bff', textDecoration: 'none' }}
                            >
                              View Label
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                  <small><strong>Note:</strong> Labels are automatically deleted after 30 days for security and storage management.</small>
                </div>
                
                {selectedLabels.length > 0 && (
                  <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ccc' }}>
                    <button 
                      className="primary" 
                      onClick={printSelectedLabels}
                    >
                      Print All Selected Labels ({selectedLabels.length})
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Standalone Labels Section */}
            <div style={{ marginTop: '40px' }}>
              <h3 style={{ marginBottom: '20px', color: '#495057', fontWeight: '600' }}>Standalone Labels</h3>
              
              {selectedStandaloneLabels.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ccc' }}>
                  <button 
                    className="primary" 
                    onClick={() => {
                      // TODO: Implement standalone label printing
                      alert('Standalone label printing coming soon!');
                    }}
                    style={{ marginRight: '10px' }}
                  >
                    Print Selected Standalone Labels ({selectedStandaloneLabels.length})
                  </button>
                  <button 
                    className="secondary" 
                    onClick={() => setSelectedStandaloneLabels([])}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <div>Loading standalone labels...</div>
                </div>
              ) : !standaloneLabels || standaloneLabels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#6c757d', marginBottom: '15px' }}>No standalone labels found.</p>
                  <button 
                    className="secondary" 
                    onClick={fetchStandaloneLabels}
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                  >
                    Retry Loading Standalone Labels
                  </button>
                </div>
              ) : (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                          <input 
                            type="checkbox" 
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStandaloneLabels(standaloneLabels.map(l => l.db_id));
                              } else {
                                setSelectedStandaloneLabels([]);
                              }
                            }}
                            checked={selectedStandaloneLabels.length === standaloneLabels.length && standaloneLabels.length > 0}
                          />
                        </th>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Label ID</th>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Service</th>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Tracking</th>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Cost</th>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standaloneLabels.map(label => (
                        <tr key={label.db_id} style={{ 
                          borderBottom: '1px solid #ddd',
                          textDecoration: label.status === 'voided' ? 'line-through' : 'none',
                          opacity: label.status === 'voided' ? 0.6 : 1
                        }}>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedStandaloneLabels.includes(label.db_id)}
                              disabled={label.status === 'voided'}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStandaloneLabels([...selectedStandaloneLabels, label.db_id]);
                                } else {
                                  setSelectedStandaloneLabels(selectedStandaloneLabels.filter(id => id !== label.db_id));
                                }
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {label.label_id}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.service_name}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.tracking_number}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>${label.cost}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {new Date(label.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {label.status === 'voided' ? (
                              <>
                                <span style={{ color: '#6c757d', fontSize: '12px', marginRight: '10px' }}>VOIDED</span>
                                <span 
                                  style={{ 
                                    color: '#aaa', 
                                    textDecoration: 'none', 
                                    cursor: 'not-allowed',
                                    fontSize: '14px'
                                  }}
                                >
                                  View Label
                                </span>
                              </>
                            ) : (
                              <a 
                                href={label.label_file_path.includes('/user_') 
                                  ? `https://api2.onlineartfestival.com/api/shipping/labels/${encodeURIComponent(label.label_file_path.split('/').pop())}`
                                  : `https://main.onlineartfestival.com${label.label_file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#007bff', textDecoration: 'none' }}
                              >
                                View Label
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                    <small><strong>Note:</strong> Standalone labels are purchased independently and cannot be voided through this interface.</small>
                  </div>
                  
                  {selectedStandaloneLabels.length > 0 && (
                    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ccc' }}>
                      <button 
                        className="primary" 
                        onClick={() => {
                          // TODO: Implement standalone label printing
                          alert('Standalone label printing coming soon!');
                        }}
                      >
                        Print Selected Standalone Labels ({selectedStandaloneLabels.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'unshipped' && Object.keys(mergedGroups).length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: '#495057', fontWeight: '600' }}>Merged Shipments</h3>
            
            {/* Merged Groups - each group displays as table rows */}
            {Object.entries(mergedGroups).map(([groupId, itemIds]) => {
              // Get all items in this group with their order data
              const groupItems = itemIds.map(itemId => {
                const item = orders.flatMap(o => o.items).find(i => i.item_id === itemId);
                const order = orders.find(o => o.items.some(i => i.item_id === itemId));
                return { item, order };
              }).filter(({ item, order }) => item && order);

              if (groupItems.length === 0) return null;

              const firstOrder = groupItems[0].order;
              const totalQuantity = groupItems.reduce((sum, { item }) => sum + item.quantity, 0);

              return (
                <div key={groupId} className="merged-group-container" style={{ marginBottom: '15px' }}>
                  {/* Group Header Row */}
                  <div className="merged-group-header" style={{
                    display: 'grid',
                    gridTemplateColumns: '50px minmax(60px, 80px) minmax(60px, 80px) minmax(80px, 100px) minmax(150px, 1fr) minmax(60px, 70px) minmax(120px, 140px) 50px minmax(100px, 120px)',
                    gap: '10px',
                    padding: '15px',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '100%',
                    border: '2px solid #3e1c56',
                    borderRadius: '4px 4px 0 0',
                    backgroundColor: '#f8f4f8',
                    overflow: 'hidden',
                    fontWeight: '600'
                  }}>
                    <span>📦</span>
                    <span style={{ color: '#3e1c56', fontSize: '12px' }}>MERGED</span>
                    <span style={{ color: '#3e1c56', fontSize: '12px' }}>GROUP</span>
                    <span style={{ fontSize: '13px', color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {new Date(firstOrder.created_at).toLocaleDateString()}
                    </span>
                    {/* Ship To Address */}
                    <div style={{ fontSize: '13px', lineHeight: '1.3', overflow: 'hidden', maxHeight: '80px' }}>
                      <div style={{ marginTop: '4px' }}>
                        <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {firstOrder.customer_name || 'No name'}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {firstOrder.shipping_address?.street || 'No address'}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {firstOrder.shipping_address?.address_line_2 || ''}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {firstOrder.shipping_address?.city || 'No city'}, {firstOrder.shipping_address?.state || 'No state'} {firstOrder.shipping_address?.zip || 'No zip'}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: '#fff3cd',
                      color: '#856404'
                    }}>
                      merged
                    </span>
                    <span style={{ color: '#3e1c56', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Product Rows: {itemIds.length}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#3e1c56', textAlign: 'center' }}>
                      Total Pieces: {totalQuantity}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', maxWidth: '100%' }}>
                      <button
                        className="secondary"
                        onClick={() => toggleSection('tracking', groupId, true)}
                        style={{ 
                          fontSize: '10px', 
                          padding: '2px 4px',
                          whiteSpace: 'nowrap',
                          minWidth: '0',
                          width: '100%',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        Tracking
                      </button>
                      {hasShippingPermission ? (
                        <button
                          className="secondary"
                          onClick={() => toggleSection('label', groupId, true)}
                          style={{ 
                            fontSize: '10px', 
                            padding: '2px 4px',
                            whiteSpace: 'nowrap',
                            minWidth: '0',
                            width: '100%',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          Add Label
                        </button>
                      ) : (
                        <button
                          className="secondary"
                          onClick={handleShippingAccess}
                          style={{ 
                            fontSize: '10px', 
                            padding: '2px 4px',
                            whiteSpace: 'nowrap',
                            minWidth: '0',
                            width: '100%',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            backgroundColor: '#ffc107',
                            borderColor: '#ffc107',
                            color: '#000'
                          }}
                        >
                          Get Access
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Individual Items in Group */}
                  {groupItems.map(({ item, order }, index) => (
                    <div key={item.item_id} className="merged-item-row" style={{
                      display: 'grid',
                      gridTemplateColumns: '50px minmax(60px, 80px) minmax(60px, 80px) minmax(80px, 100px) minmax(150px, 1fr) minmax(60px, 70px) minmax(120px, 140px) 50px minmax(100px, 120px)',
                      gap: '10px',
                      padding: '10px 15px',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: '100%',
                      borderLeft: '2px solid #3e1c56',
                      borderRight: '2px solid #3e1c56',
                      borderBottom: '1px solid #dee2e6',
                      backgroundColor: '#fff',
                      overflow: 'hidden'
                    }}>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>↳</span>
                      <div style={{ fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        #{item.item_id}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        #{order.order_id}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        (same as above)
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: item.item_status === 'shipped' ? '#d4edda' : 
                                       item.item_status === 'delivered' ? '#d1ecf1' : '#f8f9fa',
                        color: item.item_status === 'shipped' ? '#155724' : 
                               item.item_status === 'delivered' ? '#0c5460' : '#6c757d'
                      }}>
                        {item.item_status || 'pending'}
                      </span>
                      <div style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product_name}
                      </div>
                      <div style={{ 
                        fontSize: '14px',
                        fontWeight: 'bold', 
                        color: '#3e1c56',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {item.quantity}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d', textAlign: 'center' }}>
                        (group)
                      </div>
            </div>
          ))}

                                    {/* Group Footer with Unmerge Button */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '50px minmax(60px, 80px) minmax(60px, 80px) minmax(80px, 100px) minmax(150px, 1fr) minmax(60px, 70px) minmax(120px, 140px) 50px minmax(100px, 120px)',
                    gap: '10px',
                    padding: '10px 15px',
                    borderLeft: '2px solid #3e1c56',
                    borderRight: '2px solid #3e1c56',
                    borderBottom: '2px solid #3e1c56',
                    borderTop: '1px solid #dee2e6',
                    borderRadius: '0 0 4px 4px',
                    backgroundColor: '#f8f9fa',
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}>
                    {/* Empty columns to align with table structure */}
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    {/* Unmerge button in the last column */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button 
                        className="secondary" 
                        onClick={() => unmergeGroup(groupId)}
                        style={{ 
                          fontSize: '12px', 
                          padding: '6px 12px',
                          backgroundColor: '#fff3cd',
                          borderColor: '#ffeaa7',
                          color: '#856404'
                        }}
                      >
                        Unmerge
                      </button>
                    </div>
                  </div>

                  {/* Expandable Form Section for Group */}
                  {activeSection && activeSection.id === groupId && activeSection.isGroup && (
                    <div className="expanded-form" style={{
                      borderLeft: '2px solid #3e1c56',
                      borderRight: '2px solid #3e1c56',
                      borderBottom: '2px solid #3e1c56',
                      borderTop: '1px solid #dee2e6',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      marginTop: '-2px'
                    }}>
                      {activeSection.type === 'tracking' ? (
                        <div className="tracking-form">
                          <h4 style={{ marginBottom: '15px', color: '#495057' }}>Add Tracking Information (Group)</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', alignItems: 'center' }}>
                            <label style={{ fontWeight: '500' }}>Carrier:</label>
                            <select 
                              className="form-control"
                              value={getFormData(groupId, true).carrier} 
                              onChange={e => updateFormData(groupId, true, { carrier: e.target.value })}
                              style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                            >
                              <option value="">Select Carrier</option>
                              <option value="UPS">UPS</option>
                              <option value="FedEx">FedEx</option>
                              <option value="USPS">USPS</option>
                            </select>
                            
                            <label style={{ fontWeight: '500' }}>Tracking Number:</label>
                            <input 
                              type="text" 
                              className="form-control"
                              value={getFormData(groupId, true).trackingNumber} 
                              onChange={e => updateFormData(groupId, true, { trackingNumber: e.target.value })}
                              style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                              placeholder="Enter tracking number"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="label-form">
                          <h4 style={{ marginBottom: '15px', color: '#495057' }}>Create Shipping Label (Group)</h4>
                          
                          {/* Package Dimensions - reuse existing form structure */}
                          <div className="packages-section">
                            {(getFormData(groupId, true).packages || []).map((pkg, index) => (
                              <div key={index} className="package-row" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(6, 1fr) auto',
                                gap: '10px',
                                alignItems: 'center',
                                marginBottom: '10px',
                                padding: '10px',
                                backgroundColor: '#fff',
                                border: '1px solid #dee2e6',
                                borderRadius: '4px'
                              }}>
                                <input 
                                  type="number" 
                                  placeholder="Length" 
                                  value={pkg.length} 
                                  onChange={e => updatePackage(groupId, true, index, 'length', e.target.value)}
                                  style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                />
                                <input 
                                  type="number" 
                                  placeholder="Width" 
                                  value={pkg.width} 
                                  onChange={e => updatePackage(groupId, true, index, 'width', e.target.value)}
                                  style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                />
                                <input 
                                  type="number" 
                                  placeholder="Height" 
                                  value={pkg.height} 
                                  onChange={e => updatePackage(groupId, true, index, 'height', e.target.value)}
                                  style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                />
                                <select 
                                  value={pkg.dimUnit} 
                                  onChange={e => updatePackage(groupId, true, index, 'dimUnit', e.target.value)}
                                  style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                >
                                  <option value="in">in</option>
                                  <option value="cm">cm</option>
                                </select>
                                <input 
                                  type="number" 
                                  placeholder="Weight" 
                                  value={pkg.weight} 
                                  onChange={e => updatePackage(groupId, true, index, 'weight', e.target.value)}
                                  style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                />
                                <select 
                                  value={pkg.weightUnit} 
                                  onChange={e => updatePackage(groupId, true, index, 'weightUnit', e.target.value)}
                                  style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                >
                                  <option value="lb">lb</option>
                                  <option value="oz">oz</option>
                                  <option value="kg">kg</option>
                                </select>
                                {index > 0 && (
                                  <button 
                                    onClick={() => removePackage(groupId, true, index)}
                                    className="secondary"
                                    style={{ fontSize: '12px', padding: '4px 8px' }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                              <button 
                                className="secondary" 
                                onClick={() => addPackage(groupId, true)}
                              >
                                Add Another Package
                              </button>
                              <button 
                                className="secondary" 
                                onClick={() => fetchRates(groupId, true)}
                              >
                                Get Shipping Rates
                              </button>
                            </div>
                          </div>

                          {/* Rate Selection */}
                          {(getFormData(groupId, true).rates || []).length > 0 && (
                            <div className="rates-section" style={{ marginTop: '20px' }}>
                              <h5 style={{ marginBottom: '10px' }}>Choose Shipping Rate:</h5>
                              <div className="rates-list">
                                {(showAllRates ? (getFormData(groupId, true).rates || []) : (getFormData(groupId, true).rates || []).slice(0,1)).map(rate => (
                                  <div key={rate.service} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px',
                                    marginBottom: '8px',
                                    backgroundColor: getFormData(groupId, true).selectedRate?.service === rate.service ? '#e3f2fd' : '#fff'
                                  }}>
                                    <input
                                      type="radio" 
                                      checked={getFormData(groupId, true).selectedRate?.service === rate.service}
                                      onChange={() => updateFormData(groupId, true, { selectedRate: rate })}
                                      style={{ marginRight: '10px' }}
                                    />
                                    <span style={{ fontWeight: '500' }}>{rate.service}</span>
                                    <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>${rate.cost.toFixed(2)}</span>
                                  </div>
                                ))}
                                {!showAllRates && (getFormData(groupId, true).rates || []).length > 1 && (
                                  <button 
                                    onClick={() => setShowAllRates(true)}
                                    style={{ color: '#007bff', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                                  >
                                    See more shipping options
                                  </button>
                                )}
                              </div>
                              
                              {/* Payment Method Override for Groups */}
                              {userData?.permissions?.includes('stripe_connect') && (
                                <div style={{ 
                                  marginTop: '10px', 
                                  padding: '8px', 
                                  backgroundColor: '#f8f9fa', 
                                  border: '1px solid #dee2e6', 
                                  borderRadius: '4px' 
                                }}>
                                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={getFormData(groupId, true).forceCardPayment || false}
                                      onChange={(e) => updateFormData(groupId, true, { forceCardPayment: e.target.checked })}
                                      style={{ marginRight: '6px' }}
                                    />
                                    <span style={{ fontSize: '12px' }}>
                                      Charge card directly (bypass balance)
                                    </span>
                                  </label>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Shipping Subscription Modal */}
        {showShippingModal && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowShippingModal(false)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
              <ShipSubscriptions 
                userData={userData} 
                onComplete={handleShippingModalClose}
              />
            </div>
          </div>
        )}
    </div>
  );
}

