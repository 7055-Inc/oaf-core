import { useProductForm } from '../ProductFormContext';

export default function WholesaleSection() {
  const { formData, updateField } = useProductForm();

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

  return (
    <div>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        Configure wholesale pricing and information for B2B buyers and marketplace listings.
      </p>

      {/* Wholesale Title */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          Wholesale Title
        </label>
        <input
          type="text"
          value={formData.wholesale_title || ''}
          onChange={e => updateField('wholesale_title', e.target.value)}
          style={inputStyle}
          placeholder="Optional: Different title for wholesale listings"
        />
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Leave blank to use the standard product name
        </div>
      </div>

      {/* Price Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>
            Wholesale Price
          </label>
          <div style={{ position: 'relative' }}>
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
              value={formData.wholesale_price || ''}
              onChange={e => updateField('wholesale_price', e.target.value)}
              style={{ ...inputStyle, paddingLeft: '28px' }}
              placeholder="0.00"
            />
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Price for B2B buyers and marketplace cost basis
          </div>
        </div>
        
        <div>
          <label style={labelStyle}>Retail Price (Reference)</label>
          <div style={{ 
            padding: '12px', 
            background: '#f8f9fa', 
            borderRadius: '6px',
            border: '1px solid #e9ecef',
            color: '#666',
            fontSize: '14px'
          }}>
            ${formData.price || '0.00'}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            {formData.wholesale_price && formData.price ? (
              `Margin: ${((1 - (parseFloat(formData.wholesale_price) / parseFloat(formData.price))) * 100).toFixed(1)}%`
            ) : (
              'Set both prices to see margin'
            )}
          </div>
        </div>
      </div>

      {/* Wholesale Description */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          Wholesale Description
        </label>
        <textarea
          value={formData.wholesale_description || ''}
          onChange={e => updateField('wholesale_description', e.target.value)}
          style={{
            ...inputStyle,
            minHeight: '120px',
            resize: 'vertical'
          }}
          placeholder="Optional: Specific information for wholesale buyers (minimum order quantities, bulk discounts, packaging info, etc.)"
        />
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          This description is shown to wholesale buyers and on B2B marketplaces
        </div>
      </div>

      {/* Marketplace Pricing Info */}
      {formData.wholesale_price && (
        <div style={{
          padding: '16px',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          <div style={{ 
            fontWeight: '600', 
            marginBottom: '8px',
            color: '#1565c0',
            fontSize: '13px'
          }}>
            💡 Marketplace Pricing Preview
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#666' }}>Walmart/Amazon (2x wholesale):</span>
              <span style={{ fontWeight: '600', marginLeft: '8px', color: '#1565c0' }}>
                ${(parseFloat(formData.wholesale_price) * 2).toFixed(2)}
              </span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Faire/eBay (2x wholesale):</span>
              <span style={{ fontWeight: '600', marginLeft: '8px', color: '#1565c0' }}>
                ${(parseFloat(formData.wholesale_price) * 2).toFixed(2)}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
            Marketplace listings use 2x wholesale price when available, or retail +20% if no wholesale price is set.
          </div>
        </div>
      )}
    </div>
  );
}

// Summary for collapsed state
export function getWholesaleSummary(formData) {
  if (!formData.wholesale_price) return null;
  return `$${formData.wholesale_price} wholesale`;
}

