import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';

// Calculate Walmart price: wholesale×2 or retail+20%
const calculateWalmartPrice = (product) => {
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    return (parseFloat(product.wholesale_price) * 2).toFixed(2);
  }
  return (parseFloat(product.price) * 1.2).toFixed(2);
};

export default function WalmartConnector({ userData }) {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formData, setFormData] = useState({
    walmart_title: '',
    walmart_description: '',
    walmart_price: '',
    allocated_quantity: '',
    terms_accepted: false
  });

  useEffect(() => {
    fetchWalmartData();
  }, []);

  const fetchWalmartData = async () => {
    try {
      setLoading(true);
      const response = await authApiRequest('api/walmart/products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching Walmart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      walmart_title: product.walmart_title || product.name || '',
      walmart_description: product.walmart_description || product.description || '',
      walmart_price: product.walmart_price || calculateWalmartPrice(product),
      allocated_quantity: product.allocated_quantity || '',
      terms_accepted: !!product.terms_accepted_at
    });
    setModalOpen(true);
  };

  const handleAutoFill = () => {
    if (selectedProduct) {
      setFormData({
        ...formData,
        walmart_title: selectedProduct.name || '',
        walmart_description: selectedProduct.description || '',
        walmart_price: calculateWalmartPrice(selectedProduct)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.terms_accepted && !selectedProduct.terms_accepted_at) {
      alert('Please accept the Marketplace Connector terms to continue.');
      return;
    }
    
    try {
      const response = await authenticatedApiRequest(
        `api/walmart/products/${selectedProduct.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );
      
      const data = await response.json();
      if (data.success) {
        alert('Product added to Walmart marketplace!');
        setModalOpen(false);
        fetchWalmartData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving Walmart product:', error);
      alert('Error saving product. Please try again.');
    }
  };

  const handleRemove = async () => {
    const confirmMsg = 'Remove this product from Walmart?\n\nThis product cannot be re-added for 60 days.';
    if (!confirm(confirmMsg)) return;
    
    try {
      const response = await authenticatedApiRequest(
        `api/walmart/products/${selectedProduct.id}`,
        { method: 'DELETE' }
      );
      
      const data = await response.json();
      if (data.success) {
        alert(`Product removed. Cooldown ends: ${new Date(data.cooldown_ends_at).toLocaleDateString()}`);
        setModalOpen(false);
        fetchWalmartData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error removing product:', error);
      alert('Error removing product. Please try again.');
    }
  };

  // Filter products by tab
  const filteredProducts = products.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'listed') return p.walmart_id && p.is_active;
    if (activeTab === 'pending') return p.walmart_id && p.listing_status === 'pending';
    if (activeTab === 'cooldown') return p.cooldown_ends_at && new Date(p.cooldown_ends_at) > new Date();
    if (activeTab === 'available') return !p.walmart_id;
    return true;
  });

  // Stats
  const stats = {
    total: products.length,
    listed: products.filter(p => p.walmart_id && p.is_active).length,
    pending: products.filter(p => p.walmart_id && p.listing_status === 'pending').length,
    cooldown: products.filter(p => p.cooldown_ends_at && new Date(p.cooldown_ends_at) > new Date()).length,
    available: products.filter(p => !p.walmart_id).length
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Walmart data...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>🏪 Walmart Marketplace</h2>
        <p style={{ color: '#666', margin: 0 }}>
          List your products on Walmart.com through Brakebee's seller account.
        </p>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '10px', 
        marginBottom: '20px' 
      }}>
        {[
          { label: 'Total Products', value: stats.total, color: '#495057' },
          { label: 'Listed', value: stats.listed, color: '#28a745' },
          { label: 'Pending', value: stats.pending, color: '#ffc107' },
          { label: 'In Cooldown', value: stats.cooldown, color: '#dc3545' },
          { label: 'Available', value: stats.available, color: '#055474' }
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #dee2e6' }}>
        {['all', 'listed', 'pending', 'cooldown', 'available'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === tab ? '#055474' : 'transparent',
              color: activeTab === tab ? 'white' : '#495057',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'capitalize'
            }}
          >
            {tab} ({stats[tab] || stats.total})
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Product</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Your Price</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Walmart Price</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Allocation</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const inCooldown = product.cooldown_ends_at && new Date(product.cooldown_ends_at) > new Date();
              const cooldownDays = inCooldown ? Math.ceil((new Date(product.cooldown_ends_at) - new Date()) / (1000*60*60*24)) : 0;
              
              return (
                <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>{product.name}</strong>
                    {product.walmart_title && product.walmart_title !== product.name && (
                      <div style={{ fontSize: '12px', color: '#666' }}>Walmart: {product.walmart_title}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    ${product.price}
                    {product.wholesale_price && (
                      <div style={{ fontSize: '11px', color: '#666' }}>WS: ${product.wholesale_price}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {product.walmart_price ? (
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>${product.walmart_price}</span>
                    ) : (
                      <span style={{ color: '#999' }}>${calculateWalmartPrice(product)}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {product.allocated_quantity || '-'} / {product.inventory_count}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {inCooldown ? (
                      <span style={{ color: '#dc3545' }}>⏳ {cooldownDays}d cooldown</span>
                    ) : product.walmart_id ? (
                      <span style={{ 
                        color: product.listing_status === 'listed' ? '#28a745' : 
                               product.listing_status === 'pending' ? '#ffc107' : '#666'
                      }}>
                        {product.listing_status === 'listed' ? '● Listed' :
                         product.listing_status === 'pending' ? '○ Pending' :
                         product.listing_status}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>Not listed</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {inCooldown ? (
                      <span style={{ color: '#999', fontSize: '12px' }}>Unavailable</span>
                    ) : (
                      <button
                        onClick={() => openProductModal(product)}
                        style={{
                          padding: '6px 12px',
                          background: product.walmart_id ? '#6c757d' : '#055474',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {product.walmart_id ? 'Manage' : 'Add to Walmart'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredProducts.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No products found in this category.
          </div>
        )}
      </div>

      {/* Product Modal */}
      {modalOpen && selectedProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            width: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
              <h3 style={{ margin: 0 }}>
                {selectedProduct.walmart_id ? 'Manage' : 'Add to'} Walmart: {selectedProduct.name}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              {/* Pricing Info */}
              <div style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Retail Price</div>
                    <div style={{ fontWeight: 'bold' }}>${selectedProduct.price}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Wholesale Price</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedProduct.wholesale_price ? `$${selectedProduct.wholesale_price}` : '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Suggested Walmart</div>
                    <div style={{ fontWeight: 'bold', color: '#28a745' }}>${calculateWalmartPrice(selectedProduct)}</div>
                  </div>
                </div>
              </div>

              {/* Walmart Title */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Walmart Title
                </label>
                <input
                  type="text"
                  value={formData.walmart_title}
                  onChange={e => setFormData({ ...formData, walmart_title: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>

              {/* Walmart Description */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Walmart Description
                </label>
                <textarea
                  value={formData.walmart_description}
                  onChange={e => setFormData({ ...formData, walmart_description: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px' }}
                />
              </div>

              {/* Price & Allocation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Walmart Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.walmart_price}
                    onChange={e => setFormData({ ...formData, walmart_price: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Allocation (max: {selectedProduct.inventory_count})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedProduct.inventory_count}
                    value={formData.allocated_quantity}
                    onChange={e => setFormData({ ...formData, allocated_quantity: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    placeholder="Units for Walmart"
                  />
                </div>
              </div>

              {/* Auto-fill button */}
              <button
                type="button"
                onClick={handleAutoFill}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#e9ecef',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '20px'
                }}
              >
                🤖 Auto-fill from product data
              </button>

              {/* Terms checkbox (only if not already accepted) */}
              {!selectedProduct.terms_accepted_at && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  background: '#fff3cd', 
                  borderRadius: '8px',
                  border: '1px solid #ffc107'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.terms_accepted}
                      onChange={e => setFormData({ ...formData, terms_accepted: e.target.checked })}
                      style={{ marginTop: '4px' }}
                    />
                    <span>
                      I agree to the <a href="/terms/addons" target="_blank" style={{ color: '#055474' }}>
                        Marketplace Connector Terms
                      </a>. I understand this product will be sold via Brakebee's Walmart account 
                      and removal triggers a 60-day cooldown.
                    </span>
                  </label>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                
                {selectedProduct.walmart_id && selectedProduct.is_active && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    style={{
                      padding: '12px 20px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove (60-day cooldown)
                  </button>
                )}
                
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {selectedProduct.walmart_id ? 'Update' : 'Add to Walmart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

