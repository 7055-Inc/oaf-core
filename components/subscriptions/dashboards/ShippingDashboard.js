// Shipping Labels Dashboard - Shown when all requirements are met
// Includes Create Label and Label Library

import { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';
import { getFrontendUrl } from '../../../lib/config';

export default function ShippingDashboard({ subscriptionData, userData, onUpdate }) {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          Shipping Labels Dashboard
        </h2>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Create and manage your shipping labels
        </p>
      </div>

      {/* Create Label Section */}
      <div style={{ 
        background: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50' }}>
          Create Shipping Label
        </h3>
        <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
          Create labels for packages not tied to specific orders
        </p>
        <StandaloneLabelCreator userData={userData} onUpdate={onUpdate} />
      </div>

      {/* Label Library Section */}
      <div style={{ 
        background: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50' }}>
          Label Library
        </h3>
        <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
          Your standalone shipping labels (not tied to specific orders)
        </p>
        <StandaloneLabelLibrary />
      </div>
    </div>
  );
}

// Standalone Label Creator Component (copied from old ShipSubscriptions)
function StandaloneLabelCreator({ userData, onUpdate }) {
  if (!userData) {
    return <div>Loading...</div>;
  }
  
  const [packages, setPackages] = useState([{ length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }]);
  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [showAllRates, setShowAllRates] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [forceCardPayment, setForceCardPayment] = useState(false);
  const [shipperAddress, setShipperAddress] = useState({
    name: '',
    street: '',
    address_line_2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: ''
  });
  const [recipientAddress, setRecipientAddress] = useState({
    name: '',
    street: '',
    address_line_2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });

  // Load vendor address on mount
  useEffect(() => {
    loadVendorAddress();
  }, []);

  const loadVendorAddress = async () => {
    try {
      const response = await authApiRequest('api/subscriptions/shipping/vendor-address');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.has_vendor_address && data.address) {
          setShipperAddress(data.address);
        } else if (data.incomplete_address) {
          setShipperAddress(prev => ({ ...prev, ...data.incomplete_address }));
        }
      }
    } catch (error) {
      console.error('Error loading vendor address:', error);
    }
  };

  const addPackage = () => {
    setPackages([...packages, { length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }]);
  };

  const removePackage = (index) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updatePackage = (index, field, value) => {
    const newPackages = packages.map((pkg, i) => i === index ? { ...pkg, [field]: value } : pkg);
    setPackages(newPackages);
  };

  const updateShipperAddress = (field, value) => {
    setShipperAddress(prev => ({ ...prev, [field]: value }));
  };

  const updateRecipientAddress = (field, value) => {
    setRecipientAddress(prev => ({ ...prev, [field]: value }));
  };

  const fetchRates = async () => {
    setError(null);
    setIsProcessing(true);
    
    try {
      const validPackages = packages.filter(pkg => 
        pkg.length && pkg.width && pkg.height && pkg.weight
      );
      
      if (validPackages.length === 0) {
        throw new Error('Please fill in at least one complete package');
      }

      if (!shipperAddress.name || !shipperAddress.street || !shipperAddress.city || !shipperAddress.state || !shipperAddress.zip) {
        throw new Error('Please fill in complete Ship From address');
      }
      
      if (!recipientAddress.name || !recipientAddress.street || !recipientAddress.city || !recipientAddress.state || !recipientAddress.zip) {
        throw new Error('Please fill in complete Ship To address');
      }

      const response = await authApiRequest('api/shipping/calculate-cart-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_items: [{ product_id: 'test', quantity: 1 }],
          recipient_address: recipientAddress,
          test_packages: validPackages.map(pkg => ({
            length: parseFloat(pkg.length),
            width: parseFloat(pkg.width),
            height: parseFloat(pkg.height),
            weight: parseFloat(pkg.weight),
            dimension_unit: pkg.dimUnit,
            weight_unit: pkg.weightUnit
          }))
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch rates');
      
      const data = await response.json();
      if (data.shipping_results && data.shipping_results[0] && data.shipping_results[0].available_rates) {
        setRates(data.shipping_results[0].available_rates);
        setSelectedRate(data.shipping_results[0].available_rates[0] || null);
      } else {
        throw new Error('No rates available for this shipment');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const purchaseLabel = async () => {
    if (!selectedRate) {
      setError('Please select a shipping rate');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await authApiRequest('api/subscriptions/shipping/create-standalone-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipper_address: shipperAddress,
          recipient_address: recipientAddress,
          packages: packages.filter(pkg => pkg.length && pkg.width && pkg.height && pkg.weight),
          selected_rate: selectedRate,
          force_card_payment: forceCardPayment
        })
      });
      
      if (!response.ok) throw new Error('Failed to create label');
      
      const data = await response.json();
      
      if (data.success) {
        // Reset form
        setPackages([{ length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }]);
        setRates([]);
        setSelectedRate(null);
        setRecipientAddress({
          name: '',
          street: '',
          address_line_2: '',
          city: '',
          state: '',
          zip: '',
          country: 'US'
        });
        
        onUpdate();
        alert('Label created successfully!');
      } else {
        throw new Error(data.error || 'Failed to create label');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #dc3545', 
          borderRadius: '4px', 
          marginBottom: '15px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}

      {/* Shipper Address */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#495057', marginBottom: '10px' }}>Ship From Address</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Company/Sender Name *"
            value={shipperAddress.name}
            onChange={(e) => updateShipperAddress('name', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Street Address *"
            value={shipperAddress.street}
            onChange={(e) => updateShipperAddress('street', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Address Line 2 (Optional)"
            value={shipperAddress.address_line_2}
            onChange={(e) => updateShipperAddress('address_line_2', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="City *"
            value={shipperAddress.city}
            onChange={(e) => updateShipperAddress('city', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
          <input
            type="text"
            placeholder="State *"
            value={shipperAddress.state}
            onChange={(e) => updateShipperAddress('state', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="ZIP Code *"
            value={shipperAddress.zip}
            onChange={(e) => updateShipperAddress('zip', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <select
            value={shipperAddress.country}
            onChange={(e) => updateShipperAddress('country', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
          <input
            type="tel"
            placeholder="Phone (Optional)"
            value={shipperAddress.phone}
            onChange={(e) => updateShipperAddress('phone', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Recipient Address */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#495057', marginBottom: '10px' }}>Ship To Address</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Recipient Name"
            value={recipientAddress.name}
            onChange={(e) => updateRecipientAddress('name', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Street Address"
            value={recipientAddress.street}
            onChange={(e) => updateRecipientAddress('street', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Address Line 2 (Optional)"
            value={recipientAddress.address_line_2}
            onChange={(e) => updateRecipientAddress('address_line_2', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="City"
            value={recipientAddress.city}
            onChange={(e) => updateRecipientAddress('city', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '10px' }}>
          <input
            type="text"
            placeholder="State"
            value={recipientAddress.state}
            onChange={(e) => updateRecipientAddress('state', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="ZIP Code"
            value={recipientAddress.zip}
            onChange={(e) => updateRecipientAddress('zip', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <select
            value={recipientAddress.country}
            onChange={(e) => updateRecipientAddress('country', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
        </div>
      </div>

      {/* Package Dimensions */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#495057', marginBottom: '10px' }}>Package Details</h4>
        {packages.map((pkg, index) => (
          <div key={index} style={{
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
              onChange={e => updatePackage(index, 'length', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <input 
              type="number" 
              placeholder="Width" 
              value={pkg.width} 
              onChange={e => updatePackage(index, 'width', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <input 
              type="number" 
              placeholder="Height" 
              value={pkg.height} 
              onChange={e => updatePackage(index, 'height', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <select 
              value={pkg.dimUnit} 
              onChange={e => updatePackage(index, 'dimUnit', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            >
              <option value="in">in</option>
              <option value="cm">cm</option>
            </select>
            <input 
              type="number" 
              placeholder="Weight" 
              value={pkg.weight} 
              onChange={e => updatePackage(index, 'weight', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <select 
              value={pkg.weightUnit} 
              onChange={e => updatePackage(index, 'weightUnit', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            >
              <option value="lb">lb</option>
              <option value="oz">oz</option>
              <option value="kg">kg</option>
            </select>
            {index > 0 && (
              <button 
                onClick={() => removePackage(index)}
                style={{ 
                  fontSize: '12px', 
                  padding: '4px 8px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            onClick={addPackage}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            Add Another Package
          </button>
          <button 
            onClick={fetchRates}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              background: '#055474',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            {isProcessing ? 'Getting Rates...' : 'Get Shipping Rates'}
          </button>
        </div>
      </div>

      {/* Rate Selection */}
      {rates.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#495057', marginBottom: '10px' }}>Choose Shipping Rate:</h4>
          <div>
            {(showAllRates ? rates : rates.slice(0, 3)).map(rate => (
              <div key={rate.service} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                marginBottom: '8px',
                backgroundColor: selectedRate?.service === rate.service ? '#e3f2fd' : '#fff',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedRate(rate)}
              >
                <input
                  type="radio" 
                  checked={selectedRate?.service === rate.service}
                  onChange={() => setSelectedRate(rate)}
                  style={{ marginRight: '10px' }}
                />
                <span style={{ fontWeight: '500' }}>{rate.service}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>${rate.cost.toFixed(2)}</span>
              </div>
            ))}
            {!showAllRates && rates.length > 3 && (
              <button 
                onClick={() => setShowAllRates(true)}
                style={{ color: '#007bff', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
              >
                See more shipping options
              </button>
            )}
          </div>

          {/* Payment Method Override */}
          {userData?.permissions?.includes('stripe_connect') && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '4px' 
            }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={forceCardPayment}
                  onChange={(e) => setForceCardPayment(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  Charge my card directly (bypass Connect balance)
                </span>
              </label>
              <p style={{ 
                fontSize: '12px', 
                color: '#6c757d', 
                margin: '5px 0 0 24px' 
              }}>
                {forceCardPayment 
                  ? 'This label will be charged to your card on file'
                  : 'This label will be deducted from your Connect balance if available, otherwise charged to your card'
                }
              </p>
            </div>
          )}

          <button 
            onClick={purchaseLabel}
            disabled={isProcessing || !selectedRate}
            style={{ 
              marginTop: '15px',
              padding: '12px 24px',
              background: (!selectedRate || isProcessing) ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!selectedRate || isProcessing) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            {isProcessing ? 'Creating Label...' : `Purchase Label - $${selectedRate?.cost?.toFixed(2) || '0.00'}`}
          </button>
        </div>
      )}
    </div>
  );
}

// Standalone Label Library Component (copied from old ShipSubscriptions)
function StandaloneLabelLibrary() {
  const [standaloneLabels, setStandaloneLabels] = useState([]);
  const [selectedStandaloneLabels, setSelectedStandaloneLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStandaloneLabels();
  }, []);

  const fetchStandaloneLabels = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApiRequest('api/subscriptions/shipping/standalone-labels', {
        method: 'GET'
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 500) {
          setStandaloneLabels([]);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setStandaloneLabels(data.labels || []);
      } else {
        setStandaloneLabels([]);
      }
    } catch (error) {
      console.error('Error fetching standalone labels:', error);
      setStandaloneLabels([]);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
        <div>Loading labels...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#dc3545', marginBottom: '15px' }}>Error: {error}</p>
        <button 
          onClick={fetchStandaloneLabels}
          style={{ 
            fontSize: '14px', 
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!standaloneLabels || standaloneLabels.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#6c757d', marginBottom: '15px' }}>No labels found yet.</p>
        <p style={{ fontSize: '14px', color: '#6c757d' }}>
          Labels you create will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {selectedStandaloneLabels.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ccc', borderRadius: '4px' }}>
          <button 
            onClick={() => {
              alert('Label printing coming soon!');
            }}
            style={{ 
              marginRight: '10px',
              padding: '8px 16px',
              background: '#055474',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Print Selected ({selectedStandaloneLabels.length})
          </button>
          <button 
            onClick={() => setSelectedStandaloneLabels([])}
            style={{ 
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

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
                      ? `api/shipping/labels/${encodeURIComponent(label.label_file_path.split('/').pop())}`
                      : getFrontendUrl(label.label_file_path)}
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
    </div>
  );
}

