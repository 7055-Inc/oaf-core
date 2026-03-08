import { useState, useEffect, useCallback } from 'react';
import { useProductForm } from '../../ProductFormContext';
import { fetchWayfairCategories, fetchWayfairProduct, saveWayfairProduct } from '../../../../../../lib/catalog';

const calculateWayfairPrice = (retailPrice, wholesalePrice) => {
  if (wholesalePrice && parseFloat(wholesalePrice) > 0) {
    return (parseFloat(wholesalePrice) * 2).toFixed(2);
  }
  return (parseFloat(retailPrice || 0) * 1.2).toFixed(2);
};

export default function WayfairSection() {
  const { formData, inventoryData, savedProductId, userData, mode } = useProductForm();
  
  const [wayfairData, setWayfairData] = useState({
    enabled: false,
    wayfair_title: '',
    wayfair_description: '',
    wayfair_short_description: '',
    wayfair_price: '',
    wayfair_category: '',
    wayfair_brand: '',
    wayfair_sku: '',
    allocated_quantity: '',
    terms_accepted: false
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchWayfairCategories();
        if (data.success) {
          setCategories(data.data?.categories || data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching Wayfair categories:', err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (savedProductId && mode === 'edit') {
      loadWayfairData();
    }
  }, [savedProductId, mode]);

  const loadWayfairData = async () => {
    if (!savedProductId) return;
    
    setLoading(true);
    try {
      const data = await fetchWayfairProduct(savedProductId);
      if (data.success) {
        const p = data.data?.product || data.product;
        if (p && p.wayfair_corporate_id) {
          setExistingId(p.wayfair_corporate_id);
          setWayfairData({
            enabled: p.is_active === 1,
            wayfair_title: p.wayfair_title || '',
            wayfair_description: p.wayfair_description || '',
            wayfair_short_description: p.wayfair_short_description || '',
            wayfair_price: p.wayfair_price || '',
            wayfair_category: p.wayfair_category || '',
            wayfair_brand: p.wayfair_brand || '',
            wayfair_sku: p.wayfair_sku || '',
            allocated_quantity: p.allocated_quantity || '',
            terms_accepted: !!p.terms_accepted_at
          });
          setSaved(true);
        }
      }
    } catch (err) {
      console.log('No existing Wayfair data for this product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.name && !wayfairData.wayfair_title && !existingId) {
      setWayfairData(prev => ({
        ...prev,
        wayfair_title: formData.name,
        wayfair_description: formData.description || '',
        wayfair_short_description: formData.short_description || '',
        wayfair_price: calculateWayfairPrice(formData.price, formData.wholesale_price),
        wayfair_brand: userData?.artist_profile?.business_name || 'Brakebee Marketplace'
      }));
    }
  }, [formData.name, formData.description, formData.price, formData.wholesale_price, existingId]);

  const saveWayfairData = useCallback(async () => {
    if (!savedProductId) return;
    
    setSaving(true);
    try {
      const payload = {
        is_active: wayfairData.enabled ? 1 : 0,
        wayfair_title: wayfairData.wayfair_title,
        wayfair_description: wayfairData.wayfair_description,
        wayfair_short_description: wayfairData.wayfair_short_description,
        wayfair_price: wayfairData.wayfair_price,
        wayfair_category: wayfairData.wayfair_category,
        wayfair_brand: wayfairData.wayfair_brand,
        wayfair_sku: wayfairData.wayfair_sku,
        allocated_quantity: wayfairData.allocated_quantity,
        terms_accepted: wayfairData.terms_accepted
      };

      const data = await saveWayfairProduct(savedProductId, payload);
      if (data.success) setSaved(true);
    } catch (err) {
      console.error('Error saving Wayfair data:', err);
    } finally {
      setSaving(false);
    }
  }, [savedProductId, wayfairData]);

  useEffect(() => {
    if (!savedProductId) return;
    
    if (!wayfairData.enabled && existingId) {
      saveWayfairData();
      return;
    }
    
    if (!wayfairData.enabled) return;
    
    const timer = setTimeout(() => {
      if (wayfairData.wayfair_title && wayfairData.terms_accepted) {
        saveWayfairData();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [wayfairData, savedProductId, saveWayfairData, existingId]);

  const handleChange = (field, value) => {
    setWayfairData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    setWayfairData(prev => ({ ...prev, wayfair_category: selectedId }));
    setSaved(false);
  };

  const handleAutoFill = () => {
    setWayfairData(prev => ({
      ...prev,
      wayfair_title: formData.name,
      wayfair_description: formData.description || '',
      wayfair_short_description: formData.short_description || '',
      wayfair_price: calculateWayfairPrice(formData.price, formData.wholesale_price)
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
      <div style={{
        padding: '16px',
        background: wayfairData.enabled ? '#e8f5e9' : '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={wayfairData.enabled}
            onChange={e => handleChange('enabled', e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <div style={{ fontWeight: '600' }}>List on Wayfair.com</div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              Sell this product through Brakebee&apos;s Wayfair supplier account
            </div>
          </div>
        </label>
      </div>

      {wayfairData.enabled && (
        <>
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
              <div style={{ fontWeight: 'bold' }}>{formData.wholesale_price ? `$${formData.wholesale_price}` : '\u2014'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666' }}>Suggested Wayfair</div>
              <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                ${calculateWayfairPrice(formData.price, formData.wholesale_price)}
              </div>
            </div>
          </div>

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
            Auto-fill from product data
          </button>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Wayfair Product Category *</label>
            <select
              value={wayfairData.wayfair_category}
              onChange={handleCategoryChange}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">-- Select Category --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Wayfair Title</label>
            <input
              type="text"
              value={wayfairData.wayfair_title}
              onChange={e => handleChange('wayfair_title', e.target.value)}
              style={inputStyle}
              maxLength={200}
            />
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              {wayfairData.wayfair_title.length}/200
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Wayfair Price *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={wayfairData.wayfair_price}
                  onChange={e => handleChange('wayfair_price', e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '24px' }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Brand</label>
              <input
                type="text"
                value={wayfairData.wayfair_brand}
                onChange={e => handleChange('wayfair_brand', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Allocate Qty</label>
              <input
                type="number"
                min="0"
                max={inventoryData.qty_available || inventoryData.beginning_inventory || 999}
                value={wayfairData.allocated_quantity}
                onChange={e => handleChange('allocated_quantity', e.target.value)}
                style={inputStyle}
                placeholder={`Max: ${inventoryData.qty_available || inventoryData.beginning_inventory || 0}`}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Short Description</label>
            <textarea
              value={wayfairData.wayfair_short_description}
              onChange={e => handleChange('wayfair_short_description', e.target.value)}
              style={{ ...inputStyle, minHeight: '60px' }}
              maxLength={500}
            />
          </div>

          {!wayfairData.terms_accepted && (
            <div style={{
              padding: '12px',
              background: '#fff3cd',
              borderRadius: '6px',
              border: '1px solid #ffc107'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={wayfairData.terms_accepted}
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

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={saveWayfairData}
              disabled={saving || !wayfairData.terms_accepted}
              style={{
                padding: '10px 24px',
                background: saving ? '#6c757d' : 'var(--primary-color, #055474)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saving || !wayfairData.terms_accepted ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {saving ? 'Saving...' : 'Save Wayfair Data'}
            </button>
            
            {saved && (
              <span style={{ color: '#28a745', fontSize: '13px' }}>
                <i className="fas fa-check" style={{ marginRight: '4px' }}></i> Saved
              </span>
            )}
          </div>
          
          {!wayfairData.terms_accepted && (
            <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#dc3545' }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i> Accept terms to enable saving
            </div>
          )}
        </>
      )}
      
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Loading Wayfair data...
        </div>
      )}
    </div>
  );
}

export function getWayfairSummary(wayfairData) {
  if (!wayfairData?.enabled) return 'Not enabled';
  return wayfairData.wayfair_price ? `$${wayfairData.wayfair_price}` : 'Configured';
}
