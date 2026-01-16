import { useState } from 'react';
import { useProductForm } from '../ProductFormContext';
import { authApiRequest } from '../../../../../lib/apiUtils';

export default function ShippingSection() {
  const { formData, updateField, updateFields, packages, setPackages } = useProductForm();
  
  // Carrier service selection state
  const [showCarrierServices, setShowCarrierServices] = useState(false);
  const [availableCarriers, setAvailableCarriers] = useState([]);
  const [carrierRates, setCarrierRates] = useState({});
  const [checkingCarriers, setCheckingCarriers] = useState(false);

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '13px',
    color: '#333'
  };

  const shippingMethods = [
    { id: 'free', label: 'Free Shipping', icon: '🎁' },
    { id: 'flat_rate', label: 'Flat Rate', icon: 'fa-box' },
    { id: 'calculated', label: 'Calculated at Checkout', icon: '🧮' }
  ];

  const handlePackageChange = (index, field, value) => {
    const newPackages = [...packages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    setPackages(newPackages);
  };

  const addPackage = () => {
    setPackages([...packages, {
      id: Date.now(),
      length: '',
      width: '',
      height: '',
      weight: '',
      dimension_unit: 'in',
      weight_unit: 'lbs'
    }]);
  };

  const removePackage = (index) => {
    if (packages.length > 1) {
      setPackages(packages.filter((_, i) => i !== index));
    }
  };

  // Handle service toggle for carrier services
  const handleServiceToggle = (serviceName, isChecked) => {
    let services = formData.shipping_services ? formData.shipping_services.split(',').map(s => s.trim()) : [];
    
    if (isChecked) {
      if (!services.includes(serviceName)) {
        services.push(serviceName);
      }
    } else {
      services = services.filter(s => s !== serviceName);
    }
    
    updateField('shipping_services', services.join(', '));
  };

  // Check carrier availability and get rates
  const checkCarrierAvailability = async () => {
    setCheckingCarriers(true);
    const available = [];
    const rates = {};
    
    // Validate that we have package dimensions
    const hasValidPackages = packages.some(pkg => 
      pkg.length && pkg.width && pkg.height && pkg.weight
    );
    
    if (!hasValidPackages) {
      setCheckingCarriers(false);
      return;
    }
    
    // Use sample destination for rate calculation
    const sampleDestination = {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US'
    };
    
    try {
      const testProduct = {
        packages: packages.filter(pkg => pkg.length && pkg.width && pkg.height && pkg.weight)
      };
      
      const response = await authApiRequest('api/shipping/calculate-cart-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_items: [{ product_id: 'test', quantity: 1 }],
          recipient_address: sampleDestination,
          test_packages: testProduct.packages
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.shipping_results && data.shipping_results.length > 0) {
          const shippingResult = data.shipping_results[0];
          
          if (shippingResult.available_rates && shippingResult.available_rates.length > 0) {
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
      // Silently fail - will show default carriers
    }
    
    // If no rates returned, show default carriers
    if (available.length === 0) {
      available.push('UPS', 'USPS');
      rates['UPS'] = [
        { service: 'Ground', cost: 'Varies', serviceCode: 'ups-ground' },
        { service: '3 Day Select', cost: 'Varies', serviceCode: 'ups-3day' }
      ];
      rates['USPS'] = [
        { service: 'Ground Advantage', cost: 'Varies', serviceCode: 'usps-ground' },
        { service: 'Priority Mail', cost: 'Varies', serviceCode: 'usps-priority' }
      ];
    }
    
    setAvailableCarriers(available);
    setCarrierRates(rates);
    setCheckingCarriers(false);
    setShowCarrierServices(true);
  };

  return (
    <div>
      {/* Shipping Method Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ ...labelStyle, marginBottom: '12px' }}>Shipping Method</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {shippingMethods.map(method => (
            <div
              key={method.id}
              onClick={() => updateField('ship_method', method.id)}
              style={{
                padding: '16px',
                border: formData.ship_method === method.id
                  ? '2px solid var(--primary-color, #055474)'
                  : '2px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                background: formData.ship_method === method.id
                  ? 'rgba(5, 84, 116, 0.05)'
                  : 'white',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{method.icon}</div>
              <div style={{ fontWeight: '500', fontSize: '13px' }}>{method.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Flat Rate Input */}
      {formData.ship_method === 'flat_rate' && (
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Flat Rate Amount</label>
          <div style={{ position: 'relative', maxWidth: '200px' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666'
            }}>$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.ship_rate}
              onChange={e => updateField('ship_rate', e.target.value)}
              style={{ ...inputStyle, paddingLeft: '28px' }}
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      {/* Package Dimensions (for calculated shipping) */}
      {formData.ship_method === 'calculated' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <label style={{ ...labelStyle, margin: 0 }}>Package Dimensions</label>
            {packages.length < 5 && (
              <button
                type="button"
                onClick={addPackage}
                style={{
                  padding: '6px 12px',
                  background: '#e9ecef',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                + Add Package
              </button>
            )}
          </div>

          {packages.map((pkg, index) => (
            <div
              key={pkg.id}
              style={{
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '12px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ fontWeight: '600', fontSize: '13px' }}>
                  Package {index + 1}
                </span>
                {packages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(index)}
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc3545',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Length ({pkg.dimension_unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pkg.length}
                    onChange={e => handlePackageChange(index, 'length', e.target.value)}
                    style={{ ...inputStyle, padding: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Width ({pkg.dimension_unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pkg.width}
                    onChange={e => handlePackageChange(index, 'width', e.target.value)}
                    style={{ ...inputStyle, padding: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Height ({pkg.dimension_unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pkg.height}
                    onChange={e => handlePackageChange(index, 'height', e.target.value)}
                    style={{ ...inputStyle, padding: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Weight ({pkg.weight_unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pkg.weight}
                    onChange={e => handlePackageChange(index, 'weight', e.target.value)}
                    style={{ ...inputStyle, padding: '8px' }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Carrier Services Button */}
          {!showCarrierServices && (
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={checkCarrierAvailability}
                disabled={checkingCarriers || !packages.some(pkg => pkg.length && pkg.width && pkg.height && pkg.weight)}
                style={{
                  padding: '12px 20px',
                  background: 'var(--primary-color, #055474)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: checkingCarriers ? 'wait' : 'pointer',
                  fontSize: '14px',
                  opacity: checkingCarriers || !packages.some(pkg => pkg.length && pkg.width && pkg.height && pkg.weight) ? 0.6 : 1
                }}
              >
                {checkingCarriers ? 'Checking Available Carriers...' : 'Choose Carrier Services'}
              </button>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                {!packages.some(pkg => pkg.length && pkg.width && pkg.height && pkg.weight)
                  ? 'Enter package dimensions to enable carrier selection'
                  : 'Click to check which carriers are available'}
              </div>
            </div>
          )}

          {/* Carrier Services Grid */}
          {showCarrierServices && (
            <div style={{ marginTop: '20px' }}>
              <label style={{ ...labelStyle, marginBottom: '12px' }}>Select Carrier Services</label>
              <div style={{ display: 'grid', gridTemplateColumns: availableCarriers.length > 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '16px' }}>
                {availableCarriers.map(carrier => (
                  <div key={carrier} style={{ 
                    padding: '16px', 
                    background: '#f8f9fa', 
                    borderRadius: '8px' 
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                      {carrier} Services
                    </h4>
                    {carrierRates[carrier] && carrierRates[carrier].map((rate, index) => {
                      const serviceName = `${carrier} ${rate.service}`;
                      const isSelected = formData.shipping_services?.includes(serviceName);
                      return (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                          padding: '8px',
                          background: isSelected ? 'rgba(5, 84, 116, 0.1)' : 'white',
                          borderRadius: '4px',
                          border: isSelected ? '1px solid var(--primary-color, #055474)' : '1px solid #ddd'
                        }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            flex: 1
                          }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleServiceToggle(serviceName, e.target.checked)}
                              style={{ width: '16px', height: '16px' }}
                            />
                            {rate.service}
                          </label>
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#666',
                            background: '#e9ecef',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              <div style={{ 
                marginTop: '12px', 
                display: 'flex', 
                gap: '12px',
                alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCarrierServices(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#e9ecef',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Hide Services
                </button>
                <button
                  type="button"
                  onClick={checkCarrierAvailability}
                  disabled={checkingCarriers}
                  style={{
                    padding: '8px 16px',
                    background: '#e9ecef',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {checkingCarriers ? 'Rechecking...' : 'Recheck Rates'}
                </button>
                {formData.shipping_services && (
                  <span style={{ fontSize: '12px', color: '#28a745' }}>
                    <i className="fas fa-check" style={{ marginRight: '4px' }}></i> {formData.shipping_services.split(',').length} service(s) selected
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
                Select which carrier services you want to offer. Real-time rates are calculated at checkout based on customer's location.
              </div>
            </div>
          )}

          {!showCarrierServices && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Shipping rates will be calculated based on package dimensions and destination.
            </div>
          )}
        </div>
      )}

      {/* Product Dimensions (optional, always shown) */}
      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
        <label style={{ ...labelStyle, marginBottom: '12px' }}>Product Dimensions (Optional)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>Width</label>
            <input
              type="number"
              step="0.1"
              value={formData.width}
              onChange={e => updateField('width', e.target.value)}
              style={{ ...inputStyle, padding: '8px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>Height</label>
            <input
              type="number"
              step="0.1"
              value={formData.height}
              onChange={e => updateField('height', e.target.value)}
              style={{ ...inputStyle, padding: '8px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>Depth</label>
            <input
              type="number"
              step="0.1"
              value={formData.depth}
              onChange={e => updateField('depth', e.target.value)}
              style={{ ...inputStyle, padding: '8px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>Weight</label>
            <input
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={e => updateField('weight', e.target.value)}
              style={{ ...inputStyle, padding: '8px' }}
            />
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
          Used for product specs display and marketplace listings
        </div>
      </div>
    </div>
  );
}

// Summary for collapsed state
export function getShippingSummary(formData) {
  switch (formData.ship_method) {
    case 'free':
      return 'Free Shipping';
    case 'flat_rate':
      return `Flat Rate: $${formData.ship_rate || '0.00'}`;
    case 'calculated':
      return 'Calculated at Checkout';
    default:
      return null;
  }
}

