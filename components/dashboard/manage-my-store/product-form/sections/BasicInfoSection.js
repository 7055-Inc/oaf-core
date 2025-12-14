import { useEffect } from 'react';
import { useProductForm } from '../ProductFormContext';

export default function BasicInfoSection() {
  const { 
    formData, 
    updateField, 
    updateFields,
    categories, 
    loadCategories,
    generateSKU 
  } = useProductForm();

  useEffect(() => {
    if (categories.length === 0) {
      loadCategories();
    }
  }, [categories.length, loadCategories]);

  const handleGenerateSKU = () => {
    const sku = generateSKU(formData.name);
    updateField('sku', sku);
  };

  // Auto-update identifier_exists when GTIN changes
  const handleGTINChange = (value) => {
    updateFields({
      gtin: value,
      identifier_exists: value && value.trim() !== '' ? 'yes' : 'no'
    });
  };

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
      {/* Product Name */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          Product Name <span style={{ color: '#dc3545' }}>*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={e => updateField('name', e.target.value)}
          style={inputStyle}
          placeholder="Enter product name"
          required
        />
      </div>

      {/* Price and SKU Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>
            Retail Price <span style={{ color: '#dc3545' }}>*</span>
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
              value={formData.price}
              onChange={e => updateField('price', e.target.value)}
              style={{ ...inputStyle, paddingLeft: '28px' }}
              placeholder="0.00"
              required
            />
          </div>
        </div>
        
        <div>
          <label style={labelStyle}>
            SKU <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={formData.sku}
              onChange={e => updateField('sku', e.target.value.toUpperCase())}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="PROD-001"
              required
            />
            <button
              type="button"
              onClick={handleGenerateSKU}
              style={{
                padding: '0 12px',
                background: '#e9ecef',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="Generate SKU"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Category */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          Category <span style={{ color: '#dc3545' }}>*</span>
        </label>
        <select
          value={formData.category_id}
          onChange={e => updateField('category_id', e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
          required
        >
          <option value="">-- Select Category --</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.displayName || cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product Identifiers Section */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: '#333'
        }}>
          Product Identifiers
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              GTIN / UPC / Barcode
            </label>
            <input
              type="text"
              value={formData.gtin || ''}
              onChange={e => handleGTINChange(e.target.value)}
              style={inputStyle}
              placeholder="e.g., 012345678901"
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Universal Product Code (12-14 digits)
            </div>
          </div>
          
          <div>
            <label style={labelStyle}>
              MPN (Manufacturer Part Number)
            </label>
            <input
              type="text"
              value={formData.mpn || ''}
              onChange={e => updateField('mpn', e.target.value)}
              style={inputStyle}
              placeholder="e.g., ABC-12345"
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Your manufacturer's part number
            </div>
          </div>
        </div>

        {/* Identifier Status Indicator */}
        <div style={{ 
          marginTop: '12px', 
          padding: '8px 12px', 
          background: formData.gtin ? '#d4edda' : '#fff3cd',
          borderRadius: '4px',
          fontSize: '12px',
          color: formData.gtin ? '#155724' : '#856404',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{formData.gtin ? '✓' : 'ℹ️'}</span>
          <span>
            {formData.gtin 
              ? 'Product identifier exists - better visibility in search results'
              : 'No GTIN provided - consider adding for improved marketplace visibility'
            }
          </span>
        </div>
      </div>

      {/* Marketplace Classification */}
      <div style={{ 
        background: formData.marketplace_enabled ? '#e8f5e9' : '#f8f9fa', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: formData.marketplace_enabled ? '1px solid #c8e6c9' : '1px solid #e9ecef',
        transition: 'all 0.2s ease'
      }}>
        {/* Toggle Switch Row */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: formData.marketplace_enabled ? '16px' : '0'
        }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
              Marketplace Listing
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              {formData.marketplace_enabled 
                ? '✓ This product is visible on the Brakebee marketplace'
                : 'Enable to list this product on the Brakebee marketplace'
              }
            </div>
          </div>
          
          {/* Toggle Switch */}
          <label style={{ 
            position: 'relative', 
            display: 'inline-block', 
            width: '52px', 
            height: '28px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={formData.marketplace_enabled}
              onChange={e => updateField('marketplace_enabled', e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: formData.marketplace_enabled ? '#28a745' : '#ccc',
              borderRadius: '28px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '22px',
                width: '22px',
                left: formData.marketplace_enabled ? '27px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </span>
          </label>
        </div>
        
        {/* Category dropdown - only show when enabled */}
        {formData.marketplace_enabled && (
          <div>
            <label style={labelStyle}>
              Marketplace Category
            </label>
            <select
              value={formData.marketplace_category || 'unsorted'}
              onChange={e => updateField('marketplace_category', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="unsorted">Queued for manual curation</option>
              <option value="art">Art</option>
              <option value="crafts">Crafts & Handmade</option>
            </select>
          </div>
        )}
      </div>

      {/* Allow Returns */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={formData.allow_returns}
            onChange={e => updateField('allow_returns', e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '14px' }}>Allow returns on this product</span>
        </label>
      </div>
    </div>
  );
}

// Summary for collapsed state
export function getBasicInfoSummary(formData) {
  if (!formData.name) return null;
  return `${formData.name} — $${formData.price || '0.00'}`;
}
