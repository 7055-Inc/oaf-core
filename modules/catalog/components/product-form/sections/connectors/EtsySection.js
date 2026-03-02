import { useState, useEffect } from 'react';
import { useProductForm } from '../../ProductFormContext';
import {
  fetchEtsyProducts,
  saveEtsyProduct
} from '../../../../../../lib/catalog';

export default function EtsySection() {
  const { formData, inventoryData, savedProductId } = useProductForm();

  const [etsyData, setEtsyData] = useState({
    enabled: false,
    etsy_title: '',
    etsy_description: '',
    etsy_price: '',
    etsy_tags: '',
    etsy_materials: '',
    etsy_quantity: '',
    allocated_quantity: '',
    terms_accepted: false
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (savedProductId && !loaded) {
      loadExistingData();
    }
  }, [savedProductId]);

  useEffect(() => {
    if (formData.name && !etsyData.etsy_title) {
      setEtsyData(prev => ({
        ...prev,
        etsy_title: formData.name,
        etsy_description: formData.short_description || formData.description || '',
        etsy_price: formData.price || ''
      }));
    }
  }, [formData.name, formData.short_description, formData.description, formData.price]);

  async function loadExistingData() {
    try {
      const result = await fetchEtsyProducts();
      const products = result.products || result.data?.products || [];
      const match = products.find(p => p.id === savedProductId || p.id === parseInt(savedProductId));
      if (match && match.etsy_data_id) {
        setEtsyData({
          enabled: !!match.etsy_active,
          etsy_title: match.etsy_title || formData.name || '',
          etsy_description: match.etsy_description || '',
          etsy_price: match.etsy_price || '',
          etsy_tags: match.etsy_tags ? (typeof match.etsy_tags === 'string' ? match.etsy_tags : JSON.stringify(match.etsy_tags)) : '',
          etsy_materials: match.etsy_materials ? (typeof match.etsy_materials === 'string' ? match.etsy_materials : JSON.stringify(match.etsy_materials)) : '',
          etsy_quantity: match.etsy_quantity || '',
          allocated_quantity: match.allocated_quantity || '',
          terms_accepted: true
        });
      }
    } catch (err) {
      console.error('Failed to load Etsy data:', err);
    } finally {
      setLoaded(true);
    }
  }

  async function handleSave() {
    if (!savedProductId) return;
    setSaving(true);
    try {
      let tagsArr = [];
      if (etsyData.etsy_tags) {
        try { tagsArr = JSON.parse(etsyData.etsy_tags); } catch { tagsArr = etsyData.etsy_tags.split(',').map(t => t.trim()).filter(Boolean); }
      }
      let materialsArr = [];
      if (etsyData.etsy_materials) {
        try { materialsArr = JSON.parse(etsyData.etsy_materials); } catch { materialsArr = etsyData.etsy_materials.split(',').map(t => t.trim()).filter(Boolean); }
      }

      await saveEtsyProduct(savedProductId, {
        etsy_title: etsyData.etsy_title,
        etsy_description: etsyData.etsy_description,
        etsy_price: etsyData.etsy_price,
        etsy_tags: tagsArr,
        etsy_materials: materialsArr,
        etsy_quantity: etsyData.etsy_quantity,
        allocated_quantity: etsyData.allocated_quantity,
        is_active: etsyData.enabled ? 1 : 0
      });
    } catch (err) {
      console.error('Etsy save error:', err);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (etsyData.enabled && etsyData.terms_accepted && savedProductId && loaded) {
      const timer = setTimeout(handleSave, 1500);
      return () => clearTimeout(timer);
    }
  }, [etsyData, savedProductId, loaded]);

  const handleChange = (field, value) => setEtsyData(prev => ({ ...prev, [field]: value }));

  const handleAutoFill = () => {
    setEtsyData(prev => ({
      ...prev,
      etsy_title: formData.name,
      etsy_description: formData.short_description || formData.description || '',
      etsy_price: formData.price
    }));
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#333' };

  return (
    <div>
      <div style={{ padding: '16px', background: etsyData.enabled ? '#fff3e0' : '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={etsyData.enabled} onChange={e => handleChange('enabled', e.target.checked)} style={{ width: '20px', height: '20px' }} />
          <div>
            <div style={{ fontWeight: '600' }}>List on Etsy</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Sync this product to your connected Etsy shop</div>
          </div>
        </label>
      </div>

      {etsyData.enabled && (
        <>
          <button type="button" onClick={handleAutoFill} style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontSize: '13px' }}>
            Auto-fill from product data
          </button>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Etsy Title</label>
            <input type="text" value={etsyData.etsy_title} onChange={e => handleChange('etsy_title', e.target.value)} style={inputStyle} maxLength={140} />
            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{etsyData.etsy_title.length}/140 characters</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Price *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
                <input type="number" step="0.01" value={etsyData.etsy_price} onChange={e => handleChange('etsy_price', e.target.value)} style={{ ...inputStyle, paddingLeft: '24px' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Allocate Qty</label>
              <input type="number" min="0" max={inventoryData.qty_available || inventoryData.beginning_inventory || 999} value={etsyData.allocated_quantity} onChange={e => handleChange('allocated_quantity', e.target.value)} style={inputStyle} placeholder={`Max: ${inventoryData.qty_available || inventoryData.beginning_inventory || 0}`} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Tags (comma-separated)</label>
              <input type="text" value={etsyData.etsy_tags} onChange={e => handleChange('etsy_tags', e.target.value)} style={inputStyle} placeholder="art, painting, handmade" />
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Max 13 tags</div>
            </div>
            <div>
              <label style={labelStyle}>Materials (comma-separated)</label>
              <input type="text" value={etsyData.etsy_materials} onChange={e => handleChange('etsy_materials', e.target.value)} style={inputStyle} placeholder="canvas, acrylic paint" />
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Max 13 materials</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={etsyData.etsy_description} onChange={e => handleChange('etsy_description', e.target.value)} style={{ ...inputStyle, minHeight: '80px' }} maxLength={5000} placeholder="Product description for Etsy..." />
          </div>

          {!etsyData.terms_accepted && (
            <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={etsyData.terms_accepted} onChange={e => handleChange('terms_accepted', e.target.checked)} style={{ marginTop: '3px' }} />
                <span style={{ fontSize: '12px' }}>
                  I agree to the <a href="/terms/addons" target="_blank" style={{ color: '#055474' }}>Marketplace Connector Terms</a>. I understand removal triggers a 60-day cooldown.
                </span>
              </label>
            </div>
          )}

          {saving && <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>Saving...</p>}
        </>
      )}
    </div>
  );
}

export function getEtsySummary(etsyData) {
  if (!etsyData?.enabled) return 'Not enabled';
  return etsyData.etsy_price ? `$${etsyData.etsy_price}` : 'Configured';
}
