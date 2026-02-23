import { useProductForm } from '../ProductFormContext';

const STANDARD_TIER_LABELS = [
  { value: 'Bulk Buy', label: 'Bulk Buy' },
  { value: 'Case Qty', label: 'Case Qty' },
  { value: 'Pallet Qty', label: 'Pallet Qty' },
  { value: 'Multi-Pallet Qty', label: 'Multi-Pallet Qty' },
  { value: 'custom', label: 'Custom...' },
];

export default function WholesaleSection() {
  const { formData, updateField, updateFields } = useProductForm();

  const handleGTINChange = (value) => {
    updateFields({
      gtin: value,
      identifier_exists: value && value.trim() !== '' ? 'yes' : 'no'
    });
  };

  // Volume pricing tier management
  const tiers = (() => {
    try {
      if (!formData.wholesale_pricing_tiers) return [];
      const parsed = typeof formData.wholesale_pricing_tiers === 'string'
        ? JSON.parse(formData.wholesale_pricing_tiers)
        : formData.wholesale_pricing_tiers;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();

  const updateTiers = (newTiers) => {
    updateField('wholesale_pricing_tiers', newTiers.length > 0 ? JSON.stringify(newTiers) : null);
  };

  const addTier = () => {
    const lastQty = tiers.length > 0 ? tiers[tiers.length - 1].min_qty || 10 : 10;
    updateTiers([...tiers, { min_qty: lastQty * 2, price: '', label: 'Bulk Buy' }]);
  };

  const removeTier = (index) => {
    updateTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, field, value) => {
    const updated = tiers.map((tier, i) => i === index ? { ...tier, [field]: value } : tier);
    updateTiers(updated);
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
          <label>Wholesale Price (Single Item)</label>
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
          <small style={{ color: '#666' }}>Base price for wholesale buyers (qty 1)</small>
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

      {/* Volume Pricing Tiers */}
      {formData.wholesale_price && (
        <div className="form-card" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <strong>Volume Pricing Tiers</strong>
            <button type="button" onClick={addTier} className="btn secondary small">
              + Add Tier
            </button>
          </div>
          <small style={{ color: '#666', display: 'block', marginBottom: '12px' }}>
            Optional: Set lower prices for larger quantities. Wholesale buyers see the best price for their order qty.
          </small>

          {tiers.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>
                <span>Label</span>
                <span>Min Qty</span>
                <span>Price</span>
                <span></span>
              </div>

              {tiers.map((tier, index) => {
                const isCustomLabel = !STANDARD_TIER_LABELS.some(s => s.value === tier.label && s.value !== 'custom');
                const savings = tier.price && formData.wholesale_price
                  ? ((1 - parseFloat(tier.price) / parseFloat(formData.wholesale_price)) * 100).toFixed(1)
                  : null;

                return (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <div>
                      {isCustomLabel ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="text"
                            value={tier.label || ''}
                            onChange={e => updateTier(index, 'label', e.target.value)}
                            placeholder="Custom label"
                            style={{ flex: 1, fontSize: '13px' }}
                          />
                          <button
                            type="button"
                            onClick={() => updateTier(index, 'label', 'Bulk Buy')}
                            style={{ fontSize: '11px', padding: '2px 6px', background: 'none', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer' }}
                            title="Switch to standard labels"
                          >
                            &#x21C4;
                          </button>
                        </div>
                      ) : (
                        <select
                          value={tier.label || 'Bulk Buy'}
                          onChange={e => updateTier(index, 'label', e.target.value === 'custom' ? '' : e.target.value)}
                          style={{ fontSize: '13px' }}
                        >
                          {STANDARD_TIER_LABELS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <input
                      type="number"
                      min="2"
                      value={tier.min_qty || ''}
                      onChange={e => updateTier(index, 'min_qty', parseInt(e.target.value) || '')}
                      placeholder="Qty"
                      style={{ fontSize: '13px' }}
                    />
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '12px' }}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.price || ''}
                        onChange={e => updateTier(index, 'price', e.target.value)}
                        placeholder="0.00"
                        style={{ paddingLeft: '20px', fontSize: '13px' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(index)}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                      title="Remove tier"
                    >
                      &times;
                    </button>
                    {savings > 0 && (
                      <small style={{ gridColumn: '1 / -1', color: '#28a745', fontSize: '11px', marginTop: '-4px' }}>
                        {savings}% savings vs single item wholesale
                      </small>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tier preview */}
          {tiers.length > 0 && formData.wholesale_price && (
            <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '10px', fontSize: '12px' }}>
              <strong style={{ fontSize: '11px', color: '#555' }}>Price Schedule Preview:</strong>
              <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ background: '#e8f5e9', padding: '3px 8px', borderRadius: '4px' }}>
                  Single: ${parseFloat(formData.wholesale_price).toFixed(2)}
                </span>
                {tiers.filter(t => t.min_qty && t.price).map((tier, i) => (
                  <span key={i} style={{ background: '#e8f5e9', padding: '3px 8px', borderRadius: '4px' }}>
                    {tier.label || `${tier.min_qty}+`} {tier.min_qty}+: ${parseFloat(tier.price).toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minimum Order Quantity */}
      {formData.wholesale_price && (
        <div style={{ marginTop: '16px' }}>
          <label>Minimum Order Quantity (optional)</label>
          <input
            type="number"
            min="1"
            value={formData.wholesale_moq || ''}
            onChange={e => updateField('wholesale_moq', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="No minimum"
            style={{ maxWidth: '200px' }}
          />
          <small style={{ color: '#666' }}>If set, wholesale buyers must order at least this many units</small>
        </div>
      )}

      {/* Wholesale Description */}
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <label>Wholesale Description</label>
        <textarea
          value={formData.wholesale_description || ''}
          onChange={e => updateField('wholesale_description', e.target.value)}
          style={{ minHeight: '100px' }}
          placeholder="Optional: Specific information for wholesale buyers (packaging info, lead times, etc.)"
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

export function getWholesaleSummary(formData) {
  if (!formData.wholesale_price) return null;
  const tiers = (() => {
    try {
      if (!formData.wholesale_pricing_tiers) return [];
      const parsed = typeof formData.wholesale_pricing_tiers === 'string'
        ? JSON.parse(formData.wholesale_pricing_tiers) : formData.wholesale_pricing_tiers;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();
  const tierCount = tiers.filter(t => t.min_qty && t.price).length;
  let summary = `$${formData.wholesale_price} wholesale`;
  if (tierCount > 0) summary += ` + ${tierCount} tier${tierCount > 1 ? 's' : ''}`;
  if (formData.wholesale_moq) summary += ` (MOQ: ${formData.wholesale_moq})`;
  return summary;
}

