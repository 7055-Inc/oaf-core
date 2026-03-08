/**
 * Standalone Label Creator Component
 * 
 * Form to create shipping labels not tied to orders.
 * Uses v2 API and global styles.
 */

import { useState, useEffect } from 'react';
import {
  fetchVendorAddress,
  calculateStandaloneRates,
  createStandaloneLabel
} from '../../../../lib/commerce/api';

export default function StandaloneLabelCreator({ userData, onLabelCreated }) {
  const [packages, setPackages] = useState([
    { length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }
  ]);
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
      const data = await fetchVendorAddress();
      if (data?.has_vendor_address && data.address) {
        setShipperAddress(data.address);
      } else if (data?.incomplete_address) {
        setShipperAddress(prev => ({ ...prev, ...data.incomplete_address }));
      }
    } catch (err) {
      console.error('Error loading vendor address:', err);
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

      const rateData = await calculateStandaloneRates({
        shipper_address: shipperAddress,
        recipient_address: recipientAddress,
        packages: validPackages.map(pkg => ({
          length: parseFloat(pkg.length),
          width: parseFloat(pkg.width),
          height: parseFloat(pkg.height),
          weight: parseFloat(pkg.weight),
          dimension_unit: pkg.dimUnit,
          weight_unit: pkg.weightUnit
        }))
      });

      if (rateData && rateData.length > 0) {
        setRates(rateData);
        setSelectedRate(rateData[0]);
      } else {
        throw new Error('No rates available for this shipment');
      }
    } catch (err) {
      setError(err.message);
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
      const result = await createStandaloneLabel({
        shipper_address: shipperAddress,
        recipient_address: recipientAddress,
        packages: packages.filter(pkg => pkg.length && pkg.width && pkg.height && pkg.weight),
        selected_rate: selectedRate,
        force_card_payment: forceCardPayment
      });
      
      if (result.success) {
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
        
        if (onLabelCreated) onLabelCreated();
        alert('Label created successfully!');
      } else {
        throw new Error(result.error || 'Failed to create label');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userData) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="standalone-label-creator">
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* Ship From Address */}
      <div className="form-section">
        <h4 className="form-section-title">Ship From Address</h4>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Company/Sender Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Company/Sender Name"
              value={shipperAddress.name}
              onChange={(e) => updateShipperAddress('name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Street Address *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Street Address"
              value={shipperAddress.street}
              onChange={(e) => updateShipperAddress('street', e.target.value)}
            />
          </div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Address Line 2</label>
            <input
              type="text"
              className="form-input"
              placeholder="Suite, Apt, etc. (optional)"
              value={shipperAddress.address_line_2}
              onChange={(e) => updateShipperAddress('address_line_2', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">City *</label>
            <input
              type="text"
              className="form-input"
              placeholder="City"
              value={shipperAddress.city}
              onChange={(e) => updateShipperAddress('city', e.target.value)}
            />
          </div>
        </div>
        <div className="form-grid form-grid-4">
          <div className="form-group">
            <label className="form-label">State *</label>
            <input
              type="text"
              className="form-input"
              placeholder="State"
              value={shipperAddress.state}
              onChange={(e) => updateShipperAddress('state', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">ZIP Code *</label>
            <input
              type="text"
              className="form-input"
              placeholder="ZIP Code"
              value={shipperAddress.zip}
              onChange={(e) => updateShipperAddress('zip', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <select
              className="form-select"
              value={shipperAddress.country}
              onChange={(e) => updateShipperAddress('country', e.target.value)}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              className="form-input"
              placeholder="Phone (optional)"
              value={shipperAddress.phone}
              onChange={(e) => updateShipperAddress('phone', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Ship To Address */}
      <div className="form-section">
        <h4 className="form-section-title">Ship To Address</h4>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Recipient Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Recipient Name"
              value={recipientAddress.name}
              onChange={(e) => updateRecipientAddress('name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Street Address *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Street Address"
              value={recipientAddress.street}
              onChange={(e) => updateRecipientAddress('street', e.target.value)}
            />
          </div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Address Line 2</label>
            <input
              type="text"
              className="form-input"
              placeholder="Suite, Apt, etc. (optional)"
              value={recipientAddress.address_line_2}
              onChange={(e) => updateRecipientAddress('address_line_2', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">City *</label>
            <input
              type="text"
              className="form-input"
              placeholder="City"
              value={recipientAddress.city}
              onChange={(e) => updateRecipientAddress('city', e.target.value)}
            />
          </div>
        </div>
        <div className="form-grid form-grid-3">
          <div className="form-group">
            <label className="form-label">State *</label>
            <input
              type="text"
              className="form-input"
              placeholder="State"
              value={recipientAddress.state}
              onChange={(e) => updateRecipientAddress('state', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">ZIP Code *</label>
            <input
              type="text"
              className="form-input"
              placeholder="ZIP Code"
              value={recipientAddress.zip}
              onChange={(e) => updateRecipientAddress('zip', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <select
              className="form-select"
              value={recipientAddress.country}
              onChange={(e) => updateRecipientAddress('country', e.target.value)}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Package Details */}
      <div className="form-section">
        <h4 className="form-section-title">Package Details</h4>
        {packages.map((pkg, index) => (
          <div key={index} className="package-row">
            <div className="form-grid form-grid-7">
              <div className="form-group">
                <label className="form-label">Length</label>
                <input 
                  type="number" 
                  className="form-input"
                  placeholder="Length" 
                  value={pkg.length} 
                  onChange={e => updatePackage(index, 'length', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Width</label>
                <input 
                  type="number" 
                  className="form-input"
                  placeholder="Width" 
                  value={pkg.width} 
                  onChange={e => updatePackage(index, 'width', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Height</label>
                <input 
                  type="number" 
                  className="form-input"
                  placeholder="Height" 
                  value={pkg.height} 
                  onChange={e => updatePackage(index, 'height', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select 
                  className="form-select"
                  value={pkg.dimUnit} 
                  onChange={e => updatePackage(index, 'dimUnit', e.target.value)}
                >
                  <option value="in">in</option>
                  <option value="cm">cm</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Weight</label>
                <input 
                  type="number"
                  className="form-input"
                  placeholder="Weight" 
                  value={pkg.weight} 
                  onChange={e => updatePackage(index, 'weight', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select 
                  className="form-select"
                  value={pkg.weightUnit} 
                  onChange={e => updatePackage(index, 'weightUnit', e.target.value)}
                >
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <div className="form-group form-group-action">
                {index > 0 && (
                  <button 
                    type="button"
                    className="btn btn-small secondary"
                    onClick={() => removePackage(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <div className="button-group">
          <button 
            type="button"
            className="btn secondary"
            onClick={addPackage}
            disabled={isProcessing}
          >
            Add Another Package
          </button>
          <button 
            type="button"
            className="btn primary"
            onClick={fetchRates}
            disabled={isProcessing}
          >
            {isProcessing ? 'Getting Rates...' : 'Get Shipping Rates'}
          </button>
        </div>
      </div>

      {/* Rate Selection */}
      {rates.length > 0 && (
        <div className="form-section">
          <h4 className="form-section-title">Choose Shipping Rate</h4>
          <div className="rate-list">
            {(showAllRates ? rates : rates.slice(0, 3)).map(rate => (
              <div 
                key={rate.service}
                className={`rate-option ${selectedRate?.service === rate.service ? 'selected' : ''}`}
                onClick={() => setSelectedRate(rate)}
              >
                <input
                  type="radio" 
                  checked={selectedRate?.service === rate.service}
                  onChange={() => setSelectedRate(rate)}
                />
                <span className="rate-service">{rate.service}</span>
                <span className="rate-cost">${rate.cost.toFixed(2)}</span>
              </div>
            ))}
            {!showAllRates && rates.length > 3 && (
              <button 
                type="button"
                className="btn-link"
                onClick={() => setShowAllRates(true)}
              >
                See more shipping options
              </button>
            )}
          </div>

          {/* Payment Method Override */}
          {userData?.permissions?.includes('stripe_connect') && (
            <div className="payment-override">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={forceCardPayment}
                  onChange={(e) => setForceCardPayment(e.target.checked)}
                />
                <span>Charge my card directly (bypass Connect balance)</span>
              </label>
              <p className="helper-text">
                {forceCardPayment 
                  ? 'This label will be charged to your card on file'
                  : 'This label will be deducted from your Connect balance if available, otherwise charged to your card'
                }
              </p>
            </div>
          )}

          <button 
            type="button"
            className="btn success btn-large"
            onClick={purchaseLabel}
            disabled={isProcessing || !selectedRate}
          >
            {isProcessing ? 'Creating Label...' : `Purchase Label - $${selectedRate?.cost?.toFixed(2) || '0.00'}`}
          </button>
        </div>
      )}
    </div>
  );
}
