import { useState, useEffect } from 'react';
import { useProductForm } from '../../ProductFormContext';
import { fetchFaireProducts, saveFaireProduct } from '../../../../../../lib/catalog';

export default function FaireSection() {
  const { formData, inventoryData, savedProductId } = useProductForm();
  const [faireData, setFaireData] = useState({
    enabled: false, faire_title: '', faire_description: '',
    faire_wholesale_price: '', faire_retail_price: '',
    faire_minimum_order_quantity: '1', allocated_quantity: '', terms_accepted: false
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { if (savedProductId && !loaded) loadExisting(); }, [savedProductId]);

  useEffect(() => {
    if (formData.name && !faireData.faire_title) {
      setFaireData(prev => ({
        ...prev, faire_title: formData.name || '',
        faire_description: formData.short_description || formData.description || '',
        faire_wholesale_price: formData.price || ''
      }));
    }
  }, [formData.name, formData.short_description, formData.description, formData.price]);

  async function loadExisting() {
    try {
      const result = await fetchFaireProducts();
      const products = result.products || result.data?.products || [];
      const match = products.find(p => p.id === savedProductId || p.id === parseInt(savedProductId));
      if (match?.faire_data_id) {
        setFaireData({
          enabled: !!match.faire_active, faire_title: match.faire_title || formData.name || '',
          faire_description: match.faire_description || '',
          faire_wholesale_price: match.faire_wholesale_price || '',
          faire_retail_price: match.faire_retail_price || '',
          faire_minimum_order_quantity: match.faire_minimum_order_quantity || '1',
          allocated_quantity: match.allocated_quantity || '', terms_accepted: true
        });
      }
    } catch (err) { console.error('Failed to load Faire data:', err); }
    finally { setLoaded(true); }
  }

  async function handleSave() {
    if (!savedProductId) return;
    setSaving(true);
    try { await saveFaireProduct(savedProductId, { ...faireData, is_active: faireData.enabled ? 1 : 0 }); }
    catch (err) { console.error('Faire save error:', err); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    if (faireData.enabled && faireData.terms_accepted && savedProductId && loaded) {
      const t = setTimeout(handleSave, 1500);
      return () => clearTimeout(t);
    }
  }, [faireData, savedProductId, loaded]);

  const handleChange = (f, v) => setFaireData(prev => ({ ...prev, [f]: v }));
  const handleAutoFill = () => setFaireData(prev => ({
    ...prev, faire_title: formData.name || '',
    faire_description: formData.short_description || formData.description || '',
    faire_wholesale_price: formData.price
  }));

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#333' };

  return (
    <div>
      <div style={{ padding: '16px', background: faireData.enabled ? '#e3f2fd' : '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={faireData.enabled} onChange={e => handleChange('enabled', e.target.checked)} style={{ width: '20px', height: '20px' }} />
          <div><div style={{ fontWeight: '600' }}>List on Faire</div><div style={{ fontSize: '13px', color: '#666' }}>Sync this product to your connected Faire brand for wholesale</div></div>
        </label>
      </div>

      {faireData.enabled && (
        <>
          <button type="button" onClick={handleAutoFill} style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontSize: '13px' }}>Auto-fill from product data</button>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Product Name</label><input type="text" value={faireData.faire_title} onChange={e => handleChange('faire_title', e.target.value)} style={inputStyle} maxLength={500} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>Wholesale Price *</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span><input type="number" step="0.01" value={faireData.faire_wholesale_price} onChange={e => handleChange('faire_wholesale_price', e.target.value)} style={{ ...inputStyle, paddingLeft: '24px' }} /></div></div>
            <div><label style={labelStyle}>Retail Price (MSRP)</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span><input type="number" step="0.01" value={faireData.faire_retail_price} onChange={e => handleChange('faire_retail_price', e.target.value)} style={{ ...inputStyle, paddingLeft: '24px' }} /></div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>Min Order Qty</label><input type="number" min="1" value={faireData.faire_minimum_order_quantity} onChange={e => handleChange('faire_minimum_order_quantity', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Allocate Qty</label><input type="number" min="0" max={inventoryData.qty_available || 999} value={faireData.allocated_quantity} onChange={e => handleChange('allocated_quantity', e.target.value)} style={inputStyle} placeholder={`Max: ${inventoryData.qty_available || 0}`} /></div>
          </div>

          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Description</label><textarea value={faireData.faire_description} onChange={e => handleChange('faire_description', e.target.value)} style={{ ...inputStyle, minHeight: '80px' }} maxLength={5000} /></div>

          {!faireData.terms_accepted && (
            <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={faireData.terms_accepted} onChange={e => handleChange('terms_accepted', e.target.checked)} style={{ marginTop: '3px' }} />
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

export function getFaireSummary(faireData) {
  if (!faireData?.enabled) return 'Not enabled';
  return faireData.faire_wholesale_price ? `$${faireData.faire_wholesale_price} wholesale` : 'Configured';
}
