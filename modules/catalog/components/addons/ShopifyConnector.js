/**
 * Shopify Connector (Catalog Addon)
 * Vendor-facing: Shopify store connection and product management.
 * OAuth-only: users connect their own Shopify stores.
 */

import { useState, useEffect } from 'react';
import {
  fetchShopifyShops,
  fetchShopifyProducts,
  saveShopifyProduct,
  shopifyOAuthAuthorize,
  disconnectShopifyShop,
  fetchShopifyAllocations,
  fetchShopifyLogs
} from '../../../../lib/catalog';
import { getSmartMediaUrl } from '../../../../lib/config';

export default function ShopifyConnector({ userData, appBridge }) {
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [formData, setFormData] = useState({
    shopify_title: '', shopify_description: '', shopify_price: '',
    shopify_tags: '', shopify_product_type: '', allocated_quantity: '', is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
    const params = new URLSearchParams(window.location.search);
    if (params.get('shopify_status') === 'connected') {
      setMessage({ type: 'success', text: 'Shopify store connected successfully!' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('shopify_error')) {
      setMessage({ type: 'error', text: `Connection failed: ${params.get('shopify_error')}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [shopsRes, productsRes] = await Promise.all([
        fetchShopifyShops(),
        fetchShopifyProducts()
      ]);
      setShops(shopsRes.shops || shopsRes.data?.shops || []);
      setProducts(productsRes.products || productsRes.data?.products || []);
    } catch (err) {
      console.error('Error loading Shopify data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!shopDomain.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Shopify store domain' });
      return;
    }
    setConnecting(true);
    try {
      const isEmbedded = typeof window !== 'undefined' && window.location.pathname.startsWith('/shopify');
      const result = await shopifyOAuthAuthorize(shopDomain.trim(), isEmbedded ? 'shopify' : undefined);
      if (result.redirect_url) {
        if (isEmbedded && appBridge) {
          const { Redirect } = await import('@shopify/app-bridge/actions');
          const redirect = Redirect.create(appBridge);
          redirect.dispatch(Redirect.Action.REMOTE, result.redirect_url);
        } else if (isEmbedded && window.top !== window.self) {
          window.open(result.redirect_url, '_blank');
        } else {
          window.location.href = result.redirect_url;
        }
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to start connection' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Connection error' });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect(shopId) {
    if (!confirm('Disconnect this store? Products will stop syncing.')) return;
    try {
      await disconnectShopifyShop(shopId);
      setMessage({ type: 'success', text: 'Store disconnected' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  function openProductModal(product) {
    setSelectedProduct(product);
    setFormData({
      shopify_title: product.shopify_title || product.name || '',
      shopify_description: product.shopify_description || product.short_description || product.description || '',
      shopify_price: product.shopify_price || product.price || '',
      shopify_tags: product.shopify_tags || '',
      shopify_product_type: product.shopify_product_type || 'Art',
      allocated_quantity: product.allocated_quantity || '',
      is_active: product.shopify_active !== undefined ? !!product.shopify_active : true
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await saveShopifyProduct(selectedProduct.id, formData);
      setMessage({ type: 'success', text: 'Product data saved' });
      setModalOpen(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  const activeShops = shops.filter(s => s.is_active);
  const hasConnectedShop = activeShops.length > 0;

  const filteredProducts = products.filter(p => {
    if (activeTab === 'configured') return p.shopify_status === 'configured';
    if (activeTab === 'unconfigured') return p.shopify_status !== 'configured';
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

      {/* Connected Shops */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ marginTop: 0 }}>Connected Stores</h3>
        {activeShops.length === 0 ? (
          <p style={{ color: '#666' }}>No Shopify stores connected yet.</p>
        ) : (
          activeShops.map(shop => (
            <div key={shop.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <strong>{shop.shop_name || shop.shop_domain}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>{shop.shop_domain}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ background: '#28a745', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>Connected</span>
                <button onClick={() => handleDisconnect(shop.shop_id)} style={{ ...btnStyle('#dc3545'), padding: '6px 12px', fontSize: '12px' }}>Disconnect</button>
              </div>
            </div>
          ))
        )}

        {/* Connect new store */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={shopDomain}
            onChange={e => setShopDomain(e.target.value)}
            placeholder="your-store.myshopify.com"
            style={{ ...inputStyle, flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
          />
          <button onClick={handleConnect} disabled={connecting} style={btnStyle('#96bf48')}>
            {connecting ? 'Connecting...' : 'Connect Store'}
          </button>
        </div>
      </div>

      {/* Products */}
      {hasConnectedShop && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Products</h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'configured', 'unconfigured'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 16px', border: '1px solid #ddd', borderRadius: '6px', background: activeTab === tab ? '#333' : '#fff', color: activeTab === tab ? '#fff' : '#333', cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize' }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <p style={{ color: '#666' }}>No products found.</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {filteredProducts.map(product => (
                <div key={product.id} onClick={() => openProductModal(product)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  {product.images?.[0] && (
                    <img src={getSmartMediaUrl ? getSmartMediaUrl(product.images[0], { w: 50, h: 50 }) : product.images[0]} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{product.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>${product.price} · {product.shopify_status === 'configured' ? (product.sync_status === 'synced' ? 'Synced' : 'Pending sync') : 'Not configured'}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: product.shopify_status === 'configured' ? '#d4edda' : '#f8f9fa', color: product.shopify_status === 'configured' ? '#155724' : '#666' }}>
                    {product.shopify_status === 'configured' ? 'Configured' : 'Not set up'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Edit Modal */}
      {modalOpen && selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '600px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Configure for Shopify</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                <span style={{ fontWeight: '600' }}>List on Shopify</span>
              </label>
            </div>

            {formData.is_active && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Title</label>
                  <input type="text" value={formData.shopify_title} onChange={e => setFormData(p => ({ ...p, shopify_title: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelStyle}>Price</label>
                    <input type="number" step="0.01" value={formData.shopify_price} onChange={e => setFormData(p => ({ ...p, shopify_price: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Allocate Qty</label>
                    <input type="number" min="0" value={formData.allocated_quantity} onChange={e => setFormData(p => ({ ...p, allocated_quantity: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Product Type</label>
                  <input type="text" value={formData.shopify_product_type} onChange={e => setFormData(p => ({ ...p, shopify_product_type: e.target.value }))} style={inputStyle} placeholder="Art, Painting, etc." />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Tags (comma-separated)</label>
                  <input type="text" value={formData.shopify_tags} onChange={e => setFormData(p => ({ ...p, shopify_tags: e.target.value }))} style={inputStyle} placeholder="art, handmade, painting" />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={formData.shopify_description} onChange={e => setFormData(p => ({ ...p, shopify_description: e.target.value }))} style={{ ...inputStyle, minHeight: '80px' }} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={{ ...btnStyle('#6c757d') }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={btnStyle('#96bf48')}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
