'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../../components/Header';
import Breadcrumb from '../../../components/Breadcrumb';
import { getApiUrl, getSmartMediaUrl } from '../../../lib/config';
import styles from './ArtistProducts.module.css';

export default function ArtistProductsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [artist, setArtist] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 24;

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch artist info and products in parallel
        const [artistRes, productsRes] = await Promise.all([
          fetch(getApiUrl(`users/profile/by-id/${id}`)),
          fetch(getApiUrl(`products/all?vendor_id=${id}&include=images`))
        ]);
        
        if (artistRes.ok) {
          const artistData = await artistRes.json();
          setArtist(artistData);
        }
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const productsArray = productsData.products || productsData || [];
          
          // Filter to only active products, no drafts, no child variants
          const filteredProducts = productsArray.filter(product => 
            product.status === 'active' &&
            product.name && 
            product.name.toLowerCase() !== 'new product draft' &&
            !product.parent_id
          );
          
          setProducts(filteredProducts);
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const getImageUrl = (product) => {
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      const imageUrl = typeof img === 'string' ? img : img.url;
      
      if (imageUrl) {
        if (imageUrl.startsWith('http')) return imageUrl;
        if (imageUrl.startsWith('/temp_images/')) {
          return getApiUrl(imageUrl.substring(1));
        }
        return getSmartMediaUrl(imageUrl);
      }
    }
    return null;
  };

  // Get artist avatar - prefer logo, then profile image
  const getArtistAvatar = () => {
    const imagePath = artist?.logo_path || artist?.profile_image_path;
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) return imagePath;
    return getSmartMediaUrl(imagePath);
  };

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return parseFloat(a.price) - parseFloat(b.price);
      case 'price_high':
        return parseFloat(b.price) - parseFloat(a.price);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'newest':
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  const artistName = artist?.business_name || artist?.display_name || 
    (artist?.first_name && artist?.last_name ? `${artist.first_name} ${artist.last_name}` : 'Artist');

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + productsPerPage);

  // Reset to page 1 when sort changes
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading products...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !artist) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.error}>
            <i className="fas fa-exclamation-triangle"></i>
            <h2>Artist Not Found</h2>
            <p>Sorry, we couldn't find this artist's products.</p>
            <Link href="/marketplace" className={styles.backLink}>
              Browse Marketplace
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{artistName} - All Products | Brakebee</title>
        <meta name="description" content={`Browse all products by ${artistName} on Brakebee`} />
      </Head>
      
      <Header />
      
      <div className={styles.container}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Artists', href: '/artists' },
          { label: artistName, href: `/profile/${id}` },
          { label: 'Products' }
        ]} />

        {/* Artist Header */}
        <div className={styles.artistHeader}>
          {getArtistAvatar() ? (
            <img 
              src={getArtistAvatar()}
              alt={artistName}
              className={styles.artistImage}
            />
          ) : (
            <div className={styles.artistImagePlaceholder}>
              <i className="fas fa-store"></i>
            </div>
          )}
          <div className={styles.artistInfo}>
            <h1>{artistName}</h1>
            <p className={styles.productCount}>{products.length} Product{products.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className={styles.controls}>
          <div className={styles.sortWrapper}>
            <label htmlFor="sort">Sort by:</label>
            <select 
              id="sort" 
              value={sortBy} 
              onChange={(e) => handleSortChange(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {sortedProducts.length === 0 ? (
          <div className={styles.empty}>
            <i className="fas fa-box-open"></i>
            <h3>No Products Available</h3>
            <p>This artist hasn't listed any products yet.</p>
          </div>
        ) : (
          <>
            <div className={styles.productsGrid}>
              {paginatedProducts.map(product => {
                const imageUrl = getImageUrl(product);
                const isOutOfStock = product.inventory && product.inventory.stock_quantity <= 0;
                
                return (
                  <Link 
                    key={product.id} 
                    href={`/products/${product.id}`}
                    className={styles.productCard}
                  >
                    <div className={styles.imageWrapper}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.name} className={styles.productImage} />
                      ) : (
                        <div className={styles.noImage}>
                          <i className="fas fa-image"></i>
                        </div>
                      )}
                      {isOutOfStock && (
                        <span className={styles.outOfStock}>Out of Stock</span>
                      )}
                    </div>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productPrice}>${parseFloat(product.price).toFixed(2)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button 
                  className={styles.pageButton}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                
                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first, last, current, and adjacent pages
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <span key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className={styles.ellipsis}>...</span>
                        )}
                        <button
                          className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </span>
                    ))}
                </div>
                
                <button 
                  className={styles.pageButton}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

