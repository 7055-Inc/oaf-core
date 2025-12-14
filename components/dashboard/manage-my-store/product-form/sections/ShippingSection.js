import { useProductForm } from '../ProductFormContext';

export default function ShippingSection() {
  const { formData, updateField, packages, setPackages } = useProductForm();

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
    { id: 'flat_rate', label: 'Flat Rate', icon: '📦' },
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

          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Shipping rates will be calculated based on package dimensions and destination.
          </div>
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

