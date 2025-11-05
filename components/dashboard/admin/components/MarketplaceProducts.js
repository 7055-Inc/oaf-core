import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getFrontendUrl } from '../../../../lib/config';

// Marketplace Products Admin Component
// Title is handled by slide-in header template in Dashboard
export default function MarketplaceProducts({ userData }) {
  const [activeTab, setActiveTab] = useState('unsorted');
  const [products, setProducts] = useState({
    unsorted: [],
    art: [],
    crafts: []
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [stats, setStats] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchProducts(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchProducts = async (category = null) => {
    try {
      setLoadingProducts(true);
      
      // Fetch products for specific category or all categories
      const categories = category ? [category] : ['unsorted', 'art', 'crafts'];
      const results = {};

      for (const cat of categories) {
        const response = await authApiRequest(
          `/api/admin/marketplace/products?category=${cat}&include=vendor,images`
        );
        
        if (response.ok) {
          const data = await response.json();
          results[cat] = data.products || [];
        } else {
          console.error(`Failed to fetch ${cat} products`);
          results[cat] = [];
        }
      }

      setProducts(prev => ({ ...prev, ...results }));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await authenticatedApiRequest(
        '/api/admin/marketplace/stats'
      );
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleProductSort = async (productId, fromCategory, toCategory) => {
    try {
      setProcessing(true);
      
      const response = await authenticatedApiRequest(
        `/api/admin/marketplace/products/${productId}/categorize`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: toCategory,
            reason: `Admin curation: moved from ${fromCategory} to ${toCategory}`
          })
        }
      );

      if (response.ok) {
        // Move product between local state arrays
        const product = products[fromCategory].find(p => p.id === productId);
        if (product) {
          // Update the product's category
          const updatedProduct = { ...product, marketplace_category: toCategory };
          
          setProducts(prev => ({
            ...prev,
            [fromCategory]: prev[fromCategory].filter(p => p.id !== productId),
            [toCategory]: [...prev[toCategory], updatedProduct]
          }));

          // Refresh stats
          fetchStats();
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to move product: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sorting product:', error);
      alert('Error sorting product. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getImageUrl = (product) => {
    if (product.image_url) {
      if (product.image_url.startsWith('http')) return product.image_url;
      return `/api/media/serve/${product.image_url}`;
    }
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      // Handle new format: {url, is_primary} or old format: string
      const img = typeof image === 'string' ? image : image.url;
      if (img.startsWith('http')) return img;
      return `/api/media/serve/${img}`;
    }
    return null;
  };

  const currentProducts = products[activeTab] || [];

  return (
    <>
      <div className="form-card">
        <h3>Marketplace Product Sorter</h3>
        <p>Curate products for the art and crafts marketplaces</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="form-grid-4">
          <div className="form-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#055474' }}>{stats.total_marketplace_products || 0}</div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Marketplace Products</div>
          </div>
          <div className="form-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>{stats.unsorted_count || 0}</div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>Awaiting Curation</div>
          </div>
          <div className="form-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#198754' }}>{stats.art_count || 0}</div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>Art Marketplace</div>
          </div>
          <div className="form-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3E1C56' }}>{stats.crafts_count || 0}</div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>Crafts Marketplace</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-container">
        <button
          className={`tab ${activeTab === 'unsorted' ? 'active' : ''}`}
          onClick={() => setActiveTab('unsorted')}
        >
          Unsorted ({products.unsorted?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'art' ? 'active' : ''}`}
          onClick={() => setActiveTab('art')}
        >
          Art Marketplace ({products.art?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'crafts' ? 'active' : ''}`}
          onClick={() => setActiveTab('crafts')}
        >
          Crafts Marketplace ({products.crafts?.length || 0})
        </button>
      </div>

      {/* Products Grid */}
      <div>
        {loadingProducts ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading products...</p>
          </div>
        ) : currentProducts.length === 0 ? (
          <div className="empty-state">
            <div>📦</div>
            <div>
              <h3>No products in {activeTab === 'unsorted' ? 'unsorted' : `${activeTab} marketplace`}</h3>
              <p>
                {activeTab === 'unsorted' 
                  ? 'All products have been curated! Great job.'
                  : `No products have been sorted to the ${activeTab} marketplace yet.`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="form-grid-2">
            {currentProducts.map(product => (
              <div key={product.id} className="form-card">
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flexShrink: 0 }}>
                    {getImageUrl(product) ? (
                      <img 
                        src={getImageUrl(product)} 
                        alt={product.name}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        background: '#f8f9fa', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#6c757d'
                      }}>
                        No Image
                      </div>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>{product.name}</h4>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                      by {product.vendor_name || product.vendor_username || 'Unknown'} • ${parseFloat(product.price || 0).toFixed(2)}
                    </div>
                    
                    {product.description && (
                      <p style={{ margin: '4px 0', fontSize: '13px', color: '#495057' }}>
                        {product.description.length > 80 
                          ? `${product.description.substring(0, 80)}...`
                          : product.description
                        }
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {activeTab === 'unsorted' && (
                        <>
                          <button
                            onClick={() => handleProductSort(product.id, 'unsorted', 'art')}
                            disabled={processing}
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            → Art
                          </button>
                          <button
                            onClick={() => handleProductSort(product.id, 'unsorted', 'crafts')}
                            disabled={processing}
                            className="secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            → Crafts
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'art' && (
                        <>
                          <button
                            onClick={() => handleProductSort(product.id, 'art', 'crafts')}
                            disabled={processing}
                            className="secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            → Crafts
                          </button>
                          <button
                            onClick={() => handleProductSort(product.id, 'art', 'unsorted')}
                            disabled={processing}
                            className="secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            → Unsorted
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'crafts' && (
                        <>
                          <button
                            onClick={() => handleProductSort(product.id, 'crafts', 'art')}
                            disabled={processing}
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            → Art
                          </button>
                          <button
                            onClick={() => handleProductSort(product.id, 'crafts', 'unsorted')}
                            disabled={processing}
                            className="secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            → Unsorted
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="modal-actions">
        <button
          onClick={() => fetchProducts()}
          disabled={loadingProducts}
          className="secondary"
        >
          🔄 Refresh Products
        </button>
        
        <button
          onClick={() => window.open(getFrontendUrl(''), '_blank')}
          className="secondary"
        >
          👁️ View Art Marketplace
        </button>
        
        <button
          onClick={() => window.open('https://crafts.beemeeart.com', '_blank')}
          className="secondary"
        >
          👁️ View Crafts Marketplace
        </button>
      </div>
    </>
  );
}
