import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getApiUrl, getSmartMediaUrl } from '../lib/config';

export default function Marketplace() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 24, offset: 0, hasMore: false });
  
  // Filter and sort state
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  useEffect(() => {
    fetchProducts();
  }, [category, sortBy, sortOrder, pagination.offset]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        include: 'images,vendor'
      });
      
      const response = await fetch(getApiUrl(`products/all?${params.toString()}`));
      
      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const data = await response.json();
      let allProducts = data.products || [];
      
      // Apply client-side category filtering
      if (category !== 'all') {
        allProducts = allProducts.filter(p => p.category_name?.toLowerCase() === category.toLowerCase());
      }
      
      // Apply client-side price filtering
      if (priceRange.min || priceRange.max) {
        allProducts = allProducts.filter(product => {
          const price = parseFloat(product.price);
          if (priceRange.min && price < parseFloat(priceRange.min)) return false;
          if (priceRange.max && price > parseFloat(priceRange.max)) return false;
          return true;
        });
      }
      
      // Apply client-side sorting
      allProducts.sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'ASC' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        } else if (sortBy === 'price') {
          return sortOrder === 'ASC' ? parseFloat(a.price) - parseFloat(b.price) : parseFloat(b.price) - parseFloat(a.price);
        } else if (sortBy === 'created_at') {
          return sortOrder === 'DESC' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at);
        }
        return 0;
      });
      
      // Client-side pagination
      const startIndex = pagination.offset;
      const endIndex = startIndex + pagination.limit;
      const paginatedProducts = allProducts.slice(startIndex, endIndex);
      
      setProducts(paginatedProducts);
      setPagination({
        total: allProducts.length,
        limit: pagination.limit,
        offset: pagination.offset,
        hasMore: endIndex < allProducts.length
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setPagination({ ...pagination, offset: 0 });
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    if (value === 'price_low') {
      setSortBy('price');
      setSortOrder('ASC');
    } else if (value === 'price_high') {
      setSortBy('price');
      setSortOrder('DESC');
    } else if (value === 'newest') {
      setSortBy('created_at');
      setSortOrder('DESC');
    } else if (value === 'name') {
      setSortBy('name');
      setSortOrder('ASC');
    }
    setPagination({ ...pagination, offset: 0 });
  };

  const handlePriceFilter = () => {
    fetchProducts();
  };

  const loadMore = () => {
    setPagination({ ...pagination, offset: pagination.offset + pagination.limit });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <>
      <Head>
        <title>Browse Art - Marketplace | Brakebee</title>
        <meta name="description" content="Discover and shop unique handmade art from talented artists. Browse our curated marketplace of paintings, sculptures, photography, and more." />
      </Head>

      <Header />

      <div className="container" style={{ paddingTop: '120px', paddingBottom: '80px' }}>

        {/* Filters and Sort Bar */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '40px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          {/* Category Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className={category === 'all' ? 'primary' : 'secondary'}
              onClick={() => handleCategoryChange('all')}
              style={{ padding: '8px 16px' }}
            >
              All
            </button>
            <button
              className={category === 'art' ? 'primary' : 'secondary'}
              onClick={() => handleCategoryChange('art')}
              style={{ padding: '8px 16px' }}
            >
              Art
            </button>
            <button
              className={category === 'crafts' ? 'primary' : 'secondary'}
              onClick={() => handleCategoryChange('crafts')}
              style={{ padding: '8px 16px' }}
            >
              Crafts
            </button>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="sort" style={{ fontWeight: '500', color: '#495057' }}>Sort by:</label>
            <select
              id="sort"
              className="form-input"
              onChange={handleSortChange}
              style={{ minWidth: '180px' }}
            >
              <option value="newest">Newest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Price Range Filter */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '40px',
          alignItems: 'center',
          padding: '15px 20px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <label style={{ fontWeight: '500', color: '#495057' }}>Price Range:</label>
          <input
            type="number"
            placeholder="Min"
            className="form-input"
            value={priceRange.min}
            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
            style={{ width: '120px' }}
          />
          <span style={{ color: '#7f8c8d' }}>to</span>
          <input
            type="number"
            placeholder="Max"
            className="form-input"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
            style={{ width: '120px' }}
          />
          <button onClick={handlePriceFilter} className="primary" style={{ padding: '8px 20px' }}>
            Apply
          </button>
          {(priceRange.min || priceRange.max) && (
            <button
              onClick={() => {
                setPriceRange({ min: '', max: '' });
                fetchProducts();
              }}
              className="secondary"
              style={{ padding: '8px 16px' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results Count */}
        {!loading && (
          <div style={{ marginBottom: '20px', color: '#7f8c8d', fontSize: '14px' }}>
            Showing {products.length} of {pagination.total} products
          </div>
        )}

        {/* Loading State */}
        {loading && pagination.offset === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7f8c8d' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '20px' }}>Loading products...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-alert" style={{ marginBottom: '40px' }}>
            {error}
          </div>
        )}

        {/* Products Grid */}
        {!loading && products.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '30px',
            marginBottom: '40px'
          }}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} formatPrice={formatPrice} />
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && products.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h3 style={{ color: '#7f8c8d', marginBottom: '16px' }}>No products found</h3>
            <p style={{ color: '#95a5a6' }}>Try adjusting your filters or check back later for new items.</p>
          </div>
        )}

        {/* Load More Button */}
        {!loading && pagination.hasMore && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button onClick={loadMore} className="primary" style={{ padding: '12px 40px' }}>
              Load More
            </button>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}

// Product Card Component
function ProductCard({ product, formatPrice }) {
  // Process image URL the same way as product detail page
  let primaryImage = null;
  if (product.images && product.images.length > 0) {
    const imageUrl = typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url;
    
    // If it's already a full URL, use as-is
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      primaryImage = imageUrl;
    }
    // If it's a temp_images path, use API base URL directly
    else if (imageUrl && imageUrl.startsWith('/temp_images/')) {
      primaryImage = `${getApiUrl()}${imageUrl}`;
    }
    // Otherwise, use smart media proxy
    else if (imageUrl) {
      primaryImage = getSmartMediaUrl(imageUrl);
    }
  }
  
  const vendor = product.vendor || {};
  const artistName = vendor.business_name || vendor.display_name || `${vendor.first_name || ''} ${vendor.last_name || ''}`.trim() || 'Artist';

  return (
    <Link href={`/products/${product.id}`} style={{ textDecoration: 'none' }}>
      <div className="product-card" style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Product Image */}
        <div style={{
          position: 'relative',
          width: '100%',
          paddingTop: '100%',
          backgroundColor: '#f8f9fa',
          overflow: 'hidden'
        }}>
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease'
              }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#95a5a6',
              fontSize: '14px'
            }}>
              No image available
            </div>
          )}
        </div>

        {/* Product Info */}
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '8px',
            lineHeight: '1.4',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {product.name}
          </h3>

          <p style={{
            fontSize: '14px',
            color: '#7f8c8d',
            marginBottom: '12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            by {artistName}
          </p>

          <div style={{ marginTop: 'auto' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#27ae60'
            }}>
              {formatPrice(product.price)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

