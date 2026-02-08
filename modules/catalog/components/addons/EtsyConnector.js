/**
 * Etsy Connector (Catalog Addon)
 * Vendor-facing: Etsy Shop OAuth connection and product sync.
 * OAuth-only (no corporate catalog).
 * Uses v2 API: /api/v2/catalog/etsy/* (lib/catalog).
 */

import { useState, useEffect } from 'react';
import {
  etsyOAuthAuthorize,
  fetchEtsyShops,
  fetchEtsyProducts,
  saveEtsyProduct,
} from '../../../../lib/catalog';

export default function EtsyConnector({ userData }) {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    shop_id: '',
    etsy_title: '',
    etsy_description: '',
    etsy_price: '',
    etsy_quantity: '',
    etsy_tags: '',
    etsy_category_id: '',
    allocated_quantity: '',
    is_active: true
  });

  useEffect(() => {
    fetchEtsyData();
  }, []);

  const fetchEtsyData = async () => {
    try {
      setLoading(true);
      const shopsData = await fetchEtsyShops();
      if (shopsData.success && shopsData.shops) {
        setShops(shopsData.shops);
        setConnectionStatus(shopsData.shops.length > 0 ? 'connected' : 'disconnected');
      }
      const productsData = await fetchEtsyProducts();
      if (productsData.success && productsData.products) {
        setProducts(productsData.products);
      }
    } catch (error) {
      console.error('Error fetching Etsy data:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const data = await etsyOAuthAuthorize();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.error) {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error initiating Etsy connection:', error);
      alert('Error connecting to Etsy. Please try again.');
    }
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      shop_id: shops.length > 0 ? shops[0].shop_id : '',
      etsy_title: product.etsy_title || product.name || '',
      etsy_description: product.etsy_description || product.description || '',
      etsy_price: product.etsy_price || product.price || '',
      etsy_quantity: product.etsy_quantity || product.inventory_count || '',
      etsy_tags: product.etsy_tags || '',
      etsy_category_id: product.etsy_category_id || '',
      allocated_quantity: product.allocated_quantity || '',
      is_active: product.is_active !== undefined ? product.is_active : true
    });
    setModalOpen(true);
  };

  const copyDefaultData = () => {
    if (selectedProduct) {
      setFormData({
        ...formData,
        etsy_title: selectedProduct.name || '',
        etsy_description: selectedProduct.description || '',
        etsy_price: selectedProduct.price || '',
        etsy_quantity: selectedProduct.inventory_count || ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shop_id) {
      alert('Please select an Etsy shop.');
      return;
    }
    try {
      await saveEtsyProduct(selectedProduct.id, formData);
      alert('Product listing saved successfully!');
      setModalOpen(false);
      fetchEtsyData();
    } catch (error) {
      console.error('Error saving Etsy product:', error);
      alert('Error: ' + (error.message || 'Please try again.'));
    }
  };

  const getFilteredProducts = () => {
    switch (activeTab) {
      case 'active':
        return products.filter(p => p.etsy_listing_id && p.listing_state === 'active');
      case 'draft':
        return products.filter(p => p.etsy_listing_id && p.listing_state === 'draft');
      case 'not_listed':
        return products.filter(p => !p.etsy_listing_id);
      default:
        return products;
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading Etsy data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="section-box">
        <h3>Etsy Shop Connection</h3>
        {connectionStatus === 'connected' && shops.length > 0 ? (
          <div>
            {shops.map(shop => (
              <div key={shop.id} className="success-alert">
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  ✓ Connected: {shop.shop_name}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                  Shop ID: {shop.shop_id} | Last sync: {shop.last_sync_at ? new Date(shop.last_sync_at).toLocaleDateString() : 'Never'}
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
              Connect your Etsy shop to start selling your products on Etsy
            </div>
            <button type="button" onClick={handleConnect}>
              Connect Etsy Shop
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
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active ({products.filter(p => p.etsy_listing_id && p.listing_state === 'active').length})
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'draft' ? 'active' : ''}`}
            onClick={() => setActiveTab('draft')}
          >
            Draft ({products.filter(p => p.etsy_listing_id && p.listing_state === 'draft').length})
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'not_listed' ? 'active' : ''}`}
            onClick={() => setActiveTab('not_listed')}
          >
            Not Listed ({products.filter(p => !p.etsy_listing_id).length})
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
                        alt={product.name || product.etsy_title}
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '4px' }}
                      />
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{product.etsy_title || product.name}</div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      Price: ${product.etsy_price || product.price}
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      {product.etsy_listing_id && product.listing_state === 'active' ? (
                        <span style={{ color: '#198754' }}>✓ Active on Etsy</span>
                      ) : product.etsy_listing_id && product.listing_state === 'draft' ? (
                        <span style={{ color: '#ffc107' }}>📝 Draft</span>
                      ) : (
                        <span style={{ color: '#856404' }}>⚠ Not listed</span>
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
              Edit Etsy Listing
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
                {shops.length > 1 && (
                  <div>
                    <label>Etsy Shop</label>
                    <select
                      value={formData.shop_id}
                      onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Shop --</option>
                      {shops.map(shop => (
                        <option key={shop.id} value={shop.shop_id}>
                          {shop.shop_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label>Etsy Title</label>
                  <input
                    type="text"
                    value={formData.etsy_title}
                    onChange={(e) => setFormData({ ...formData, etsy_title: e.target.value })}
                    placeholder="Listing title on Etsy"
                    required
                    maxLength={140}
                  />
                  <small style={{ fontSize: '11px', color: '#666' }}>{formData.etsy_title.length}/140 characters</small>
                </div>
                <div>
                  <label>Etsy Description</label>
                  <textarea
                    value={formData.etsy_description}
                    onChange={(e) => setFormData({ ...formData, etsy_description: e.target.value })}
                    placeholder="Listing description on Etsy"
                    rows={4}
                  />
                </div>
                <div className="form-grid-2">
                  <div>
                    <label>Etsy Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.etsy_price}
                      onChange={(e) => setFormData({ ...formData, etsy_price: e.target.value })}
                      placeholder="Listing price"
                      required
                    />
                  </div>
                  <div>
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.etsy_quantity}
                      onChange={(e) => setFormData({ ...formData, etsy_quantity: e.target.value })}
                      placeholder="Available quantity"
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
                    placeholder="Units to allocate to Etsy"
                  />
                  <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    Optional: Reserve specific inventory for Etsy sales
                  </small>
                </div>
                <div>
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.etsy_tags}
                    onChange={(e) => setFormData({ ...formData, etsy_tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                  />
                  <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    Max 13 tags, each up to 20 characters
                  </small>
                </div>
                <div>
                  <label>Category ID</label>
                  <input
                    type="text"
                    value={formData.etsy_category_id}
                    onChange={(e) => setFormData({ ...formData, etsy_category_id: e.target.value })}
                    placeholder="Etsy taxonomy category ID"
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
                  <span className="toggle-text">Active Listing</span>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={copyDefaultData}>
                  Copy Default Data
                </button>
                <button type="submit">Save Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
