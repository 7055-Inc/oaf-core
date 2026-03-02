/**
 * eBay Connector (Catalog Addon)
 * Vendor-facing: eBay seller account connection and product management.
 * OAuth-only: users connect their own eBay accounts.
 */

import { useState, useEffect } from 'react';
import {
  fetchEbayShops,
  fetchEbayProducts,
  saveEbayProduct,
  ebayOAuthAuthorize,
  disconnectEbayShop
} from '../../../../lib/catalog';
import { getSmartMediaUrl } from '../../../../lib/config';

const EBAY_CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'NEW_OTHER', label: 'New (Other)' },
  { value: 'NEW_WITH_DEFECTS', label: 'New with Defects' },
  { value: 'USED_EXCELLENT', label: 'Used - Excellent' },
  { value: 'USED_VERY_GOOD', label: 'Used - Very Good' },
  { value: 'USED_GOOD', label: 'Used - Good' },
  { value: 'USED_ACCEPTABLE', label: 'Used - Acceptable' }
];

export default function EbayConnector({ userData }) {
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [formData, setFormData] = useState({
    ebay_title: '', ebay_description: '', ebay_price: '',
    ebay_category_id: '', ebay_condition: 'NEW', allocated_quantity: '', is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
    const params = new URLSearchParams(window.location.search);
    if (params.get('ebay_status') === 'connected') {
      setMessage({ type: 'success', text: 'eBay account connected successfully!' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('ebay_error')) {
      setMessage({ type: 'error', text: `Connection failed: ${params.get('ebay_error')}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [shopsRes, productsRes] = await Promise.all([fetchEbayShops(), fetchEbayProducts()]);
      setShops(shopsRes.shops || shopsRes.data?.shops || []);
      setProducts(productsRes.products || productsRes.data?.products || []);
    } catch (err) { console.error('Error loading eBay data:', err); }
    finally { setLoading(false); }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const result = await ebayOAuthAuthorize();
      if (result.redirect_url) window.location.href = result.redirect_url;
      else setMessage({ type: 'error', text: result.message || 'Failed to start connection' });
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setConnecting(false); }
  }

  async function handleDisconnect(shopId) {
    if (!confirm('Disconnect this eBay account? Products will stop syncing.')) return;
    try {
      await disconnectEbayShop(shopId);
      setMessage({ type: 'success', text: 'Account disconnected' });
      loadData();
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
  }

  function openProductModal(product) {
    setSelectedProduct(product);
    setFormData({
      ebay_title: product.ebay_title || product.name || '',
      ebay_description: product.ebay_description || product.short_description || product.description || '',
      ebay_price: product.ebay_price || product.price || '',
      ebay_category_id: product.ebay_category_id || '',
      ebay_condition: product.ebay_condition || 'NEW',
      allocated_quantity: product.allocated_quantity || '',
      is_active: product.ebay_active !== undefined ? !!product.ebay_active : true
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await saveEbayProduct(selectedProduct.id, formData);
      setMessage({ type: 'success', text: 'Product data saved' });
      setModalOpen(false);
      loadData();
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  }

  const activeShops = shops.filter(s => s.is_active);
  const hasConnectedShop = activeShops.length > 0;
  const filteredProducts = products.filter(p => {
    if (activeTab === 'configured') return p.ebay_status === 'configured';
    if (activeTab === 'unconfigured') return p.ebay_status !== 'configured';
    return true;
  });

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#333' };
  const btnStyle = (bg) => ({ padding: '10px 20px', background: bg, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' });

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div>
      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24', border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}` }}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ marginTop: 0 }}>Connected eBay Accounts</h3>
        {activeShops.length === 0 ? (
          <p style={{ color: '#666' }}>No eBay accounts connected yet.</p>
        ) : (
          activeShops.map(shop => (
            <div key={shop.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <strong>{shop.shop_name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>{shop.shop_id}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ background: '#28a745', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>Connected</span>
                <button onClick={() => handleDisconnect(shop.shop_id)} style={{ ...btnStyle('#dc3545'), padding: '6px 12px', fontSize: '12px' }}>Disconnect</button>
              </div>
            </div>
          ))
        )}
        <button onClick={handleConnect} disabled={connecting} style={{ ...btnStyle('#0064d2'), marginTop: '12px' }}>
          {connecting ? 'Connecting...' : 'Connect eBay Account'}
        </button>
      </div>

      {hasConnectedShop && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Products</h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'configured', 'unconfigured'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 16px', border: '1px solid #ddd', borderRadius: '6px', background: activeTab === tab ? '#333' : '#fff', color: activeTab === tab ? '#fff' : '#333', cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize' }}>{tab}</button>
              ))}
            </div>
          </div>
          {filteredProducts.length === 0 ? <p style={{ color: '#666' }}>No products found.</p> : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {filteredProducts.map(product => (
                <div key={product.id} onClick={() => openProductModal(product)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  {product.images?.[0] && <img src={getSmartMediaUrl ? getSmartMediaUrl(product.images[0], { w: 50, h: 50 }) : product.images[0]} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{product.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>${product.price} · {product.ebay_status === 'configured' ? (product.sync_status === 'synced' ? 'Synced' : 'Pending') : 'Not configured'}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: product.ebay_status === 'configured' ? '#d4edda' : '#f8f9fa', color: product.ebay_status === 'configured' ? '#155724' : '#666' }}>
                    {product.ebay_status === 'configured' ? 'Configured' : 'Not set up'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalOpen && selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '600px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Configure for eBay</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                <span style={{ fontWeight: '600' }}>List on eBay</span>
              </label>
            </div>
            {formData.is_active && (
              <>
                <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Title (max 80 chars)</label><input type="text" value={formData.ebay_title} onChange={e => setFormData(p => ({ ...p, ebay_title: e.target.value }))} style={inputStyle} maxLength={80} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div><label style={labelStyle}>Price</label><input type="number" step="0.01" value={formData.ebay_price} onChange={e => setFormData(p => ({ ...p, ebay_price: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Allocate Qty</label><input type="number" min="0" value={formData.allocated_quantity} onChange={e => setFormData(p => ({ ...p, allocated_quantity: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div><label style={labelStyle}>Condition</label>
                    <select value={formData.ebay_condition} onChange={e => setFormData(p => ({ ...p, ebay_condition: e.target.value }))} style={inputStyle}>
                      {EBAY_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Category ID</label><input type="text" value={formData.ebay_category_id} onChange={e => setFormData(p => ({ ...p, ebay_category_id: e.target.value }))} style={inputStyle} placeholder="e.g. 73839" /></div>
                </div>
                <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Description</label><textarea value={formData.ebay_description} onChange={e => setFormData(p => ({ ...p, ebay_description: e.target.value }))} style={{ ...inputStyle, minHeight: '80px' }} /></div>
              </>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={btnStyle('#6c757d')}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={btnStyle('#0064d2')}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
