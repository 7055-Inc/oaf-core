// Import necessary hooks and styles
import { useState, useEffect } from 'react';
import slideInStyles from '../SlideIn.module.css'; // Correct relative path from vendor/ to dashboard/
import { authenticatedApiRequest, handleCsrfError } from '../../../lib/csrf';

export function ShipOrdersContent({ userData, onBack }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unshipped');
  const [orders, setOrders] = useState([]);
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
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

  useEffect(() => {
    if (activeTab === 'labels') {
      fetchLabels();
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
    const groupId = `group_${Date.now()}`;
    setMergedGroups(prev => ({ ...prev, [groupId]: selectedForMerge }));
    setSelectedForMerge([]);
    console.log('Merged group:', groupId, selectedForMerge);
    // Next: UI to show groups
  };

  const getFormData = (id, isGroup = false) => {
    if (isGroup) {
      return groupForms[id] || { carrier: '', trackingNumber: '', packages: [], rates: [], selectedRate: null };
    } else {
      return singleItemForms[id] || { carrier: '', trackingNumber: '', packages: [], rates: [], selectedRate: null };
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
          batch.push({ id: item.item_id, isGroup: false, type: 'label', data: { selected_rate: form.selectedRate, packages: form.packages } });
        }
      });
    });
    
    // Scan groups
    Object.keys(mergedGroups).forEach(groupId => {
      const form = getFormData(groupId, true);
      if (form.trackingNumber && form.carrier) {
        batch.push({ id: groupId, isGroup: true, type: 'tracking', data: { carrier: form.carrier, trackingNumber: form.trackingNumber }, itemIds: mergedGroups[groupId] });
      } else if (form.selectedRate) {
        batch.push({ id: groupId, isGroup: true, type: 'label', data: { selected_rate: form.selectedRate, packages: form.packages }, itemIds: mergedGroups[groupId] });
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
      return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
              </button>
          <h1 className={slideInStyles.title}>Ship Orders</h1>
        </div>
        <div className={slideInStyles.content}>
          <div className="loading-state">Loading orders...</div>
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
        <h1 className={slideInStyles.title}>Ship Orders</h1>
            </div>
      <div className={slideInStyles.content}>
                {/* Tabs */}
        <div className="tab-container">
          <button 
            className={`tab ${activeTab === 'unshipped' ? 'active' : ''}`}
            onClick={() => setActiveTab('unshipped')}
          >
            Unshipped Orders
          </button>
          <button 
            className={`tab ${activeTab === 'shipped' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipped')}
          >
            Shipped Orders
          </button>
          <button 
            className={`tab ${activeTab === 'labels' ? 'active' : ''}`}
            onClick={() => setActiveTab('labels')}
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
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              <span style={{ width: '30px' }}>Merge</span>
              <span>Item</span>
            </div>
            {/* Order List - Only show for unshipped tab */}
            {!orders || orders.length === 0 ? (
              <p>No unshipped orders found.</p>
            ) : (
              orders.map(order => (
            <div key={order.order_id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
              <h3>Order #{order.order_id} - {new Date(order.created_at).toLocaleDateString()}</h3>
              <p>Customer: {order.customer_name}</p>
              <div style={{ marginBottom: '10px' }}>
                <strong>Ship To:</strong>
                <p>{order.shipping_address?.street || 'No address'}, {order.shipping_address?.city || 'No city'}, {order.shipping_address?.state || 'No state'} {order.shipping_address?.zip || 'No zip'}, {order.shipping_address?.country || 'No country'}</p>
          </div>
              <p>Status: {order.order_status}</p>
              <ul>
                {(order.items || []).map(item => (
                  <li key={item.item_id}>
                    {item.quantity} x {item.product_name} - Status: {item.item_status}
                    {activeTab === 'unshipped' && (
                      <>
                <input
                          type="checkbox" 
                          checked={isSelectedForMerge(item.item_id)}
                          onChange={() => toggleMergeSelection(item.item_id)}
                          style={{ marginRight: '10px' }}
                        />
            <button
              className="secondary"
                          style={{ marginLeft: '10px' }}
                          onClick={() => toggleSection('tracking', item.item_id, false)}
            >
                          Add Tracking
            </button>
                  <button
                    className="secondary"
                          style={{ marginLeft: '5px' }}
                          onClick={() => toggleSection('label', item.item_id, false)}
                  >
                          Create Label
                  </button>
                        {activeSection && activeSection.id === item.item_id && !activeSection.isGroup && (
                          <div style={{ marginTop: '10px', padding: '10px', border: '1px dashed #ccc', background: '#f9f9f9' }}>
                            {activeSection.type === 'tracking' ? (
                <div>
                                <label>Carrier:</label>
                                <select value={getFormData(item.item_id, false).carrier} onChange={e => updateFormData(item.item_id, false, { carrier: e.target.value })}>
                                  <option value="">Select Carrier</option>
                                  <option value="UPS">UPS</option>
                                  <option value="FedEx">FedEx</option>
                                  <option value="USPS">USPS</option>
                  </select>
                                <label>Tracking Number:</label>
                                <input type="text" value={getFormData(item.item_id, false).trackingNumber} onChange={e => updateFormData(item.item_id, false, { trackingNumber: e.target.value })} />
                </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {(getFormData(item.item_id, false).packages || []).map((pkg, index) => (
                                  <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                                    <input type="number" placeholder="Length" value={pkg.length} onChange={e => updatePackage(item.item_id, false, index, 'length', e.target.value)} style={{ width: '60px' }} />
                                    <input type="number" placeholder="Width" value={pkg.width} onChange={e => updatePackage(item.item_id, false, index, 'width', e.target.value)} style={{ width: '60px' }} />
                                    <input type="number" placeholder="Height" value={pkg.height} onChange={e => updatePackage(item.item_id, false, index, 'height', e.target.value)} style={{ width: '60px' }} />
                                    <select value={pkg.dimUnit} onChange={e => updatePackage(item.item_id, false, index, 'dimUnit', e.target.value)} style={{ width: '80px' }}>
                                      <option value="in">in</option>
                                      <option value="cm">cm</option>
                                    </select>
                                    <input type="number" placeholder="Weight" value={pkg.weight} onChange={e => updatePackage(item.item_id, false, index, 'weight', e.target.value)} style={{ width: '60px' }} />
                                    <select value={pkg.weightUnit} onChange={e => updatePackage(item.item_id, false, index, 'weightUnit', e.target.value)} style={{ width: '80px' }}>
                                      <option value="lb">lb</option>
                                      <option value="oz">oz</option>
                                      <option value="kg">kg</option>
                                    </select>
                                    {index > 0 && <button onClick={() => removePackage(item.item_id, false, index)}>Remove</button>}
        </div>
                                ))}
                                <button className="secondary" onClick={() => addPackage(item.item_id, false)} style={{ margin: '10px 0' }}>Add another package</button>
                                <button className="secondary" onClick={() => fetchRates(item.item_id, false)} style={{ marginTop: '10px' }}>Get Rates</button>
                                {(getFormData(item.item_id, false).rates || []).length > 0 && (
      <div>
                                    <h4>Choose Rate to Purchase Label:</h4>
                                    {(showAllRates ? (getFormData(item.item_id, false).rates || []) : (getFormData(item.item_id, false).rates || []).slice(0,1)).map(rate => (
                                      <div key={rate.service}>
                <input
                                          type="radio" 
                                          checked={getFormData(item.item_id, false).selectedRate?.service === rate.service}
                                          onChange={() => updateFormData(item.item_id, false, { selectedRate: rate })}
                                        />
                                        {rate.service} - ${rate.cost.toFixed(2)}
          </div>
        ))}
                                    {!showAllRates && (getFormData(item.item_id, false).rates || []).length > 1 && <a onClick={() => setShowAllRates(true)}>See more options</a>}
          </div>
        )}
                </div>
                            )}
              </div>
            )}
          </>
        )}
                  </li>
                ))}
              </ul>
      </div>
          ))
        )}
        {Object.entries(mergedGroups).map(([groupId, itemIds]) => (
  <div key={groupId} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
    <h4>Merged Group {groupId}</h4>
    <ul>
      {itemIds.map(itemId => {
        const item = orders.flatMap(o => o.items).find(i => i.item_id === itemId);
        return item ? <li key={itemId}>{item.quantity} x {item.product_name}</li> : null;
      })}
    </ul>
    <button className="secondary" onClick={() => toggleSection('tracking', groupId, true)}>Add Tracking (Shared)</button>
    <button className="secondary" onClick={() => toggleSection('label', groupId, true)}>Create Label (Shared)</button>
    {activeSection && activeSection.isGroup && activeSection.id === groupId && (
      <div style={{ marginTop: '10px', padding: '10px', border: '1px dashed #ccc', background: '#f9f9f9' }}>
        {activeSection.type === 'tracking' ? (
              <div>
            <label>Carrier:</label>
            <select value={getFormData(groupId, true).carrier} onChange={e => updateFormData(groupId, true, { carrier: e.target.value })}>
              <option value="">Select Carrier</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="USPS">USPS</option>
                </select>
            <label>Tracking Number:</label>
            <input type="text" value={getFormData(groupId, true).trackingNumber} onChange={e => updateFormData(groupId, true, { trackingNumber: e.target.value })} />
              </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(getFormData(groupId, true).packages || []).map((pkg, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                <input type="number" placeholder="Length" value={pkg.length} onChange={e => updatePackage(groupId, true, index, 'length', e.target.value)} style={{ width: '60px' }} />
                <input type="number" placeholder="Width" value={pkg.width} onChange={e => updatePackage(groupId, true, index, 'width', e.target.value)} style={{ width: '60px' }} />
                <input type="number" placeholder="Height" value={pkg.height} onChange={e => updatePackage(groupId, true, index, 'height', e.target.value)} style={{ width: '60px' }} />
                <select value={pkg.dimUnit} onChange={e => updatePackage(groupId, true, index, 'dimUnit', e.target.value)} style={{ width: '80px' }}>
                  <option value="in">in</option>
                  <option value="cm">cm</option>
                </select>
                <input type="number" placeholder="Weight" value={pkg.weight} onChange={e => updatePackage(groupId, true, index, 'weight', e.target.value)} style={{ width: '60px' }} />
                <select value={pkg.weightUnit} onChange={e => updatePackage(groupId, true, index, 'weightUnit', e.target.value)} style={{ width: '80px' }}>
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                  <option value="kg">kg</option>
                </select>
                {index > 0 && <button onClick={() => removePackage(groupId, true, index)}>Remove</button>}
              </div>
            ))}
            <button className="secondary" onClick={() => addPackage(groupId, true)} style={{ margin: '10px 0' }}>Add another package</button>
            <button className="secondary" onClick={() => fetchRates(groupId, true)} style={{ marginTop: '10px' }}>Get Rates</button>
            {(getFormData(groupId, true).rates || []).length > 0 && (
              <div>
                <h4>Choose Rate to Purchase Label:</h4>
                {(showAllRates ? (getFormData(groupId, true).rates || []) : (getFormData(groupId, true).rates || []).slice(0,1)).map(rate => (
                  <div key={rate.service}>
                <input
                      type="radio" 
                      checked={getFormData(groupId, true).selectedRate?.service === rate.service}
                      onChange={() => updateFormData(groupId, true, { selectedRate: rate })}
                    />
                    {rate.service} - ${rate.cost.toFixed(2)}
          </div>
        ))}
                {!showAllRates && (getFormData(groupId, true).rates || []).length > 1 && <a onClick={() => setShowAllRates(true)}>See more options</a>}
        </div>
                              )}
                            </div>
        )}
                                      </div>
                                    )}
                                        </div>
                                      ))}
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
              ))
          </div>
        )}

        {/* Shipped Orders Tab */}
        {activeTab === 'shipped' && (
          <div>
            <h3>Shipped Orders - Test Label Management</h3>
            {!orders || orders.length === 0 ? (
              <p>No shipped orders found.</p>
            ) : (
              orders.map(order => (
                <div key={order.order_id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
                  <p><strong>Order #{order.order_id}</strong></p>
                  <p>Customer: {order.customer_name}</p>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Ship To:</strong>
                    <p>{order.shipping_address?.street || 'No address'}, {order.shipping_address?.city || 'No city'}, {order.shipping_address?.state || 'No state'} {order.shipping_address?.zip || 'No zip'}, {order.shipping_address?.country || 'No country'}</p>
                  </div>
                  <p>Status: {order.order_status}</p>
                  <ul>
                    {(order.items || []).map(item => (
                      <li key={item.item_id} style={{ marginBottom: '10px' }}>
                        {item.quantity} x {item.product_name} - Status: {item.item_status}
                        {item.tracking_number && (
                          <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#f0f0f0' }}>
                            <strong>Tracking:</strong> {item.tracking_number}
                            <button
                              className="secondary"
                              style={{ marginLeft: '10px', backgroundColor: '#ff6b6b', color: 'white' }}
                              onClick={() => cancelLabel(item.tracking_number, item.carrier || 'FedEx')}
                            >
                              Cancel Label
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'labels' && (
          <div>
            <h3>Label Library</h3>
            
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
                              setSelectedLabels(labels.map(l => l.id));
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
                      <tr key={label.id} style={{ 
                        borderBottom: '1px solid #ddd',
                        textDecoration: label.status === 'voided' ? 'line-through' : 'none',
                        opacity: label.status === 'voided' ? 0.6 : 1
                      }}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedLabels.includes(label.id)}
                            disabled={label.status === 'voided'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLabels([...selectedLabels, label.id]);
                              } else {
                                setSelectedLabels(selectedLabels.filter(id => id !== label.id));
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.order_id}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.customer_name}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {label.quantity}x {label.product_name}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.service_name}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {new Date(label.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {label.status !== 'voided' && (
                            <button 
                              onClick={() => voidLabel(label.id, label.tracking_number)}
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
          </div>
        )}

        {activeTab === 'unshipped' && (
          <div style={{ marginTop: '20px' }}>
            <h3>Merged Groups</h3>
            {Object.entries(mergedGroups).map(([groupId, items]) => (
              <div key={groupId}>
                Group {groupId}: Items {items.join(', ')}
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

// Helper to check if this menu handles a slide-in type
export const vendorSlideInTypes = ['ship-orders'];

// Default export for the component
export default ShipOrdersContent; 