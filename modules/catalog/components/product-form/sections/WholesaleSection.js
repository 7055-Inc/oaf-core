import { useProductForm } from '../ProductFormContext';

export default function WholesaleSection() {
  const { formData, updateField, updateFields } = useProductForm();

  // Auto-update identifier_exists when GTIN changes
  const handleGTINChange = (value) => {
    updateFields({
      gtin: value,
      identifier_exists: value && value.trim() !== '' ? 'yes' : 'no'
    });
  };

  return (
    <div>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        Configure wholesale pricing and product identifiers for B2B buyers and marketplace listings.
      </p>

      {/* Wholesale Title */}
      <div style={{ marginBottom: '16px' }}>
        <label>Wholesale Title</label>
        <input
          type="text"
          value={formData.wholesale_title || ''}
          onChange={e => updateField('wholesale_title', e.target.value)}
          placeholder="Optional: Different title for wholesale listings"
        />
        <small style={{ color: '#666' }}>Leave blank to use the standard product name</small>
      </div>

      {/* Price Row */}
      <div className="form-grid-2">
        <div>
          <label>Wholesale Price</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.wholesale_price || ''}
              onChange={e => updateField('wholesale_price', e.target.value)}
              style={{ paddingLeft: '24px' }}
              placeholder="0.00"
            />
          </div>
          <small style={{ color: '#666' }}>Price for B2B buyers and marketplace cost basis</small>
        </div>
        
        <div>
          <label>Retail Price (Reference)</label>
          <div className="form-card" style={{ padding: '12px', marginBottom: 0 }}>
            ${formData.price || '0.00'}
          </div>
          <small style={{ color: '#666' }}>
            {formData.wholesale_price && formData.price ? (
              `Margin: ${((1 - (parseFloat(formData.wholesale_price) / parseFloat(formData.price))) * 100).toFixed(1)}%`
            ) : (
              'Set both prices to see margin'
            )}
          </small>
        </div>
      </div>

      {/* Wholesale Description */}
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <label>Wholesale Description</label>
        <textarea
          value={formData.wholesale_description || ''}
          onChange={e => updateField('wholesale_description', e.target.value)}
          style={{ minHeight: '100px' }}
          placeholder="Optional: Specific information for wholesale buyers (minimum order quantities, bulk discounts, packaging info, etc.)"
        />
        <small style={{ color: '#666' }}>This description is shown to wholesale buyers and on B2B marketplaces</small>
      </div>

      {/* Product Identifiers */}
      <div className="form-card">
        <strong style={{ display: 'block', marginBottom: '12px' }}>Product Identifiers</strong>
        <div className="form-grid-2">
          <div>
            <label>GTIN / UPC / Barcode</label>
            <input
              type="text"
              value={formData.gtin || ''}
              onChange={e => handleGTINChange(e.target.value)}
              placeholder="e.g., 012345678901"
            />
            <small style={{ color: '#666' }}>Universal Product Code (12-14 digits)</small>
          </div>
          <div>
            <label>MPN (Manufacturer Part Number)</label>
            <input
              type="text"
              value={formData.mpn || ''}
              onChange={e => updateField('mpn', e.target.value)}
              placeholder="e.g., ABC-12345"
            />
            <small style={{ color: '#666' }}>Your manufacturer's part number</small>
          </div>
        </div>
        <div className={formData.gtin ? 'success-alert' : 'warning-alert'} style={{ marginTop: '12px', marginBottom: 0, padding: '8px 12px', fontSize: '12px' }}>
          <i className={formData.gtin ? 'fas fa-check' : 'fas fa-info-circle'}></i>{' '}
          {formData.gtin 
            ? 'Product identifier exists - better visibility in search results'
            : 'No GTIN provided - consider adding for improved marketplace visibility'}
        </div>
      </div>

      {/* Marketplace Pricing Info */}
      {formData.wholesale_price && (
        <div className="form-card" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', border: 'none' }}>
          <strong style={{ color: '#1565c0', fontSize: '13px' }}>
            <i className="fas fa-lightbulb"></i> Marketplace Pricing Preview
          </strong>
          <div className="form-grid-2" style={{ marginTop: '8px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#666' }}>Walmart/Amazon (2x wholesale):</span>
              <strong style={{ marginLeft: '8px', color: '#1565c0' }}>
                ${(parseFloat(formData.wholesale_price) * 2).toFixed(2)}
              </strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>Faire/eBay (2x wholesale):</span>
              <strong style={{ marginLeft: '8px', color: '#1565c0' }}>
                ${(parseFloat(formData.wholesale_price) * 2).toFixed(2)}
              </strong>
            </div>
          </div>
          <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
            Marketplace listings use 2x wholesale price when available, or retail +20% if no wholesale price is set.
          </small>
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

