import { useState, useEffect } from 'react';
import { useProductForm } from '../../ProductFormContext';
import { fetchAmazonProducts, saveAmazonProduct } from '../../../../../../lib/catalog';

const AMAZON_CONDITIONS = [
  { value: 'new_new', label: 'New' },
  { value: 'new_open_box', label: 'New - Open Box' },
  { value: 'refurbished_refurbished', label: 'Refurbished' },
  { value: 'used_like_new', label: 'Used - Like New' },
  { value: 'used_very_good', label: 'Used - Very Good' },
  { value: 'used_good', label: 'Used - Good' }
];

export default function AmazonSection() {
  const { formData, inventoryData, savedProductId } = useProductForm();
  const [amazonData, setAmazonData] = useState({
    enabled: false, amazon_title: '', amazon_description: '', amazon_price: '',
    amazon_asin: '', amazon_sku: '', amazon_brand: '', amazon_condition: 'new_new',
    allocated_quantity: '', terms_accepted: false
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { if (savedProductId && !loaded) loadExisting(); }, [savedProductId]);

  useEffect(() => {
    if (formData.name && !amazonData.amazon_title) {
      setAmazonData(prev => ({
        ...prev, amazon_title: formData.name || '',
        amazon_description: formData.short_description || formData.description || '',
        amazon_price: formData.price || ''
      }));
    }
  }, [formData.name, formData.short_description, formData.description, formData.price]);

  async function loadExisting() {
    try {
      const result = await fetchAmazonProducts();
      const products = result.products || result.data?.products || [];
      const match = products.find(p => p.id === savedProductId || p.id === parseInt(savedProductId));
      if (match?.amazon_data_id) {
        setAmazonData({
          enabled: !!match.amazon_active, amazon_title: match.amazon_title || formData.name || '',
          amazon_description: match.amazon_description || '', amazon_price: match.amazon_price || '',
          amazon_asin: match.amazon_asin || '', amazon_sku: match.amazon_sku || '',
          amazon_brand: match.amazon_brand || '', amazon_condition: match.amazon_condition || 'new_new',
          allocated_quantity: match.allocated_quantity || '', terms_accepted: true
        });
      }
    } catch (err) { console.error('Failed to load Amazon data:', err); }
    finally { setLoaded(true); }
  }

  async function handleSave() {
    if (!savedProductId) return;
    setSaving(true);
    try { await saveAmazonProduct(savedProductId, { ...amazonData, is_active: amazonData.enabled ? 1 : 0 }); }
    catch (err) { console.error('Amazon save error:', err); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    if (amazonData.enabled && amazonData.terms_accepted && savedProductId && loaded) {
      const t = setTimeout(handleSave, 1500);
      return () => clearTimeout(t);
    }
  }, [amazonData, savedProductId, loaded]);

  const handleChange = (f, v) => setAmazonData(prev => ({ ...prev, [f]: v }));
  const handleAutoFill = () => setAmazonData(prev => ({
    ...prev, amazon_title: formData.name || '',
    amazon_description: formData.short_description || formData.description || '',
    amazon_price: formData.price
  }));

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#333' };

  return (
    <div>
      <div style={{ padding: '16px', background: amazonData.enabled ? '#fff3e0' : '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={amazonData.enabled} onChange={e => handleChange('enabled', e.target.checked)} style={{ width: '20px', height: '20px' }} />
          <div><div style={{ fontWeight: '600' }}>List on Amazon</div><div style={{ fontSize: '13px', color: '#666' }}>Sync this product to your connected Amazon seller account</div></div>
        </label>
      </div>

      {amazonData.enabled && (
        <>
          <button type="button" onClick={handleAutoFill} style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontSize: '13px' }}>Auto-fill from product data</button>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Amazon Title</label><input type="text" value={amazonData.amazon_title} onChange={e => handleChange('amazon_title', e.target.value)} style={inputStyle} maxLength={500} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>Price *</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span><input type="number" step="0.01" value={amazonData.amazon_price} onChange={e => handleChange('amazon_price', e.target.value)} style={{ ...inputStyle, paddingLeft: '24px' }} /></div></div>
            <div><label style={labelStyle}>Allocate Qty</label><input type="number" min="0" max={inventoryData.qty_available || 999} value={amazonData.allocated_quantity} onChange={e => handleChange('allocated_quantity', e.target.value)} style={inputStyle} placeholder={`Max: ${inventoryData.qty_available || 0}`} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>Brand</label><input type="text" value={amazonData.amazon_brand} onChange={e => handleChange('amazon_brand', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Condition</label><select value={amazonData.amazon_condition} onChange={e => handleChange('amazon_condition', e.target.value)} style={inputStyle}>{AMAZON_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>ASIN (optional)</label><input type="text" value={amazonData.amazon_asin} onChange={e => handleChange('amazon_asin', e.target.value)} style={inputStyle} placeholder="e.g. B08N5WRWNW" /></div>
            <div><label style={labelStyle}>SKU</label><input type="text" value={amazonData.amazon_sku} onChange={e => handleChange('amazon_sku', e.target.value)} style={inputStyle} placeholder="Auto-generated if blank" /></div>
          </div>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Description</label><textarea value={amazonData.amazon_description} onChange={e => handleChange('amazon_description', e.target.value)} style={{ ...inputStyle, minHeight: '80px' }} maxLength={5000} /></div>

          {!amazonData.terms_accepted && (
            <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={amazonData.terms_accepted} onChange={e => handleChange('terms_accepted', e.target.checked)} style={{ marginTop: '3px' }} />
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

export function getAmazonSummary(amazonData) {
  if (!amazonData?.enabled) return 'Not enabled';
  return amazonData.amazon_price ? `$${amazonData.amazon_price}` : 'Configured';
}
