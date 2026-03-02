import { useState, useEffect } from 'react';
import { useProductForm } from '../../ProductFormContext';
import { fetchMetaProducts, saveMetaProduct } from '../../../../../../lib/catalog';

export default function MetaSection() {
  const { formData, inventoryData, savedProductId } = useProductForm();
  const [metaData, setMetaData] = useState({
    enabled: false, meta_title: '', meta_description: '',
    meta_price: '', meta_category: '', allocated_quantity: '', terms_accepted: false
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { if (savedProductId && !loaded) loadExisting(); }, [savedProductId]);

  useEffect(() => {
    if (formData.name && !metaData.meta_title) {
      setMetaData(prev => ({
        ...prev, meta_title: formData.name || '',
        meta_description: formData.short_description || formData.description || '',
        meta_price: formData.price || ''
      }));
    }
  }, [formData.name, formData.short_description, formData.description, formData.price]);

  async function loadExisting() {
    try {
      const result = await fetchMetaProducts();
      const products = result.products || result.data?.products || [];
      const match = products.find(p => p.id === savedProductId || p.id === parseInt(savedProductId));
      if (match?.meta_data_id) {
        setMetaData({
          enabled: !!match.meta_active, meta_title: match.meta_title || formData.name || '',
          meta_description: match.meta_description || '',
          meta_price: match.meta_price || '',
          meta_category: match.meta_category || '',
          allocated_quantity: match.allocated_quantity || '', terms_accepted: true
        });
      }
    } catch (err) { console.error('Failed to load Meta data:', err); }
    finally { setLoaded(true); }
  }

  async function handleSave() {
    if (!savedProductId) return;
    setSaving(true);
    try { await saveMetaProduct(savedProductId, { ...metaData, is_active: metaData.enabled ? 1 : 0 }); }
    catch (err) { console.error('Meta save error:', err); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    if (metaData.enabled && metaData.terms_accepted && savedProductId && loaded) {
      const t = setTimeout(handleSave, 1500);
      return () => clearTimeout(t);
    }
  }, [metaData, savedProductId, loaded]);

  const handleChange = (f, v) => setMetaData(prev => ({ ...prev, [f]: v }));
  const handleAutoFill = () => setMetaData(prev => ({
    ...prev, meta_title: formData.name || '',
    meta_description: formData.short_description || formData.description || '',
    meta_price: formData.price
  }));

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#333' };

  return (
    <div>
      <div style={{ padding: '16px', background: metaData.enabled ? '#e3f2fd' : '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={metaData.enabled} onChange={e => handleChange('enabled', e.target.checked)} style={{ width: '20px', height: '20px' }} />
          <div><div style={{ fontWeight: '600' }}>List on Meta / Facebook</div><div style={{ fontSize: '13px', color: '#666' }}>Sync this product to your connected Meta Commerce account</div></div>
        </label>
      </div>

      {metaData.enabled && (
        <>
          <button type="button" onClick={handleAutoFill} style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontSize: '13px' }}>Auto-fill from product data</button>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Product Title</label><input type="text" value={metaData.meta_title} onChange={e => handleChange('meta_title', e.target.value)} style={inputStyle} maxLength={500} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>Price *</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span><input type="number" step="0.01" value={metaData.meta_price} onChange={e => handleChange('meta_price', e.target.value)} style={{ ...inputStyle, paddingLeft: '24px' }} /></div></div>
            <div><label style={labelStyle}>Allocate Qty</label><input type="number" min="0" max={inventoryData.qty_available || 999} value={metaData.allocated_quantity} onChange={e => handleChange('allocated_quantity', e.target.value)} style={inputStyle} placeholder={`Max: ${inventoryData.qty_available || 0}`} /></div>
          </div>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Category</label><input type="text" value={metaData.meta_category} onChange={e => handleChange('meta_category', e.target.value)} style={inputStyle} placeholder="e.g. Home & Garden, Clothing" /></div>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Description</label><textarea value={metaData.meta_description} onChange={e => handleChange('meta_description', e.target.value)} style={{ ...inputStyle, minHeight: '80px' }} maxLength={5000} /></div>

          {!metaData.terms_accepted && (
            <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={metaData.terms_accepted} onChange={e => handleChange('terms_accepted', e.target.checked)} style={{ marginTop: '3px' }} />
                <span style={{ fontSize: '12px' }}>I agree to the <a href="/terms/addons" target="_blank" style={{ color: '#055474' }}>Marketplace Connector Terms</a>. I understand removal triggers a 60-day cooldown.</span>
              </label>
            </div>
          )}
          {saving && <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>Saving...</p>}
        </>
      )}
    </div>
  );
}

export function getMetaSummary(metaData) {
  if (!metaData?.enabled) return 'Not enabled';
  return metaData.meta_price ? `$${metaData.meta_price}` : 'Configured';
}
