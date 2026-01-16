/**
 * Walmart Feed Management - Admin Component
 * 
 * Allows admins to:
 * - View all products opted into Walmart across all vendors
 * - Review draft products and activate them for the feed
 * - Pause/deactivate listings
 * - Edit Walmart-specific product data
 */

import { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function WalmartFeedManagement({ userData }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  const perPage = 25;

  useEffect(() => {
    fetchProducts();
  }, [activeTab, page, search]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: activeTab,
        page: page,
        limit: perPage,
        search: search
      });
      
      const response = await authApiRequest(`api/walmart/admin/products?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products);
        setTotalPages(Math.ceil(data.total / perPage));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (productId) => {
    if (!confirm('Activate this product for the Walmart feed?')) return;
    
    try {
      setSaving(true);
      const response = await authApiRequest(`api/walmart/admin/products/${productId}/activate`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        fetchProducts();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error activating product:', error);
      alert('Error activating product');
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (productId) => {
    if (!confirm('Pause this listing? It will be removed from the Walmart feed.')) return;
    
    try {
      setSaving(true);
      const response = await authApiRequest(`api/walmart/admin/products/${productId}/pause`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        fetchProducts();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error pausing product:', error);
      alert('Error pausing product');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    
    try {
      setSaving(true);
      const response = await authApiRequest(`api/walmart/admin/products/${editingProduct.product_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walmart_title: editingProduct.walmart_title,
          walmart_description: editingProduct.walmart_description,
          walmart_price: editingProduct.walmart_price
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setEditingProduct(null);
        fetchProducts();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const getTabCount = (tab) => {
    // This would ideally come from the API
    return products.length;
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>🏪 Walmart Feed Management</h2>
        <p style={{ color: '#666', margin: 0 }}>
          Review and manage products for the Brakebee Walmart feed.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search products or vendors..."
          style={{
            width: '300px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #dee2e6' }}>
        {[
          { key: 'pending', label: '📋 Pending Review', color: '#ffc107' },
          { key: 'active', label: '✅ Active', color: '#28a745' },
          { key: 'paused', label: '⏸️ Paused', color: '#6c757d' },
          { key: 'all', label: '📊 All', color: '#495057' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === tab.key ? '#055474' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#495057',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      ) : (
        <>
          <div style={{ 
            background: 'white', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            border: '1px solid #dee2e6' 
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <caption className="sr-only">Walmart feed products</caption>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Product</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Vendor</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Prices</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Allocation</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{product.name}</strong>
                      {product.walmart_title && product.walmart_title !== product.name && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          WM: {product.walmart_title}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#999' }}>ID: {product.product_id}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{product.vendor_name || product.username}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{product.vendor_email}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '12px' }}>
                        Retail: ${product.price}
                        {product.wholesale_price && (
                          <span> | WS: ${product.wholesale_price}</span>
                        )}
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                        WM: ${product.walmart_price}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {product.allocated_quantity || 0} / {product.inventory_count}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: product.listing_status === 'listed' ? '#d4edda' :
                                   product.listing_status === 'pending' ? '#fff3cd' :
                                   product.listing_status === 'paused' ? '#e2e3e5' : '#f8d7da',
                        color: product.listing_status === 'listed' ? '#155724' :
                               product.listing_status === 'pending' ? '#856404' :
                               product.listing_status === 'paused' ? '#383d41' : '#721c24'
                      }}>
                        {product.listing_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button
                          onClick={() => setEditingProduct(product)}
                          style={{
                            padding: '5px 10px',
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          Edit
                        </button>
                        
                        {product.listing_status === 'pending' && (
                          <button
                            onClick={() => handleActivate(product.product_id)}
                            disabled={saving}
                            style={{
                              padding: '5px 10px',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Activate
                          </button>
                        )}
                        
                        {product.listing_status === 'listed' && (
                          <button
                            onClick={() => handlePause(product.product_id)}
                            disabled={saving}
                            style={{
                              padding: '5px 10px',
                              background: '#ffc107',
                              color: '#212529',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Pause
                          </button>
                        )}
                        
                        {product.listing_status === 'paused' && (
                          <button
                            onClick={() => handleActivate(product.product_id)}
                            disabled={saving}
                            style={{
                              padding: '5px 10px',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {products.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                No products found.
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '10px', 
              marginTop: '20px' 
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  background: 'white'
                }}
              >
                Previous
              </button>
              <span style={{ padding: '8px 16px' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  background: 'white'
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingProduct && (
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
            width: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
              <h3 style={{ margin: 0 }}>Edit Walmart Listing</h3>
              <div style={{ fontSize: '14px', color: '#666' }}>{editingProduct.name}</div>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Walmart Title
                </label>
                <input
                  type="text"
                  value={editingProduct.walmart_title || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, walmart_title: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Walmart Description
                </label>
                <textarea
                  value={editingProduct.walmart_description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, walmart_description: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Walmart Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProduct.walmart_price || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, walmart_price: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setEditingProduct(null)}
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
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

