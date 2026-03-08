/**
 * Meta/Facebook Connector (Catalog Addon)
 * Vendor-facing: Meta Commerce connection and product management.
 * Dual Mode: Personal Account (OAuth) + Corporate Shop (Brakebee)
 */

import { useState, useEffect } from 'react';
import {
  fetchMetaShops,
  disconnectMetaShop,
  metaOAuthAuthorize,
  fetchMetaProducts,
  saveMetaProduct,
  fetchMetaCorporateProducts,
  fetchMetaCorporateProduct,
  saveMetaCorporateProduct,
  removeMetaCorporateProduct,
} from '../../../../lib/catalog';
import { getSmartMediaUrl } from '../../../../lib/config';

const calculateCorporatePrice = (product) => {
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    return (parseFloat(product.wholesale_price) * 2).toFixed(2);
  }
  return (parseFloat(product.price) * 1.2).toFixed(2);
};

export default function MetaConnector({ userData }) {
  const [mode, setMode] = useState('personal');

  // Personal (OAuth) state
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [formData, setFormData] = useState({
    meta_title: '', meta_description: '', meta_price: '',
    meta_category: '', allocated_quantity: '', is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Corporate state
  const [corporateProducts, setCorporateProducts] = useState([]);
  const [corporateTab, setCorporateTab] = useState('all');
  const [corporateLoading, setCorporateLoading] = useState(false);
  const [corporateModalOpen, setCorporateModalOpen] = useState(false);
  const [selectedCorporateProduct, setSelectedCorporateProduct] = useState(null);
  const [corporateFormData, setCorporateFormData] = useState({
    corporate_title: '', corporate_description: '', corporate_price: '',
    corporate_brand: '', corporate_key_features: ['', '', '', '', ''],
    terms_accepted: false
  });

  useEffect(() => {
    if (mode === 'personal') loadPersonalData();
    else loadCorporateData();
  }, [mode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('meta_status') === 'connected') {
      setMessage({ type: 'success', text: 'Meta account connected successfully!' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('meta_error')) {
      setMessage({ type: 'error', text: `Connection failed: ${params.get('meta_error')}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function loadPersonalData() {
    setLoading(true);
    try {
      const [shopsRes, productsRes] = await Promise.all([fetchMetaShops(), fetchMetaProducts()]);
      setShops(shopsRes.shops || shopsRes.data?.shops || []);
      setProducts(productsRes.products || productsRes.data?.products || []);
    } catch (err) { console.error('Error loading Meta data:', err); }
    finally { setLoading(false); }
  }

  async function loadCorporateData() {
    setCorporateLoading(true);
    try {
      const data = await fetchMetaCorporateProducts();
      if (data.success && data.products) setCorporateProducts(data.products);
    } catch (err) { console.error('Error loading corporate products:', err); }
    finally { setCorporateLoading(false); }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const result = await metaOAuthAuthorize();
      if (result.redirect_url) window.location.href = result.redirect_url;
      else setMessage({ type: 'error', text: result.message || 'Failed to start connection' });
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setConnecting(false); }
  }

  async function handleDisconnect(shopId) {
    if (!confirm('Disconnect this Meta account? Products will stop syncing.')) return;
    try {
      await disconnectMetaShop(shopId);
      setMessage({ type: 'success', text: 'Account disconnected' });
      loadPersonalData();
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
  }

  function openProductModal(product) {
    setSelectedProduct(product);
    setFormData({
      meta_title: product.meta_title || product.name || '',
      meta_description: product.meta_description || product.short_description || product.description || '',
      meta_price: product.meta_price || product.price || '',
      meta_category: product.meta_category || '',
      allocated_quantity: product.allocated_quantity || '',
      is_active: product.meta_active !== undefined ? !!product.meta_active : true
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await saveMetaProduct(selectedProduct.id, formData);
      setMessage({ type: 'success', text: 'Product data saved' });
      setModalOpen(false);
      loadPersonalData();
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  }

  // Corporate modal handlers
  async function openCorporateModal(product) {
    try {
      setSelectedCorporateProduct(product);
      let existing = null;
      if (product.corporate_id) {
        try {
          const data = await fetchMetaCorporateProduct(product.id);
          if (data.success) existing = data.product;
        } catch (err) { console.log('No existing corporate data'); }
      }

      let keyFeatures = ['', '', '', '', ''];
      if (existing?.corporate_key_features) {
        try {
          const parsed = typeof existing.corporate_key_features === 'string'
            ? JSON.parse(existing.corporate_key_features) : existing.corporate_key_features;
          if (Array.isArray(parsed)) keyFeatures = [...parsed, '', '', '', '', ''].slice(0, 5);
        } catch (e) { console.error('Error parsing key features:', e); }
      }

      setCorporateFormData({
        corporate_title: existing?.corporate_title || product.name || '',
        corporate_description: existing?.corporate_description || product.description || '',
        corporate_price: existing?.corporate_price || calculateCorporatePrice(product),
        corporate_brand: existing?.corporate_brand || product.vendor_brand || userData?.brand_name || '',
        corporate_key_features: keyFeatures,
        terms_accepted: !!existing?.terms_accepted_at
      });
      setCorporateModalOpen(true);
    } catch (err) {
      console.error('Error opening corporate modal:', err);
      alert('Error loading product data');
    }
  }

  function handleCorporateKeyFeatureChange(index, value) {
    const updated = [...corporateFormData.corporate_key_features];
    updated[index] = value;
    setCorporateFormData({ ...corporateFormData, corporate_key_features: updated });
  }

  function handleCorporateAutoFill() {
    if (!selectedCorporateProduct) return;
    setCorporateFormData({
      ...corporateFormData,
      corporate_title: selectedCorporateProduct.name || '',
      corporate_description: selectedCorporateProduct.description || '',
      corporate_price: calculateCorporatePrice(selectedCorporateProduct),
      corporate_brand: selectedCorporateProduct.vendor_brand || userData?.brand_name || ''
    });
  }

  async function handleCorporateSubmit(e) {
    e.preventDefault();
    if (!corporateFormData.terms_accepted && !selectedCorporateProduct?.terms_accepted_at) {
      alert('Please accept the Corporate Marketplace terms to continue.');
      return;
    }
    if (!corporateFormData.corporate_title || !corporateFormData.corporate_description) {
      alert('Please fill in the required fields (Title and Description).');
      return;
    }
    try {
      const cleanedFeatures = corporateFormData.corporate_key_features.filter(f => f.trim());
      const submitData = {
        ...corporateFormData,
        corporate_key_features: cleanedFeatures.length > 0 ? cleanedFeatures : null
      };
      const data = await saveMetaCorporateProduct(selectedCorporateProduct.id, submitData);
      if (data.success) {
        alert('Product submitted for review!');
        setCorporateModalOpen(false);
        loadCorporateData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error('Error submitting corporate product:', err);
      alert('Error: ' + (err.message || 'Please try again.'));
    }
  }

  async function handleCorporateRemove() {
    if (!confirm('Remove this product from Corporate Shop?\n\nThis product cannot be re-submitted for 60 days.')) return;
    try {
      const data = await removeMetaCorporateProduct(selectedCorporateProduct.id);
      if (data.success) {
        alert(`Product removed. Cooldown ends: ${new Date(data.cooldown_ends_at).toLocaleDateString()}`);
        setCorporateModalOpen(false);
        loadCorporateData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error('Error removing corporate product:', err);
      alert('Error: ' + (err.message || 'Please try again.'));
    }
  }

  const activeShops = shops.filter(s => s.is_active);
  const hasConnectedShop = activeShops.length > 0;
  const filteredProducts = products.filter(p => {
    if (activeTab === 'configured') return p.meta_status === 'configured';
    if (activeTab === 'unconfigured') return p.meta_status !== 'configured';
    return true;
  });

  const getCorporateFilteredProducts = () => {
    switch (corporateTab) {
      case 'pending': return corporateProducts.filter(p => p.listing_status === 'pending');
      case 'listed': return corporateProducts.filter(p => p.listing_status === 'listed' && p.is_active);
      case 'paused': return corporateProducts.filter(p => p.listing_status === 'paused');
      case 'rejected': return corporateProducts.filter(p => p.listing_status === 'rejected');
      default: return corporateProducts;
    }
  };

  const corporateStats = {
    total: corporateProducts.length,
    pending: corporateProducts.filter(p => p.listing_status === 'pending').length,
    listed: corporateProducts.filter(p => p.listing_status === 'listed' && p.is_active).length,
    paused: corporateProducts.filter(p => p.listing_status === 'paused').length,
    rejected: corporateProducts.filter(p => p.listing_status === 'rejected').length
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#333' };
  const btnStyle = (bg) => ({ padding: '10px 20px', background: bg, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' });

  if ((mode === 'personal' && loading) || (mode === 'corporate' && corporateLoading && corporateProducts.length === 0)) {
    return <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>;
  }

  return (
    <>
      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24', border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}` }}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {/* Mode Switcher */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
        <button
          type="button"
          onClick={() => setMode('personal')}
          style={{
            flex: 1, padding: '12px 20px', border: '2px solid',
            borderColor: mode === 'personal' ? '#1B3A4B' : '#dee2e6',
            background: mode === 'personal' ? '#1B3A4B' : 'white',
            color: mode === 'personal' ? 'white' : '#495057',
            borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s'
          }}
        >
          Personal Account (OAuth)
        </button>
        <button
          type="button"
          onClick={() => setMode('corporate')}
          style={{
            flex: 1, padding: '12px 20px', border: '2px solid',
            borderColor: mode === 'corporate' ? '#1B3A4B' : '#dee2e6',
            background: mode === 'corporate' ? '#1B3A4B' : 'white',
            color: mode === 'corporate' ? 'white' : '#495057',
            borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s'
          }}
        >
          Corporate Shop (Brakebee)
        </button>
      </div>

      {/* Personal Mode */}
      {mode === 'personal' && (
        <>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginTop: 0 }}>Connected Meta Accounts</h3>
            {activeShops.length === 0 ? (
              <p style={{ color: '#666' }}>No Meta accounts connected yet.</p>
            ) : (
              activeShops.map(shop => (
                <div key={shop.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px' }}>
                  <div>
                    <strong>{shop.shop_name}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>Page ID: {shop.page_id || shop.shop_id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ background: '#28a745', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>Connected</span>
                    <button onClick={() => handleDisconnect(shop.shop_id)} style={{ ...btnStyle('#dc3545'), padding: '6px 12px', fontSize: '12px' }}>Disconnect</button>
                  </div>
                </div>
              ))
            )}
            <button onClick={handleConnect} disabled={connecting} style={{ ...btnStyle('#1B3A4B'), marginTop: '12px' }}>
              {connecting ? 'Connecting...' : 'Connect Meta Account'}
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
                        <div style={{ fontSize: '12px', color: '#666' }}>${product.price} · {product.meta_status === 'configured' ? (product.sync_status === 'synced' ? 'Synced' : 'Pending') : 'Not configured'}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: product.meta_status === 'configured' ? '#d4edda' : '#f8f9fa', color: product.meta_status === 'configured' ? '#155724' : '#666' }}>
                        {product.meta_status === 'configured' ? 'Configured' : 'Not set up'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Personal Configure Modal */}
          {modalOpen && selectedProduct && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModalOpen(false)}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '600px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0 }}>Configure for Meta</h3>
                  <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                    <span style={{ fontWeight: '600' }}>List on Meta/Facebook</span>
                  </label>
                </div>
                {formData.is_active && (
                  <>
                    <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Product Title</label><input type="text" value={formData.meta_title} onChange={e => setFormData(p => ({ ...p, meta_title: e.target.value }))} style={inputStyle} maxLength={500} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div><label style={labelStyle}>Price *</label><input type="number" step="0.01" value={formData.meta_price} onChange={e => setFormData(p => ({ ...p, meta_price: e.target.value }))} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Allocate Qty</label><input type="number" min="0" value={formData.allocated_quantity} onChange={e => setFormData(p => ({ ...p, allocated_quantity: e.target.value }))} style={inputStyle} /></div>
                    </div>
                    <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Category</label><input type="text" value={formData.meta_category} onChange={e => setFormData(p => ({ ...p, meta_category: e.target.value }))} style={inputStyle} placeholder="e.g. Home & Garden, Clothing" /></div>
                    <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Description</label><textarea value={formData.meta_description} onChange={e => setFormData(p => ({ ...p, meta_description: e.target.value }))} style={{ ...inputStyle, minHeight: '80px' }} /></div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setModalOpen(false)} style={btnStyle('#6c757d')}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={btnStyle('#1B3A4B')}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Corporate Mode */}
      {mode === 'corporate' && (
        <>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginTop: 0 }}>Corporate Meta Shop (Brakebee)</h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Submit your products to be listed on Brakebee&apos;s Meta/Facebook Shop. Products require admin approval before listing.
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total', value: corporateStats.total, color: '#495057' },
                { label: 'Listed', value: corporateStats.listed, color: '#28a745' },
                { label: 'Pending', value: corporateStats.pending, color: '#ffc107' },
                { label: 'Paused', value: corporateStats.paused, color: '#6c757d' },
                { label: 'Rejected', value: corporateStats.rejected, color: '#dc3545' }
              ].map(stat => (
                <div key={stat.label} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #dee2e6' }}>
              {['all', 'pending', 'listed', 'paused', 'rejected'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCorporateTab(tab)}
                  style={{
                    padding: '10px 20px', border: 'none',
                    background: corporateTab === tab ? '#1B3A4B' : 'transparent',
                    color: corporateTab === tab ? 'white' : '#495057',
                    borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold', textTransform: 'capitalize'
                  }}
                >
                  {tab} ({corporateStats[tab] ?? corporateStats.total})
                </button>
              ))}
            </div>

            {/* Corporate Product Table */}
            {corporateLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
            ) : (
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Product</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Your Price</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Corporate Price</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCorporateFilteredProducts().map(product => {
                      const inCooldown = product.cooldown_ends_at && new Date(product.cooldown_ends_at) > new Date();
                      const cooldownDays = inCooldown ? Math.ceil((new Date(product.cooldown_ends_at) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                      return (
                        <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>
                            <strong>{product.name}</strong>
                            {product.corporate_title && product.corporate_title !== product.name && (
                              <div style={{ fontSize: '12px', color: '#666' }}>Corporate: {product.corporate_title}</div>
                            )}
                            {product.rejection_reason && (
                              <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px' }}>Rejected: {product.rejection_reason}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            ${product.price}
                            {product.wholesale_price && <div style={{ fontSize: '11px', color: '#666' }}>WS: ${product.wholesale_price}</div>}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {product.corporate_price ? (
                              <span style={{ color: '#28a745', fontWeight: 'bold' }}>${product.corporate_price}</span>
                            ) : (
                              <span style={{ color: '#999' }}>${calculateCorporatePrice(product)}</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {inCooldown ? (
                              <span style={{ color: '#dc3545' }}>Cooldown {cooldownDays}d</span>
                            ) : (
                              <span style={{
                                color: product.listing_status === 'listed' ? '#28a745' :
                                       product.listing_status === 'pending' ? '#ffc107' :
                                       product.listing_status === 'paused' ? '#6c757d' :
                                       product.listing_status === 'rejected' ? '#dc3545' : '#666'
                              }}>
                                {product.listing_status === 'listed' ? 'Listed' :
                                 product.listing_status === 'pending' ? 'Pending Review' :
                                 product.listing_status === 'paused' ? 'Paused' :
                                 product.listing_status === 'rejected' ? 'Rejected' :
                                 product.listing_status || 'Not submitted'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {inCooldown ? (
                              <span style={{ color: '#999', fontSize: '12px' }}>Can resubmit: {new Date(product.cooldown_ends_at).toLocaleDateString()}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCorporateModal(product)}
                                style={{ padding: '6px 12px', background: product.corporate_id ? '#6c757d' : '#1B3A4B', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                {product.corporate_id ? 'Manage' : 'Submit to Corporate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {getCorporateFilteredProducts().length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    No products found in this category.
                    {corporateTab === 'all' && corporateProducts.length === 0 && (
                      <div style={{ marginTop: '10px' }}><strong>Get Started:</strong> Click &quot;Submit to Corporate&quot; on any product to list it on Brakebee&apos;s Meta Shop.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Corporate Submit Modal */}
          {corporateModalOpen && selectedCorporateProduct && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', borderRadius: '12px', width: '800px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6', flexShrink: 0 }}>
                  <h3 style={{ margin: 0 }}>
                    {selectedCorporateProduct.corporate_id ? 'Manage Corporate Listing' : 'Submit to Corporate Shop'}: {selectedCorporateProduct.name}
                  </h3>
                </div>

                <form onSubmit={handleCorporateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {/* Pricing Display */}
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Retail Price</div>
                          <div style={{ fontWeight: 'bold' }}>${selectedCorporateProduct.price}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Wholesale Price</div>
                          <div style={{ fontWeight: 'bold' }}>{selectedCorporateProduct.wholesale_price ? `$${selectedCorporateProduct.wholesale_price}` : '-'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Corporate Price</div>
                          <div style={{ fontWeight: 'bold', color: '#28a745' }}>${calculateCorporatePrice(selectedCorporateProduct)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '8px' }}>Corporate pricing: Wholesale × 2 or Retail × 1.2</div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Corporate Title *</label>
                      <input type="text" value={corporateFormData.corporate_title} onChange={e => setCorporateFormData({ ...corporateFormData, corporate_title: e.target.value })} style={inputStyle} required maxLength={255} />
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{corporateFormData.corporate_title.length}/255</div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Full Description *</label>
                      <textarea value={corporateFormData.corporate_description} onChange={e => setCorporateFormData({ ...corporateFormData, corporate_description: e.target.value })} style={{ ...inputStyle, minHeight: '120px' }} required placeholder="Detailed product description" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <label style={labelStyle}>Corporate Price</label>
                        <input type="number" step="0.01" value={corporateFormData.corporate_price} onChange={e => setCorporateFormData({ ...corporateFormData, corporate_price: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Brand</label>
                        <input type="text" value={corporateFormData.corporate_brand} onChange={e => setCorporateFormData({ ...corporateFormData, corporate_brand: e.target.value })} style={inputStyle} placeholder="Your brand or artist name" />
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Key Features (up to 5 bullet points)</label>
                      {corporateFormData.corporate_key_features.map((feature, index) => (
                        <input key={index} type="text" value={feature} onChange={e => handleCorporateKeyFeatureChange(index, e.target.value)} style={{ ...inputStyle, marginBottom: '8px' }} maxLength={500} placeholder={`Feature ${index + 1}...`} />
                      ))}
                    </div>

                    <button type="button" onClick={handleCorporateAutoFill} style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', marginBottom: '15px', fontSize: '13px' }}>
                      Auto-fill from product data
                    </button>
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa', flexShrink: 0 }}>
                    {!selectedCorporateProduct.terms_accepted_at && (
                      <div style={{ marginBottom: '15px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={corporateFormData.terms_accepted} onChange={e => setCorporateFormData({ ...corporateFormData, terms_accepted: e.target.checked })} style={{ marginTop: '4px' }} />
                          <span style={{ fontSize: '13px' }}>
                            I agree to the <a href="/terms/corporate-marketplace" target="_blank" rel="noopener noreferrer" style={{ color: '#055474' }}>Corporate Marketplace Terms</a>.
                            Products are subject to admin approval. Removal triggers a 60-day cooldown.
                          </span>
                        </label>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={() => setCorporateModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                      {selectedCorporateProduct.corporate_id && selectedCorporateProduct.listing_status !== 'removing' && (
                        <button type="button" onClick={handleCorporateRemove} style={{ padding: '12px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Remove (60-day cooldown)</button>
                      )}
                      <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {selectedCorporateProduct.corporate_id ? 'Update Submission' : 'Submit for Review'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
