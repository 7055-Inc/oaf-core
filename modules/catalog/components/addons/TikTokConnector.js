/**
 * TikTok Connector (Catalog Addon)
 * Vendor-facing: TikTok Shop connection and product data.
 * Dual Mode: Personal Shop (OAuth) + Corporate Shop (Brakebee)
 * Uses v2 API: /api/v2/catalog/tiktok/* (lib/catalog).
 */

import { useState, useEffect } from 'react';
import {
  // OAuth Personal Shop
  fetchTikTokShops,
  fetchTikTokProducts,
  saveTikTokProduct,
  tiktokOAuthAuthorize,
  // Corporate Shop
  fetchTikTokCorporateProducts,
  fetchTikTokCorporateProduct,
  saveTikTokCorporateProduct,
  removeTikTokCorporateProduct,
} from '../../../../lib/catalog';

// Helper: Calculate corporate price (wholesale × 2 or retail × 1.2)
const calculateCorporatePrice = (product) => {
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    return (parseFloat(product.wholesale_price) * 2).toFixed(2);
  }
  return (parseFloat(product.price) * 1.2).toFixed(2);
};

export default function TikTokConnector({ userData }) {
  // Mode state
  const [mode, setMode] = useState('personal'); // 'personal' or 'corporate'
  
  // Personal Shop (OAuth) State
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    tiktok_title: '',
    tiktok_description: '',
    tiktok_price: '',
    tiktok_tags: '',
    tiktok_category_id: '',
    allocated_quantity: '',
    is_active: true
  });

  // Corporate Shop State
  const [corporateProducts, setCorporateProducts] = useState([]);
  const [corporateTab, setCorporateTab] = useState('all');
  const [corporateLoading, setCorporateLoading] = useState(false);
  const [corporateModalOpen, setCorporateModalOpen] = useState(false);
  const [selectedCorporateProduct, setSelectedCorporateProduct] = useState(null);
  const [corporateFormData, setCorporateFormData] = useState({
    corporate_title: '',
    corporate_description: '',
    corporate_short_description: '',
    corporate_price: '',
    corporate_key_features: ['', '', '', '', ''],
    corporate_brand: '',
    corporate_category_id: '',
    corporate_main_image_url: '',
    corporate_additional_images: [],
    terms_accepted: false
  });

  useEffect(() => {
    if (mode === 'personal') {
      fetchTikTokData();
    } else {
      fetchCorporateData();
    }
  }, [mode]);

  // Personal Shop Functions
  const fetchTikTokData = async () => {
    try {
      setLoading(true);
      const shopsData = await fetchTikTokShops();
      if (shopsData.success && shopsData.shops) {
        setShops(shopsData.shops);
        setConnectionStatus(shopsData.shops.length > 0 ? 'connected' : 'disconnected');
      }
      const productsData = await fetchTikTokProducts();
      if (productsData.success && productsData.products) {
        setProducts(productsData.products);
      }
    } catch (error) {
      console.error('Error fetching TikTok data:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Corporate Shop Functions
  const fetchCorporateData = async () => {
    try {
      setCorporateLoading(true);
      const data = await fetchTikTokCorporateProducts();
      if (data.success && data.products) {
        setCorporateProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching corporate products:', error);
    } finally {
      setCorporateLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const data = await tiktokOAuthAuthorize();
      if (data.status === 'awaiting_approval') {
        alert('TikTok API integration is pending developer approval. You\'ll be notified when it\'s ready!');
      } else if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (error) {
      console.error('Error initiating TikTok connection:', error);
      alert('Error connecting to TikTok. Please try again.');
    }
  };

  // Corporate Modal Handlers
  const openCorporateModal = async (product) => {
    try {
      setSelectedCorporateProduct(product);
      
      // Try to fetch existing corporate data
      let existingCorporateData = null;
      if (product.corporate_id) {
        try {
          const data = await fetchTikTokCorporateProduct(product.id);
          if (data.success) {
            existingCorporateData = data.product;
          }
        } catch (err) {
          console.log('No existing corporate data');
        }
      }

      // Parse key features if they exist
      let keyFeatures = ['', '', '', '', ''];
      if (existingCorporateData?.corporate_key_features) {
        try {
          const parsed = typeof existingCorporateData.corporate_key_features === 'string'
            ? JSON.parse(existingCorporateData.corporate_key_features)
            : existingCorporateData.corporate_key_features;
          if (Array.isArray(parsed)) {
            keyFeatures = [...parsed, '', '', '', '', ''].slice(0, 5);
          }
        } catch (e) {
          console.error('Error parsing key features:', e);
        }
      }

      // Parse additional images if they exist
      let additionalImages = [];
      if (existingCorporateData?.corporate_additional_images) {
        try {
          const parsed = typeof existingCorporateData.corporate_additional_images === 'string'
            ? JSON.parse(existingCorporateData.corporate_additional_images)
            : existingCorporateData.corporate_additional_images;
          if (Array.isArray(parsed)) {
            additionalImages = parsed;
          }
        } catch (e) {
          console.error('Error parsing additional images:', e);
        }
      }

      setCorporateFormData({
        corporate_title: existingCorporateData?.corporate_title || product.name || '',
        corporate_description: existingCorporateData?.corporate_description || product.description || '',
        corporate_short_description: existingCorporateData?.corporate_short_description || product.short_description || '',
        corporate_price: existingCorporateData?.corporate_price || calculateCorporatePrice(product),
        corporate_key_features: keyFeatures,
        corporate_brand: existingCorporateData?.corporate_brand || product.vendor_brand || userData?.brand_name || '',
        corporate_category_id: existingCorporateData?.corporate_category_id || '',
        corporate_main_image_url: existingCorporateData?.corporate_main_image_url || (product.images && product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url) : ''),
        corporate_additional_images: additionalImages.length > 0 ? additionalImages : (product.images ? product.images.slice(1).map(img => typeof img === 'string' ? img : img.url) : []),
        terms_accepted: !!existingCorporateData?.terms_accepted_at
      });
      
      setCorporateModalOpen(true);
    } catch (error) {
      console.error('Error opening corporate modal:', error);
      alert('Error loading product data');
    }
  };

  const handleCorporateKeyFeatureChange = (index, value) => {
    const newFeatures = [...corporateFormData.corporate_key_features];
    newFeatures[index] = value;
    setCorporateFormData({ ...corporateFormData, corporate_key_features: newFeatures });
  };

  const handleCorporateAutoFill = () => {
    if (selectedCorporateProduct) {
      setCorporateFormData({
        ...corporateFormData,
        corporate_title: selectedCorporateProduct.name || '',
        corporate_description: selectedCorporateProduct.description || '',
        corporate_short_description: selectedCorporateProduct.short_description || '',
        corporate_price: calculateCorporatePrice(selectedCorporateProduct),
        corporate_brand: selectedCorporateProduct.vendor_brand || userData?.brand_name || ''
      });
    }
  };

  const handleCorporateSubmit = async (e) => {
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
      
      const data = await saveTikTokCorporateProduct(selectedCorporateProduct.id, submitData);
      if (data.success) {
        alert('Product submitted for review!');
        setCorporateModalOpen(false);
        fetchCorporateData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting corporate product:', error);
      alert('Error: ' + (error.message || 'Please try again.'));
    }
  };

  const handleCorporateRemove = async () => {
    const confirmMsg = 'Remove this product from Corporate Shop?\n\nThis product cannot be re-submitted for 60 days.';
    if (!confirm(confirmMsg)) return;
    
    try {
      const data = await removeTikTokCorporateProduct(selectedCorporateProduct.id);
      if (data.success) {
        alert(`Product removed. Cooldown ends: ${new Date(data.cooldown_ends_at).toLocaleDateString()}`);
        setCorporateModalOpen(false);
        fetchCorporateData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error removing corporate product:', error);
      alert('Error: ' + (error.message || 'Please try again.'));
    }
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      tiktok_title: product.tiktok_title || product.original_title || '',
      tiktok_description: product.tiktok_description || product.original_description || '',
      tiktok_price: product.tiktok_price || product.original_price || '',
      tiktok_tags: product.tiktok_tags || '',
      tiktok_category_id: product.tiktok_category_id || '',
      allocated_quantity: product.allocated_quantity || '',
      is_active: product.is_active !== undefined ? product.is_active : true
    });
    setModalOpen(true);
  };

  const copyDefaultData = () => {
    if (selectedProduct) {
      setFormData({
        tiktok_title: selectedProduct.name || '',
        tiktok_description: selectedProduct.description || '',
        tiktok_price: selectedProduct.price || '',
        tiktok_tags: '',
        tiktok_category_id: '',
        allocated_quantity: formData.allocated_quantity,
        is_active: true
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveTikTokProduct(selectedProduct.product_id || selectedProduct.id, formData);
      alert('Product updated successfully!');
      setModalOpen(false);
      fetchTikTokData();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product: ' + (error.message || 'Please try again.'));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this product from TikTok?')) return;
    try {
      await saveTikTokProduct(selectedProduct.product_id || selectedProduct.id, { ...formData, is_active: false });
      alert('Product removed from TikTok!');
      setModalOpen(false);
      fetchTikTokData();
    } catch (error) {
      console.error('Error removing product:', error);
      alert('Error removing product: ' + (error.message || 'Please try again.'));
    }
  };

  const getFilteredProducts = () => {
    switch (activeTab) {
      case 'synced':
        return products.filter(p => p.tiktok_product_id && p.is_active);
      case 'unsynced':
        return products.filter(p => !p.tiktok_product_id || !p.is_active);
      case 'imported':
        return products.filter(p => p.tiktok_product_id && !p.product_id);
      default:
        return products;
    }
  };

  const getCorporateFilteredProducts = () => {
    switch (corporateTab) {
      case 'pending':
        return corporateProducts.filter(p => p.listing_status === 'pending');
      case 'listed':
        return corporateProducts.filter(p => p.listing_status === 'listed' && p.is_active);
      case 'paused':
        return corporateProducts.filter(p => p.listing_status === 'paused');
      case 'rejected':
        return corporateProducts.filter(p => p.listing_status === 'rejected');
      default:
        return corporateProducts;
    }
  };

  const corporateStats = {
    total: corporateProducts.length,
    pending: corporateProducts.filter(p => p.listing_status === 'pending').length,
    listed: corporateProducts.filter(p => p.listing_status === 'listed' && p.is_active).length,
    paused: corporateProducts.filter(p => p.listing_status === 'paused').length,
    rejected: corporateProducts.filter(p => p.listing_status === 'rejected').length
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' };

  if ((mode === 'personal' && loading) || (mode === 'corporate' && corporateLoading && corporateProducts.length === 0)) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading TikTok data...</p>
      </div>
    );
  }

  return (
    <>
      {/* Mode Switcher */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
        <button
          type="button"
          onClick={() => setMode('personal')}
          style={{
            flex: 1,
            padding: '12px 20px',
            border: '2px solid',
            borderColor: mode === 'personal' ? '#055474' : '#dee2e6',
            background: mode === 'personal' ? '#055474' : 'white',
            color: mode === 'personal' ? 'white' : '#495057',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Personal Shop (OAuth)
        </button>
        <button
          type="button"
          onClick={() => setMode('corporate')}
          style={{
            flex: 1,
            padding: '12px 20px',
            border: '2px solid',
            borderColor: mode === 'corporate' ? '#055474' : '#dee2e6',
            background: mode === 'corporate' ? '#055474' : 'white',
            color: mode === 'corporate' ? 'white' : '#495057',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Corporate Shop (Brakebee)
        </button>
      </div>

      {/* Personal Shop Mode */}
      {mode === 'personal' && (
        <>
          <div className="section-box">
            <h3>TikTok Shop Connection</h3>
        {connectionStatus === 'connected' && shops.length > 0 ? (
          <div>
            {shops.map(shop => (
              <div key={shop.id} className="success-alert">
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  ✓ Connected: {shop.shop_name}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                  Region: {shop.shop_region} | Last sync: {shop.last_sync_at ? new Date(shop.last_sync_at).toLocaleDateString() : 'Never'}
                </div>
                <button type="button" className="secondary" onClick={handleConnect}>
                  Reconnect
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="warning-alert" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '15px' }}>
              <strong>Not Connected</strong>
            </div>
            <div style={{ marginBottom: '15px' }}>
              Connect your TikTok Shop to start selling your products on TikTok
            </div>
            <button type="button" onClick={handleConnect}>
              Connect TikTok Shop
            </button>
          </div>
        )}
      </div>

      <div className="section-box">
        <h3>Product Management</h3>
        <div className="tab-container">
          <button
            type="button"
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Products ({products.length})
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'synced' ? 'active' : ''}`}
            onClick={() => setActiveTab('synced')}
          >
            Synced ({products.filter(p => p.tiktok_product_id && p.is_active).length})
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'unsynced' ? 'active' : ''}`}
            onClick={() => setActiveTab('unsynced')}
          >
            Unsynced ({products.filter(p => !p.tiktok_product_id || !p.is_active).length})
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'imported' ? 'active' : ''}`}
            onClick={() => setActiveTab('imported')}
          >
            Imported ({products.filter(p => p.tiktok_product_id && !p.product_id).length})
          </button>
        </div>

        <div>
          {getFilteredProducts().length === 0 ? (
            <div className="empty-state">
              No products found in this category
            </div>
          ) : (
            <div className="product-cards" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {getFilteredProducts().map(product => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => openProductModal(product)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}
                >
                  {product.images && product.images.length > 0 && (() => {
                    const image = product.images[0];
                    const imgUrl = typeof image === 'string' ? image : image.url;
                    return (
                      <img
                        src={imgUrl.startsWith('http') ? imgUrl : `/api/media/serve/${imgUrl}`}
                        alt={product.name || product.tiktok_title}
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '4px' }}
                      />
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{product.tiktok_title || product.name}</div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      Price: ${product.tiktok_price || product.price}
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      {product.tiktok_product_id && product.is_active ? (
                        <span style={{ color: '#198754' }}>✓ Synced</span>
                      ) : (
                        <span style={{ color: '#856404' }}>⚠ Not synced</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Edit TikTok Product
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ float: 'right', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: 0, width: 30, height: 30 }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-card">
                <div>
                  <label>TikTok Title</label>
                  <input
                    type="text"
                    value={formData.tiktok_title}
                    onChange={(e) => setFormData({ ...formData, tiktok_title: e.target.value })}
                    placeholder="Optimized title for TikTok"
                    required
                  />
                </div>
                <div>
                  <label>TikTok Description</label>
                  <textarea
                    value={formData.tiktok_description}
                    onChange={(e) => setFormData({ ...formData, tiktok_description: e.target.value })}
                    placeholder="Optimized description for TikTok"
                    rows={4}
                  />
                </div>
                <div className="form-grid-2">
                  <div>
                    <label>TikTok Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tiktok_price}
                      onChange={(e) => setFormData({ ...formData, tiktok_price: e.target.value })}
                      placeholder="Price on TikTok"
                      required
                    />
                  </div>
                  <div>
                    <label>TikTok Category ID</label>
                    <input
                      type="text"
                      value={formData.tiktok_category_id}
                      onChange={(e) => setFormData({ ...formData, tiktok_category_id: e.target.value })}
                      placeholder="TikTok category ID"
                    />
                  </div>
                </div>
                <div>
                  <label>Inventory Allocation</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.allocated_quantity}
                    onChange={(e) => setFormData({ ...formData, allocated_quantity: e.target.value })}
                    placeholder="Units to allocate to TikTok"
                  />
                  <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    Optional: Reserve specific inventory for TikTok sales
                  </small>
                </div>
                <div>
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tiktok_tags}
                    onChange={(e) => setFormData({ ...formData, tiktok_tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
                <div className="toggle-slider-container" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                  <input
                    type="checkbox"
                    className="toggle-slider-input"
                    checked={formData.is_active}
                    onChange={() => {}}
                  />
                  <div className="toggle-slider"></div>
                  <span className="toggle-text">Active on TikTok</span>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={copyDefaultData}>
                  Copy Default Data
                </button>
                <button type="button" className="secondary" onClick={handleDelete} style={{ color: '#dc3545', borderColor: '#dc3545' }}>
                  Delete TikTok Product
                </button>
                <button type="submit">Submit/Sync</button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Corporate Shop Mode */}
      {mode === 'corporate' && (
        <>
          <div className="section-box">
            <h3>Corporate TikTok Shop (Brakebee)</h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Submit your products to be listed on Brakebee&apos;s TikTok Shop. Products require admin approval before listing.
            </p>

            {/* Stats Display */}
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

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #dee2e6' }}>
              {['all', 'pending', 'listed', 'paused', 'rejected'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCorporateTab(tab)}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: corporateTab === tab ? '#055474' : 'transparent',
                    color: corporateTab === tab ? 'white' : '#495057',
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab} ({corporateStats[tab] ?? corporateStats.total})
                </button>
              ))}
            </div>

            {/* Product List */}
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
                              <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px' }}>
                                Rejected: {product.rejection_reason}
                              </div>
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
                              <span style={{ color: '#999', fontSize: '12px' }}>
                                Can resubmit: {new Date(product.cooldown_ends_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCorporateModal(product)}
                                style={{
                                  padding: '6px 12px',
                                  background: product.corporate_id ? '#6c757d' : '#055474',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
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
                      <div style={{ marginTop: '10px' }}>
                        <strong>Get Started:</strong> Click &quot;Submit to Corporate&quot; on any product to list it on Brakebee&apos;s TikTok Shop.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Corporate Product Modal */}
          {corporateModalOpen && selectedCorporateProduct && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', borderRadius: '8px', width: '800px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                      <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
                        Corporate pricing: Wholesale × 2 or Retail × 1.2
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Corporate Title *</label>
                      <input
                        type="text"
                        value={corporateFormData.corporate_title}
                        onChange={e => setCorporateFormData({ ...corporateFormData, corporate_title: e.target.value })}
                        style={inputStyle}
                        required
                        maxLength={255}
                      />
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{corporateFormData.corporate_title.length}/255</div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Short Description</label>
                      <textarea
                        value={corporateFormData.corporate_short_description}
                        onChange={e => setCorporateFormData({ ...corporateFormData, corporate_short_description: e.target.value })}
                        style={{ ...inputStyle, minHeight: '60px' }}
                        maxLength={1000}
                        placeholder="Brief product summary for listings"
                      />
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{corporateFormData.corporate_short_description.length}/1000</div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Full Description *</label>
                      <textarea
                        value={corporateFormData.corporate_description}
                        onChange={e => setCorporateFormData({ ...corporateFormData, corporate_description: e.target.value })}
                        style={{ ...inputStyle, minHeight: '120px' }}
                        required
                        placeholder="Detailed product description"
                      />
                    </div>

                    {/* Brand and Category */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <label style={labelStyle}>Brand</label>
                        <input
                          type="text"
                          value={corporateFormData.corporate_brand}
                          onChange={e => setCorporateFormData({ ...corporateFormData, corporate_brand: e.target.value })}
                          style={inputStyle}
                          placeholder="Your brand or artist name"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Category</label>
                        <input
                          type="text"
                          value={corporateFormData.corporate_category_id}
                          onChange={e => setCorporateFormData({ ...corporateFormData, corporate_category_id: e.target.value })}
                          style={inputStyle}
                          placeholder="Product category"
                        />
                      </div>
                    </div>

                    {/* Key Features */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Key Features (up to 5 bullet points)</label>
                      {corporateFormData.corporate_key_features.map((feature, index) => (
                        <input
                          key={index}
                          type="text"
                          value={feature}
                          onChange={e => handleCorporateKeyFeatureChange(index, e.target.value)}
                          style={{ ...inputStyle, marginBottom: '8px' }}
                          maxLength={500}
                          placeholder={`Feature ${index + 1}...`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleCorporateAutoFill}
                      style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' }}
                    >
                      Auto-fill from product data
                    </button>
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa', flexShrink: 0 }}>
                    {!selectedCorporateProduct.terms_accepted_at && (
                      <div style={{ marginBottom: '15px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={corporateFormData.terms_accepted}
                            onChange={e => setCorporateFormData({ ...corporateFormData, terms_accepted: e.target.checked })}
                            style={{ marginTop: '4px' }}
                          />
                          <span style={{ fontSize: '13px' }}>
                            I agree to the <a href="/terms/corporate-marketplace" target="_blank" rel="noopener noreferrer" style={{ color: '#055474' }}>Corporate Marketplace Terms</a>. 
                            Products are subject to admin approval. Removal triggers a 60-day cooldown.
                          </span>
                        </label>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setCorporateModalOpen(false)}
                        style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      {selectedCorporateProduct.corporate_id && selectedCorporateProduct.listing_status !== 'removing' && (
                        <button
                          type="button"
                          onClick={handleCorporateRemove}
                          style={{ padding: '12px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Remove (60-day cooldown)
                        </button>
                      )}
                      <button
                        type="submit"
                        style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
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
