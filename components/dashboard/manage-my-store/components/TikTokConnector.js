import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import slideInStyles from '../../SlideIn.module.css';

export default function TikTokConnector({ userData }) {
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

  useEffect(() => {
    fetchTikTokData();
  }, []);

  const fetchTikTokData = async () => {
    try {
      setLoading(true);
      
      // Fetch shops
      const shopsResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/tiktok/shops');
      const shopsData = await shopsResponse.json();
      if (shopsData.success) {
        setShops(shopsData.shops);
        setConnectionStatus(shopsData.shops.length > 0 ? 'connected' : 'disconnected');
      }

      // Fetch products
      const productsResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/tiktok/products');
      const productsData = await productsResponse.json();
      if (productsData.success) {
        setProducts(productsData.products);
      }

    } catch (error) {
      console.error('Error fetching TikTok data:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/tiktok/oauth/authorize');
      const data = await response.json();
      
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
        allocated_quantity: formData.allocated_quantity, // Keep existing allocation when copying default data
        is_active: true
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/api/tiktok/products/${selectedProduct.product_id || selectedProduct.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );
      
      const data = await response.json();
      if (data.success) {
        alert('Product updated successfully!');
        setModalOpen(false);
        fetchTikTokData(); // Refresh data
      } else {
        alert('Error updating product: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to remove this product from TikTok?')) {
      try {
        const response = await authenticatedApiRequest(
          `https://api2.onlineartfestival.com/api/tiktok/products/${selectedProduct.product_id || selectedProduct.id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, is_active: false })
          }
        );
        
        const data = await response.json();
        if (data.success) {
          alert('Product removed from TikTok!');
          setModalOpen(false);
          fetchTikTokData(); // Refresh data
        } else {
          alert('Error removing product: ' + data.error);
        }
      } catch (error) {
        console.error('Error removing product:', error);
        alert('Error removing product. Please try again.');
      }
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

  if (loading) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.content}>
          <div className="loading-state">
            <div className="spinner"></div>
            Loading TikTok data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.content}>
        
        {/* Connection Status Section */}
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
                  <button className="secondary" onClick={handleConnect}>
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
              <button onClick={handleConnect}>
                Connect TikTok Shop
              </button>
            </div>
          )}
        </div>

        {/* Product Management Section */}
        <div className="section-box">
          <h3>Product Management</h3>
          
          {/* Tabs */}
          <div className="tab-container">
            <button 
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Products ({products.length})
            </button>
            <button 
              className={`tab ${activeTab === 'synced' ? 'active' : ''}`}
              onClick={() => setActiveTab('synced')}
            >
              Synced ({products.filter(p => p.tiktok_product_id && p.is_active).length})
            </button>
            <button 
              className={`tab ${activeTab === 'unsynced' ? 'active' : ''}`}
              onClick={() => setActiveTab('unsynced')}
            >
              Unsynced ({products.filter(p => !p.tiktok_product_id || !p.is_active).length})
            </button>
            <button 
              className={`tab ${activeTab === 'imported' ? 'active' : ''}`}
              onClick={() => setActiveTab('imported')}
            >
              Imported ({products.filter(p => p.tiktok_product_id && !p.product_id).length})
            </button>
          </div>

          {/* Product List */}
          <div>
            {getFilteredProducts().length === 0 ? (
              <div className="empty-state">
                No products found in this category
              </div>
            ) : (
              <div className={slideInStyles.productCards}>
                {getFilteredProducts().map(product => (
                  <div 
                    key={product.id}
                    className={slideInStyles.productCard}
                    onClick={() => openProductModal(product)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {product.images && product.images.length > 0 && (
                        <img 
                          src={product.images[0].startsWith('http') 
                            ? product.images[0]
                            : `https://api2.onlineartfestival.com/api/media/serve/${product.images[0]}`
                          }
                          alt={product.name || product.tiktok_title}
                          className={slideInStyles.itemThumb}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div className={slideInStyles.productName}>
                          {product.tiktok_title || product.name}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                          Price: ${product.tiktok_price || product.price}
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          {product.tiktok_product_id && product.is_active ? (
                            <span className={slideInStyles.statusInStock}>✓ Synced</span>
                          ) : (
                            <span className={slideInStyles.statusOutOfStock}>⚠ Not synced</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Edit Modal */}
        {modalOpen && selectedProduct && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-title">
                Edit TikTok Product
                <button 
                  onClick={() => setModalOpen(false)}
                  style={{ 
                    float: 'right', 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '20px', 
                    cursor: 'pointer',
                    padding: '0',
                    width: '30px',
                    height: '30px'
                  }}
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
                      onChange={(e) => setFormData({...formData, tiktok_title: e.target.value})}
                      placeholder="Optimized title for TikTok"
                      required
                    />
                  </div>

                  <div>
                    <label>TikTok Description</label>
                    <textarea
                      value={formData.tiktok_description}
                      onChange={(e) => setFormData({...formData, tiktok_description: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, tiktok_price: e.target.value})}
                        placeholder="Price on TikTok"
                        required
                      />
                    </div>
                    <div>
                      <label>TikTok Category ID</label>
                      <input
                        type="text"
                        value={formData.tiktok_category_id}
                        onChange={(e) => setFormData({...formData, tiktok_category_id: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, allocated_quantity: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, tiktok_tags: e.target.value})}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>

                  <div className="toggle-slider-container" onClick={() => setFormData({...formData, is_active: !formData.is_active})}>
                    <input
                      type="checkbox"
                      className="toggle-slider-input"
                      checked={formData.is_active}
                      onChange={() => {}} // Handled by container click
                    />
                    <div className="toggle-slider"></div>
                    <span className="toggle-text">Active on TikTok</span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={copyDefaultData}>
                    Copy Default Data
                  </button>
                  <button 
                    type="button" 
                    className="secondary" 
                    onClick={handleDelete} 
                    style={{ color: '#dc3545', borderColor: '#dc3545' }}
                  >
                    Delete TikTok Product
                  </button>
                  <button type="submit">
                    Submit/Sync
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}