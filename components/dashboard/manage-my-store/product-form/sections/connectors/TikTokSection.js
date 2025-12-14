import { useState, useEffect } from 'react';
import { useProductForm } from '../../ProductFormContext';

export default function TikTokSection() {
  const { formData, inventoryData, savedProductId } = useProductForm();
  
  const [tiktokData, setTiktokData] = useState({
    enabled: false,
    tiktok_title: '',
    tiktok_description: '',
    tiktok_price: '',
    allocated_quantity: '',
    terms_accepted: false
  });

  // Auto-fill from product data
  useEffect(() => {
    if (formData.name && !tiktokData.tiktok_title) {
      setTiktokData(prev => ({
        ...prev,
        tiktok_title: formData.name,
        tiktok_description: formData.short_description || formData.description || '',
        tiktok_price: formData.price || ''
      }));
    }
  }, [formData.name, formData.short_description, formData.description, formData.price]);

  const handleChange = (field, value) => {
    setTiktokData(prev => ({ ...prev, [field]: value }));
  };

  const handleAutoFill = () => {
    setTiktokData(prev => ({
      ...prev,
      tiktok_title: formData.name,
      tiktok_description: formData.short_description || formData.description || '',
      tiktok_price: formData.price
    }));
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontWeight: '600',
    fontSize: '12px',
    color: '#333'
  };

  return (
    <div>
      {/* Enable/Disable Toggle */}
      <div style={{
        padding: '16px',
        background: tiktokData.enabled ? '#e8f5e9' : '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={tiktokData.enabled}
            onChange={e => handleChange('enabled', e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <div style={{ fontWeight: '600' }}>List on TikTok Shop</div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              Sell this product through Brakebee's TikTok Shop
            </div>
          </div>
        </label>
      </div>

      {tiktokData.enabled && (
        <>
          {/* Auto-fill button */}
          <button
            type="button"
            onClick={handleAutoFill}
            style={{
              width: '100%',
              padding: '10px',
              background: '#e9ecef',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '20px',
              fontSize: '13px'
            }}
          >
            🤖 Auto-fill from product data
          </button>

          {/* TikTok Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>TikTok Title</label>
            <input
              type="text"
              value={tiktokData.tiktok_title}
              onChange={e => handleChange('tiktok_title', e.target.value)}
              style={inputStyle}
              maxLength={200}
            />
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              {tiktokData.tiktok_title.length}/200
            </div>
          </div>

          {/* Price & Allocation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>TikTok Price *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={tiktokData.tiktok_price}
                  onChange={e => handleChange('tiktok_price', e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '24px' }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Allocate Qty</label>
              <input
                type="number"
                min="0"
                max={inventoryData.qty_available || inventoryData.beginning_inventory || 999}
                value={tiktokData.allocated_quantity}
                onChange={e => handleChange('allocated_quantity', e.target.value)}
                style={inputStyle}
                placeholder={`Max: ${inventoryData.qty_available || inventoryData.beginning_inventory || 0}`}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>TikTok Description</label>
            <textarea
              value={tiktokData.tiktok_description}
              onChange={e => handleChange('tiktok_description', e.target.value)}
              style={{ ...inputStyle, minHeight: '80px' }}
              maxLength={1000}
              placeholder="Product description for TikTok Shop..."
            />
          </div>

          {/* Terms */}
          {!tiktokData.terms_accepted && (
            <div style={{
              padding: '12px',
              background: '#fff3cd',
              borderRadius: '6px',
              border: '1px solid #ffc107'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={tiktokData.terms_accepted}
                  onChange={e => handleChange('terms_accepted', e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span style={{ fontSize: '12px' }}>
                  I agree to the <a href="/terms/addons" target="_blank" style={{ color: '#055474' }}>
                    Marketplace Connector Terms
                  </a>. I understand removal triggers a 60-day cooldown.
                </span>
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Summary for collapsed state  
export function getTikTokSummary(tiktokData) {
  if (!tiktokData?.enabled) return 'Not enabled';
  return tiktokData.tiktok_price ? `$${tiktokData.tiktok_price}` : 'Configured';
}

