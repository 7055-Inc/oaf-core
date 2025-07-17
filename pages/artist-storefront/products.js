import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from './ArtistStorefront.module.css';

const ArtistProducts = () => {
  const router = useRouter();
  const { subdomain, userId, siteName } = router.query;
  
  const [siteData, setSiteData] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  
  const productsPerPage = 12;

  useEffect(() => {
    if (subdomain) {
      fetchProductsData();
    }
  }, [subdomain, selectedCategory, currentPage, sortBy]);

  const fetchProductsData = async () => {
    try {
      setLoading(true);
      
      const offset = (currentPage - 1) * productsPerPage;
      let productsUrl = `https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}/products?limit=${productsPerPage}&offset=${offset}`;
      
      if (selectedCategory) {
        productsUrl += `&category=${selectedCategory}`;
      }
      
      // Add sorting
      if (sortBy === 'price_low') {
        productsUrl += '&sort=price_asc';
      } else if (sortBy === 'price_high') {
        productsUrl += '&sort=price_desc';
      } else if (sortBy === 'name') {
        productsUrl += '&sort=name_asc';
      }
      
      // Fetch data in parallel
      const fetchPromises = [
        fetch(productsUrl),
        fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}/categories`)
      ];
      
      // Only fetch site data on first load
      if (!siteData) {
        fetchPromises.push(fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}`));
      }
      
      const responses = await Promise.all(fetchPromises);
      
      if (responses[0].ok) {
        const productsData = await responses[0].json();
        setProducts(productsData);
        // In a real implementation, you'd get total count from API
        setTotalProducts(productsData.length >= productsPerPage ? (currentPage * productsPerPage) + 1 : (currentPage - 1) * productsPerPage + productsData.length);
      }

      if (responses[1].ok) {
        const categoriesData = await responses[1].json();
        setCategories(categoriesData);
      }

      if (responses[2] && responses[2].ok) {
        const siteData = await responses[2].json();
        setSiteData(siteData);
      }

    } catch (err) {
      setError('Failed to load products');
      console.error('Error fetching products data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId) => {
    try {
      // Find the product details
      const product = products.find(p => p.id === productId);
      if (!product) {
        alert('Product not found');
        return;
      }

      // Get authentication token (if user is logged in)
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      
      // Generate guest token if no auth token
      let guestToken = null;
      if (!token) {
        guestToken = localStorage.getItem('guestToken');
        if (!guestToken) {
          guestToken = 'guest_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
          localStorage.setItem('guestToken', guestToken);
        }
      }

      // Prepare API request
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = {
        product_id: product.id,
        vendor_id: product.vendor_id || siteData.user_id,
        quantity: 1,
        price: product.price,
        source_site_api_key: subdomain, // Use subdomain as site identifier
        source_site_name: siteData.site_name || `${siteData.first_name} ${siteData.last_name}`,
        ...(guestToken && { guest_token: guestToken })
      };

      // Add to cart via enhanced API
      const response = await fetch('https://api2.onlineartfestival.com/cart/add', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-weight: 500;
        `;
        notification.textContent = `Added "${product.name}" to cart! 🛒`;
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          notification.remove();
        }, 3000);

        // Cart updated
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to cart');
      }
      
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart: ' + err.message);
    }
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to first page
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(1); // Reset to first page
  };

  const totalPages = Math.ceil(totalProducts / productsPerPage);

  if (loading && !siteData) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading gallery...</p>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className={styles.error}>
        <h1>Gallery Not Found</h1>
        <p>Sorry, this gallery is not available.</p>
        <Link href={`https://${subdomain}.onlineartfestival.com`}>
          <a className={styles.homeLink}>← Back to Home</a>
        </Link>
      </div>
    );
  }

  const pageTitle = `${siteData.first_name} ${siteData.last_name} - Gallery`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={`Browse the complete art gallery of ${siteData.first_name} ${siteData.last_name}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.storefront}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.artistInfo}>
              {siteData.profile_image_path && (
                <img 
                  src={`https://api2.onlineartfestival.com${siteData.profile_image_path}`}
                  alt={`${siteData.first_name} ${siteData.last_name}`}
                  className={styles.artistAvatar}
                />
              )}
              <div className={styles.artistDetails}>
                <Link href={`https://${subdomain}.onlineartfestival.com`}>
                  <a className={styles.artistName}>
                    {siteData.first_name} {siteData.last_name}
                  </a>
                </Link>
                <p className={styles.artistTitle}>Artist</p>
              </div>
            </div>

            <nav className={styles.navigation}>
              <Link href={`https://${subdomain}.onlineartfestival.com`}>
                <a className={styles.navLink}>Home</a>
              </Link>
              <Link href={`https://${subdomain}.onlineartfestival.com/products`}>
                <a className={`${styles.navLink} ${styles.active}`}>Gallery</a>
              </Link>
              <Link href={`https://${subdomain}.onlineartfestival.com/about`}>
                <a className={styles.navLink}>About</a>
              </Link>
              <Link href="https://main.onlineartfestival.com">
                <a className={styles.navLink}>Main Site</a>
              </Link>
            </nav>
          </div>
        </header>

        {/* Products Page Content */}
        <main className={styles.productsMain}>
          <div className={styles.container}>
            
            {/* Page Header */}
            <section className={styles.pageHeader}>
              <h1>Complete Gallery</h1>
              <p>Discover all artworks by {siteData.first_name} {siteData.last_name}</p>
            </section>

            {/* Filters and Controls */}
            <section className={styles.filtersSection}>
              <div className={styles.filtersContent}>
                
                {/* Category Filters */}
                <div className={styles.categoryFilters}>
                  <h3>Categories</h3>
                  <div className={styles.filterButtons}>
                    <button 
                      className={`${styles.filterButton} ${!selectedCategory ? styles.active : ''}`}
                      onClick={() => handleCategoryFilter(null)}
                    >
                      All ({totalProducts})
                    </button>
                    {categories.map(category => (
                      <button 
                        key={category.id}
                        className={`${styles.filterButton} ${selectedCategory === category.id ? styles.active : ''}`}
                        onClick={() => handleCategoryFilter(category.id)}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Controls */}
                <div className={styles.sortControls}>
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
            </section>

            {/* Products Grid */}
            <section className={styles.productsSection}>
              {loading ? (
                <div className={styles.loadingProducts}>
                  <div className={styles.spinner}></div>
                  <p>Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className={styles.emptyProducts}>
                  <h3>No products found</h3>
                  <p>
                    {selectedCategory 
                      ? 'No products in this category. Try viewing all products.'
                      : 'No artworks available at the moment.'}
                  </p>
                  {selectedCategory && (
                    <button 
                      className={styles.clearFilterBtn}
                      onClick={() => handleCategoryFilter(null)}
                    >
                      View All Products
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.resultsInfo}>
                    <p>
                      Showing {products.length} of {totalProducts} artworks
                      {selectedCategory && (
                        <span> in {categories.find(c => c.id === selectedCategory)?.name}</span>
                      )}
                    </p>
                  </div>

                  <div className={styles.productsGrid}>
                    {products.map(product => (
                      <div key={product.id} className={styles.productCard}>
                        <div className={styles.productImage}>
                          {product.image_path ? (
                            <img 
                              src={`https://api2.onlineartfestival.com${product.image_path}`}
                              alt={product.alt_text || product.name}
                            />
                          ) : (
                            <div className={styles.placeholderImage}>
                              <span>No Image</span>
                            </div>
                          )}
                        </div>
                        
                        <div className={styles.productInfo}>
                          <h3 className={styles.productName}>{product.name}</h3>
                          <p className={styles.productPrice}>${product.price}</p>
                          
                          {product.description && (
                            <p className={styles.productDescription}>
                              {product.description.substring(0, 100)}
                              {product.description.length > 100 && '...'}
                            </p>
                          )}
                          
                          <div className={styles.productActions}>
                            <button 
                              className={styles.addToCartBtn}
                              onClick={() => addToCart(product.id)}
                            >
                              Add to Cart
                            </button>
                            <Link href={`https://${subdomain}.onlineartfestival.com/product/${product.id}`}>
                              <a className={styles.viewProductBtn}>View Details</a>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button 
                        className={styles.pageButton}
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        ← Previous
                      </button>
                      
                      <div className={styles.pageNumbers}>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              className={`${styles.pageNumber} ${currentPage === pageNum ? styles.active : ''}`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button 
                        className={styles.pageButton}
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

          </div>
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.container}>
            <div className={styles.footerContent}>
              <div className={styles.footerSection}>
                <h4>{siteData.first_name} {siteData.last_name}</h4>
                <p>Artist Gallery</p>
              </div>
              
              <div className={styles.footerSection}>
                <h4>Platform</h4>
                <p>
                  <Link href="https://main.onlineartfestival.com">
                    <a>Online Art Festival</a>
                  </Link>
                </p>
                <p className={styles.poweredBy}>Powered by OAF</p>
              </div>
            </div>
            
            <div className={styles.footerBottom}>
              <p>&copy; 2025 {siteData.first_name} {siteData.last_name}. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ArtistProducts; 