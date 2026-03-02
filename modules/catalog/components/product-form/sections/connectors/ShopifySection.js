import { useState, useEffect } from 'react';
import { useProductForm } from '../../ProductFormContext';
import {
  fetchShopifyProducts,
  saveShopifyProduct
} from '../../../../../../lib/catalog';

export default function ShopifySection() {
  const { formData, inventoryData, savedProductId } = useProductForm();

  const [shopifyData, setShopifyData] = useState({
    enabled: false,
    shopify_title: '',
    shopify_description: '',
    shopify_price: '',
    shopify_tags: '',
    shopify_product_type: 'Art',
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
    if (formData.name && !shopifyData.shopify_title) {
      setShopifyData(prev => ({
        ...prev,
        shopify_title: formData.name,
        shopify_description: formData.short_description || formData.description || '',
        shopify_price: formData.price || ''
      }));
    }
  }, [formData.name, formData.short_description, formData.description, formData.price]);

  async function loadExistingData() {
    try {
      const result = await fetchShopifyProducts();
      const products = result.products || result.data?.products || [];
      const match = products.find(p => p.id === savedProductId || p.id === parseInt(savedProductId));
      if (match && match.shopify_data_id) {
        setShopifyData({
          enabled: !!match.shopify_active,
          shopify_title: match.shopify_title || formData.name || '',
          shopify_description: match.shopify_description || '',
          shopify_price: match.shopify_price || '',
          shopify_tags: match.shopify_tags || '',
          shopify_product_type: match.shopify_product_type || 'Art',
          allocated_quantity: match.allocated_quantity || '',
          terms_accepted: true
        });
      }
    } catch (err) {
      console.error('Failed to load Shopify data:', err);
    } finally {
      setLoaded(true);
    }
  }

  async function handleSave() {
    if (!savedProductId) return;
    setSaving(true);
    try {
      await saveShopifyProduct(savedProductId, {
        ...shopifyData,
        is_active: shopifyData.enabled ? 1 : 0
      });
    } catch (err) {
      console.error('Shopify save error:', err);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (shopifyData.enabled && shopifyData.terms_accepted && savedProductId && loaded) {
      const timer = setTimeout(handleSave, 1500);
      return () => clearTimeout(timer);
    }
  }, [shopifyData, savedProductId, loaded]);

  const handleChange = (field, value) => setShopifyData(prev => ({ ...prev, [field]: value }));

  const handleAutoFill = () => {
    setShopifyData(prev => ({
      ...prev,
      shopify_title: formData.name,
      shopify_description: formData.short_description || formData.description || '',
      shopify_price: formData.price
    }));
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#333' };

  return (
    <div>
      <div style={{ padding: '16px', background: shopifyData.enabled ? '#e8f5e9' : '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={shopifyData.enabled} onChange={e => handleChange('enabled', e.target.checked)} style={{ width: '20px', height: '20px' }} />
          <div>
            <div style={{ fontWeight: '600' }}>List on Shopify</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Sync this product to your connected Shopify store</div>
          </div>
        </label>
      </div>

      {shopifyData.enabled && (
        <>
          <button type="button" onClick={handleAutoFill} style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontSize: '13px' }}>
            Auto-fill from product data
          </button>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Shopify Title</label>
            <input type="text" value={shopifyData.shopify_title} onChange={e => handleChange('shopify_title', e.target.value)} style={inputStyle} maxLength={255} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Price *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
                <input type="number" step="0.01" value={shopifyData.shopify_price} onChange={e => handleChange('shopify_price', e.target.value)} style={{ ...inputStyle, paddingLeft: '24px' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Allocate Qty</label>
              <input type="number" min="0" max={inventoryData.qty_available || inventoryData.beginning_inventory || 999} value={shopifyData.allocated_quantity} onChange={e => handleChange('allocated_quantity', e.target.value)} style={inputStyle} placeholder={`Max: ${inventoryData.qty_available || inventoryData.beginning_inventory || 0}`} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Product Type</label>
              <input type="text" value={shopifyData.shopify_product_type} onChange={e => handleChange('shopify_product_type', e.target.value)} style={inputStyle} placeholder="Art, Painting, etc." />
            </div>
            <div>
              <label style={labelStyle}>Tags</label>
              <input type="text" value={shopifyData.shopify_tags} onChange={e => handleChange('shopify_tags', e.target.value)} style={inputStyle} placeholder="art, handmade" />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={shopifyData.shopify_description} onChange={e => handleChange('shopify_description', e.target.value)} style={{ ...inputStyle, minHeight: '80px' }} maxLength={5000} placeholder="Product description for Shopify..." />
          </div>

          {!shopifyData.terms_accepted && (
            <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={shopifyData.terms_accepted} onChange={e => handleChange('terms_accepted', e.target.checked)} style={{ marginTop: '3px' }} />
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

export function getShopifySummary(shopifyData) {
  if (!shopifyData?.enabled) return 'Not enabled';
  return shopifyData.shopify_price ? `$${shopifyData.shopify_price}` : 'Configured';
}
