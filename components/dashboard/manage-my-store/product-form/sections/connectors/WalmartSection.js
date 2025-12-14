import { useState, useEffect, useCallback } from 'react';
import { useProductForm } from '../../ProductFormContext';
import { authApiRequest } from '../../../../../../lib/apiUtils';

// Calculate Walmart price: wholesale×2 or retail+20%
const calculateWalmartPrice = (retailPrice, wholesalePrice) => {
  if (wholesalePrice && parseFloat(wholesalePrice) > 0) {
    return (parseFloat(wholesalePrice) * 2).toFixed(2);
  }
  return (parseFloat(retailPrice || 0) * 1.2).toFixed(2);
};

export default function WalmartSection() {
  const { formData, inventoryData, savedProductId, userData, mode } = useProductForm();
  
  const [walmartData, setWalmartData] = useState({
    enabled: false,
    walmart_title: '',
    walmart_description: '',
    walmart_short_description: '',
    walmart_price: '',
    walmart_category_id: '',
    walmart_category_path: '',
    walmart_product_type: '',  // Walmart schema product type
    walmart_brand: '',
    allocated_quantity: '',
    terms_accepted: false
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState(null);

  // Fetch Walmart categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await authApiRequest('api/walmart/categories');
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching Walmart categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Load existing Walmart data when editing a product
  useEffect(() => {
    if (savedProductId && mode === 'edit') {
      loadWalmartData();
    }
  }, [savedProductId, mode]);

  const loadWalmartData = async () => {
    if (!savedProductId) return;
    
    setLoading(true);
    try {
      const res = await authApiRequest(`api/walmart/products/${savedProductId}`);
      const data = await res.json();
      
      if (data.success && data.product) {
        const p = data.product;
        setExistingId(p.id);
        setWalmartData({
          enabled: p.is_active === 1,
          walmart_title: p.walmart_title || '',
          walmart_description: p.walmart_description || '',
          walmart_short_description: p.walmart_short_description || '',
          walmart_price: p.walmart_price || '',
          walmart_category_id: p.walmart_category_id || '',
          walmart_category_path: p.walmart_category_path || '',
          walmart_product_type: p.walmart_product_type || '',
          walmart_brand: p.walmart_brand || '',
          allocated_quantity: p.allocated_quantity || '',
          terms_accepted: !!p.terms_accepted_at
        });
        setSaved(true);
      }
    } catch (err) {
      // No existing Walmart data - that's fine
      console.log('No existing Walmart data for this product');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill from product data (only if no Walmart title yet)
  useEffect(() => {
    if (formData.name && !walmartData.walmart_title && !existingId) {
      setWalmartData(prev => ({
        ...prev,
        walmart_title: formData.name,
        walmart_description: formData.description || '',
        walmart_short_description: formData.short_description || '',
        walmart_price: calculateWalmartPrice(formData.price, formData.wholesale_price),
        walmart_brand: userData?.artist_profile?.business_name || 'Brakebee Marketplace'
      }));
    }
  }, [formData.name, formData.description, formData.price, formData.wholesale_price, existingId]);

  // Save Walmart data
  const saveWalmartData = useCallback(async () => {
    if (!savedProductId) return;
    
    setSaving(true);
    try {
      const payload = {
        is_active: walmartData.enabled ? 1 : 0,
        walmart_title: walmartData.walmart_title,
        walmart_description: walmartData.walmart_description,
        walmart_short_description: walmartData.walmart_short_description,
        walmart_price: walmartData.walmart_price,
        walmart_category_id: walmartData.walmart_category_id,
        walmart_category_path: walmartData.walmart_category_path,
        walmart_product_type: walmartData.walmart_product_type,
        walmart_brand: walmartData.walmart_brand,
        allocated_quantity: walmartData.allocated_quantity,
        terms_accepted: walmartData.terms_accepted
      };

      // POST handles both create and update (via ON DUPLICATE KEY UPDATE)
      const res = await authApiRequest(`api/walmart/products/${savedProductId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        if (data.product?.id) {
          setExistingId(data.product.id);
        }
        setSaved(true);
      }
    } catch (err) {
      console.error('Error saving Walmart data:', err);
    } finally {
      setSaving(false);
    }
  }, [savedProductId, walmartData]);

  // Auto-save when data changes (debounced)
  // Also saves when toggling OFF to update is_active
  useEffect(() => {
    if (!savedProductId) return;
    
    // If turning off, save immediately to update is_active
    if (!walmartData.enabled && existingId) {
      saveWalmartData();
      return;
    }
    
    // Normal auto-save for enabled state
    if (!walmartData.enabled) return;
    
    const timer = setTimeout(() => {
      if (walmartData.walmart_title && walmartData.terms_accepted) {
        saveWalmartData();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [walmartData, savedProductId, saveWalmartData, existingId]);

  const handleChange = (field, value) => {
    setWalmartData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    const category = categories.find(c => c.id === selectedId);
    setWalmartData(prev => ({
      ...prev,
      walmart_category_id: selectedId,
      walmart_category_path: category?.path || '',
      walmart_product_type: category?.productType || ''
    }));
    setSaved(false);
  };

  const handleAutoFill = () => {
    setWalmartData(prev => ({
      ...prev,
      walmart_title: formData.name,
      walmart_description: formData.description || '',
      walmart_short_description: formData.short_description || '',
      walmart_price: calculateWalmartPrice(formData.price, formData.wholesale_price)
    }));
    setSaved(false);
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
        background: walmartData.enabled ? '#e8f5e9' : '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={walmartData.enabled}
            onChange={e => handleChange('enabled', e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <div style={{ fontWeight: '600' }}>List on Walmart.com</div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              Sell this product through Brakebee's Walmart seller account
            </div>
          </div>
        </label>
      </div>

      {walmartData.enabled && (
        <>
          {/* Pricing Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '13px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666' }}>Your Retail</div>
              <div style={{ fontWeight: 'bold' }}>${formData.price || '0.00'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666' }}>Wholesale</div>
              <div style={{ fontWeight: 'bold' }}>{formData.wholesale_price ? `$${formData.wholesale_price}` : '—'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666' }}>Suggested Walmart</div>
              <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                ${calculateWalmartPrice(formData.price, formData.wholesale_price)}
              </div>
            </div>
          </div>

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

          {/* Walmart Category */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Walmart Product Category *</label>
            <select
              value={walmartData.walmart_category_id}
              onChange={handleCategoryChange}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">-- Select Category --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {walmartData.walmart_category_path && (
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                📁 {walmartData.walmart_category_path}
              </div>
            )}
            {walmartData.walmart_product_type && (
              <div style={{ fontSize: '11px', color: '#055474', marginTop: '2px' }}>
                🏷️ Product Type: {walmartData.walmart_product_type}
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Walmart Title</label>
            <input
              type="text"
              value={walmartData.walmart_title}
              onChange={e => handleChange('walmart_title', e.target.value)}
              style={inputStyle}
              maxLength={200}
            />
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              {walmartData.walmart_title.length}/200
            </div>
          </div>

          {/* Price & Allocation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Walmart Price *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={walmartData.walmart_price}
                  onChange={e => handleChange('walmart_price', e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '24px' }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Brand</label>
              <input
                type="text"
                value={walmartData.walmart_brand}
                onChange={e => handleChange('walmart_brand', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Allocate Qty</label>
              <input
                type="number"
                min="0"
                max={inventoryData.qty_available || inventoryData.beginning_inventory || 999}
                value={walmartData.allocated_quantity}
                onChange={e => handleChange('allocated_quantity', e.target.value)}
                style={inputStyle}
                placeholder={`Max: ${inventoryData.qty_available || inventoryData.beginning_inventory || 0}`}
              />
            </div>
          </div>

          {/* Short Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Short Description</label>
            <textarea
              value={walmartData.walmart_short_description}
              onChange={e => handleChange('walmart_short_description', e.target.value)}
              style={{ ...inputStyle, minHeight: '60px' }}
              maxLength={500}
            />
          </div>

          {/* Terms */}
          {!walmartData.terms_accepted && (
            <div style={{
              padding: '12px',
              background: '#fff3cd',
              borderRadius: '6px',
              border: '1px solid #ffc107'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={walmartData.terms_accepted}
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

          {/* Save Button */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={saveWalmartData}
              disabled={saving || !walmartData.terms_accepted}
              style={{
                padding: '10px 24px',
                background: saving ? '#6c757d' : 'var(--primary-color, #055474)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saving || !walmartData.terms_accepted ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {saving ? '⏳ Saving...' : '💾 Save Walmart Data'}
            </button>
            
            {saved && (
              <span style={{ color: '#28a745', fontSize: '13px' }}>
                ✓ Saved
              </span>
            )}
          </div>
          
          {!walmartData.terms_accepted && (
            <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#dc3545' }}>
              ⚠️ Accept terms to enable saving
            </div>
          )}
        </>
      )}
      
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          ⏳ Loading Walmart data...
        </div>
      )}
    </div>
  );
}

// Summary for collapsed state
export function getWalmartSummary(walmartData) {
  if (!walmartData?.enabled) return 'Not enabled';
  return walmartData.walmart_price ? `$${walmartData.walmart_price}` : 'Configured';
}

