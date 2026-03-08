/**
 * Product Curation Component
 * Admin interface for sorting marketplace products into categories (Art/Crafts)
 */

import { useState, useEffect } from 'react';
import { 
  fetchCurationStats, 
  fetchCurationProducts, 
  categorizeProduct 
} from '../../../lib/catalog';
import { getSmartMediaUrl } from '../../../lib/config';

export default function ProductCuration() {
  const [activeTab, setActiveTab] = useState('unsorted');
  const [products, setProducts] = useState({
    unsorted: [],
    art: [],
    crafts: []
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [processing, setProcessing] = useState(null); // Track which product is being processed

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProducts(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchCurationStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadProducts = async (category = null) => {
    try {
      const categories = category ? [category] : ['unsorted', 'art', 'crafts'];
      const results = {};

      for (const cat of categories) {
        const data = await fetchCurationProducts({ category: cat, limit: 100 });
        results[cat] = data.products || [];
      }

      setProducts(prev => ({ ...prev, ...results }));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleCategorize = async (productId, fromCategory, toCategory) => {
    try {
      setProcessing(productId);
      
      await categorizeProduct(productId, toCategory, `Admin curation: moved from ${fromCategory} to ${toCategory}`);

      // Move product between local state arrays
      const product = products[fromCategory].find(p => p.id === productId);
      if (product) {
        const updatedProduct = { ...product, marketplace_category: toCategory };
        
        setProducts(prev => ({
          ...prev,
          [fromCategory]: prev[fromCategory].filter(p => p.id !== productId),
          [toCategory]: [...prev[toCategory], updatedProduct]
        }));

        // Refresh stats
        loadStats();
      }
    } catch (error) {
      console.error('Error categorizing product:', error);
      alert(`Failed to move product: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const getImageUrl = (product) => {
    if (product.image_url) return getSmartMediaUrl(product.image_url);
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      return getSmartMediaUrl(typeof img === 'string' ? img : img.url);
    }
    return null;
  };

  const currentProducts = products[activeTab] || [];

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading curation data...</p>
      </div>
    );
  }

  return (
    <div className="curation-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Product Curation</h1>
          <p className="page-subtitle">Sort marketplace products into Art and Crafts categories</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => loadProducts()}
            disabled={loading}
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--primary-color)' }}>
              {stats.total_marketplace_products || 0}
            </div>
            <div className="stat-label">Total Marketplace Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#fd7e14' }}>
              {stats.unsorted_count || 0}
            </div>
            <div className="stat-label">Awaiting Curation</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#198754' }}>
              {stats.art_count || 0}
            </div>
            <div className="stat-label">Art Marketplace</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#3E1C56' }}>
              {stats.crafts_count || 0}
            </div>
            <div className="stat-label">Crafts Marketplace</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-container">
        <button
          className={`tab ${activeTab === 'unsorted' ? 'active' : ''}`}
          onClick={() => setActiveTab('unsorted')}
        >
          <i className="fas fa-inbox"></i>
          Unsorted ({products.unsorted?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'art' ? 'active' : ''}`}
          onClick={() => setActiveTab('art')}
        >
          <i className="fas fa-palette"></i>
          Art ({products.art?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'crafts' ? 'active' : ''}`}
          onClick={() => setActiveTab('crafts')}
        >
          <i className="fas fa-cut"></i>
          Crafts ({products.crafts?.length || 0})
        </button>
      </div>

      {/* Products Grid */}
      <div className="curation-products">
        {currentProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              {activeTab === 'unsorted' ? '✨' : '📦'}
            </div>
            <div className="empty-state-content">
              <h3>
                {activeTab === 'unsorted' 
                  ? 'All caught up!' 
                  : `No products in ${activeTab} marketplace`}
              </h3>
              <p>
                {activeTab === 'unsorted' 
                  ? 'All marketplace products have been curated. Great job!'
                  : `No products have been sorted to the ${activeTab} marketplace yet.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="product-curation-grid">
            {currentProducts.map(product => (
              <div key={product.id} className="product-curation-card">
                <div className="product-curation-image">
                  {getImageUrl(product) ? (
                    <img 
                      src={getImageUrl(product)} 
                      alt={product.name}
                    />
                  ) : (
                    <div className="product-curation-no-image">
                      <i className="fas fa-image"></i>
                      <span>No Image</span>
                    </div>
                  )}
                </div>
                
                <div className="product-curation-info">
                  <h4 className="product-curation-name">{product.name}</h4>
                  <div className="product-curation-meta">
                    by {product.vendor_name || 'Unknown'} • ${parseFloat(product.price || 0).toFixed(2)}
                  </div>
                  
                  {product.description && (
                    <p className="product-curation-description">
                      {product.description.length > 100 
                        ? `${product.description.substring(0, 100)}...`
                        : product.description
                      }
                    </p>
                  )}

                  <div className="product-curation-actions">
                    {activeTab === 'unsorted' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleCategorize(product.id, 'unsorted', 'art')}
                          disabled={processing === product.id}
                        >
                          {processing === product.id ? '...' : '→ Art'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleCategorize(product.id, 'unsorted', 'crafts')}
                          disabled={processing === product.id}
                        >
                          {processing === product.id ? '...' : '→ Crafts'}
                        </button>
                      </>
                    )}
                    
                    {activeTab === 'art' && (
                      <>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleCategorize(product.id, 'art', 'crafts')}
                          disabled={processing === product.id}
                        >
                          {processing === product.id ? '...' : '→ Crafts'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleCategorize(product.id, 'art', 'unsorted')}
                          disabled={processing === product.id}
                        >
                          {processing === product.id ? '...' : '→ Unsorted'}
                        </button>
                      </>
                    )}
                    
                    {activeTab === 'crafts' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleCategorize(product.id, 'crafts', 'art')}
                          disabled={processing === product.id}
                        >
                          {processing === product.id ? '...' : '→ Art'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleCategorize(product.id, 'crafts', 'unsorted')}
                          disabled={processing === product.id}
                        >
                          {processing === product.id ? '...' : '→ Unsorted'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="curation-links">
        <a 
          href="https://brakebee.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-link"
        >
          <i className="fas fa-external-link-alt"></i> View Art Marketplace
        </a>
        <a 
          href="https://crafts.brakebee.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-link"
        >
          <i className="fas fa-external-link-alt"></i> View Crafts Marketplace
        </a>
      </div>

      <style jsx>{`
        .curation-container {
          max-width: 1400px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.25rem;
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }

        .product-curation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .product-curation-card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: row;
        }

        .product-curation-image {
          flex-shrink: 0;
          width: 120px;
          height: 120px;
          background: #f8f9fa;
        }

        .product-curation-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-curation-no-image {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 0.75rem;
        }

        .product-curation-no-image i {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .product-curation-info {
          flex: 1;
          padding: 0.75rem 1rem;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .product-curation-name {
          margin: 0 0 0.25rem 0;
          font-size: 0.95rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .product-curation-meta {
          font-size: 0.75rem;
          color: #6c757d;
          margin-bottom: 0.5rem;
        }

        .product-curation-description {
          font-size: 0.8rem;
          color: #495057;
          margin: 0 0 0.5rem 0;
          flex: 1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .product-curation-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: auto;
        }

        .product-curation-actions .btn {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
        }

        .curation-links {
          margin-top: 1.5rem;
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .product-curation-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
