import { useState, useEffect } from 'react';
import { useProductForm } from '../../ProductFormContext';
import { fetchEbayProducts, saveEbayProduct } from '../../../../../../lib/catalog';

const EBAY_CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'NEW_OTHER', label: 'New (Other)' },
  { value: 'USED_EXCELLENT', label: 'Used - Excellent' },
  { value: 'USED_VERY_GOOD', label: 'Used - Very Good' },
  { value: 'USED_GOOD', label: 'Used - Good' }
];

export default function EbaySection() {
  const { formData, inventoryData, savedProductId } = useProductForm();
  const [ebayData, setEbayData] = useState({
    enabled: false, ebay_title: '', ebay_description: '', ebay_price: '',
    ebay_category_id: '', ebay_condition: 'NEW', allocated_quantity: '', terms_accepted: false
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { if (savedProductId && !loaded) loadExisting(); }, [savedProductId]);

  useEffect(() => {
    if (formData.name && !ebayData.ebay_title) {
      setEbayData(prev => ({
        ...prev, ebay_title: formData.name?.substring(0, 80) || '',
        ebay_description: formData.short_description || formData.description || '',
        ebay_price: formData.price || ''
      }));
    }
  }, [formData.name, formData.short_description, formData.description, formData.price]);

  async function loadExisting() {
    try {
      const result = await fetchEbayProducts();
      const products = result.products || result.data?.products || [];
      const match = products.find(p => p.id === savedProductId || p.id === parseInt(savedProductId));
      if (match?.ebay_data_id) {
        setEbayData({
          enabled: !!match.ebay_active, ebay_title: match.ebay_title || formData.name || '',
          ebay_description: match.ebay_description || '', ebay_price: match.ebay_price || '',
          ebay_category_id: match.ebay_category_id || '', ebay_condition: match.ebay_condition || 'NEW',
          allocated_quantity: match.allocated_quantity || '', terms_accepted: true
        });
      }
    } catch (err) { console.error('Failed to load eBay data:', err); }
    finally { setLoaded(true); }
  }

  async function handleSave() {
    if (!savedProductId) return;
    setSaving(true);
    try { await saveEbayProduct(savedProductId, { ...ebayData, is_active: ebayData.enabled ? 1 : 0 }); }
    catch (err) { console.error('eBay save error:', err); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    if (ebayData.enabled && ebayData.terms_accepted && savedProductId && loaded) {
      const t = setTimeout(handleSave, 1500);
      return () => clearTimeout(t);
    }
  }, [ebayData, savedProductId, loaded]);

  const handleChange = (f, v) => setEbayData(prev => ({ ...prev, [f]: v }));
  const handleAutoFill = () => setEbayData(prev => ({
    ...prev, ebay_title: (formData.name || '').substring(0, 80),
    ebay_description: formData.short_description || formData.description || '',
    ebay_price: formData.price
  }));

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#333' };

  return (
    <div>
      <div style={{ padding: '16px', background: ebayData.enabled ? '#e8f5e9' : '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={ebayData.enabled} onChange={e => handleChange('enabled', e.target.checked)} style={{ width: '20px', height: '20px' }} />
          <div><div style={{ fontWeight: '600' }}>List on eBay</div><div style={{ fontSize: '13px', color: '#666' }}>Sync this product to your connected eBay account</div></div>
        </label>
      </div>

      {ebayData.enabled && (
        <>
          <button type="button" onClick={handleAutoFill} style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontSize: '13px' }}>Auto-fill from product data</button>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>eBay Title (max 80 chars)</label><input type="text" value={ebayData.ebay_title} onChange={e => handleChange('ebay_title', e.target.value)} style={inputStyle} maxLength={80} /><div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{ebayData.ebay_title.length}/80</div></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>Price *</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span><input type="number" step="0.01" value={ebayData.ebay_price} onChange={e => handleChange('ebay_price', e.target.value)} style={{ ...inputStyle, paddingLeft: '24px' }} /></div></div>
            <div><label style={labelStyle}>Allocate Qty</label><input type="number" min="0" max={inventoryData.qty_available || 999} value={ebayData.allocated_quantity} onChange={e => handleChange('allocated_quantity', e.target.value)} style={inputStyle} placeholder={`Max: ${inventoryData.qty_available || 0}`} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>Condition</label><select value={ebayData.ebay_condition} onChange={e => handleChange('ebay_condition', e.target.value)} style={inputStyle}>{EBAY_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            <div><label style={labelStyle}>Category ID</label><input type="text" value={ebayData.ebay_category_id} onChange={e => handleChange('ebay_category_id', e.target.value)} style={inputStyle} placeholder="e.g. 73839" /></div>
          </div>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Description</label><textarea value={ebayData.ebay_description} onChange={e => handleChange('ebay_description', e.target.value)} style={{ ...inputStyle, minHeight: '80px' }} maxLength={5000} /></div>

          {!ebayData.terms_accepted && (
            <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={ebayData.terms_accepted} onChange={e => handleChange('terms_accepted', e.target.checked)} style={{ marginTop: '3px' }} />
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

export function getEbaySummary(ebayData) {
  if (!ebayData?.enabled) return 'Not enabled';
  return ebayData.ebay_price ? `$${ebayData.ebay_price}` : 'Configured';
}
