import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import WholesalePricing from '../../components/WholesalePricing';
import { isWholesaleCustomer } from '../../lib/userUtils';
import { getAuthToken } from '../../lib/csrf';
import { getApiUrl, getFrontendUrl } from '../../lib/config';

export default function CategoryLandingPage() {
  const router = useRouter();
  const { id } = router.query;
  const [category, setCategory] = useState(null);
  const [categoryContent, setCategoryContent] = useState(null);
  const [categorySEO, setCategorySEO] = useState(null);
  const [childCategories, setChildCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);

  // Get user data for wholesale pricing
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserData(payload);
      } catch (error) {
        console.error('Error parsing user token:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(getApiUrl(`categories/${id}`)).then(res => res.json()),
      fetch(getApiUrl(`categories/content/${id}`)).then(res => res.json()),
      fetch(getApiUrl(`categories/seo/${id}`)).then(res => res.json()),
      fetch(getApiUrl(`categories`)).then(res => res.json()), // Get all categories to find children
      // Use curated art marketplace API with category filter and images
      fetch(getApiUrl(`curated/art/products/all?category_id=${id}&include=images`)).then(res => res.json())
    ])
      .then(([catData, contentData, seoData, allCatData, prodData]) => {
        setCategory(catData.category || null);
        setCategoryContent(contentData.content || null);
        setCategorySEO(seoData.seo || null);
        
        // Filter child categories
        const children = allCatData.flat_categories?.filter(cat => cat.parent_id === parseInt(id)) || [];
        setChildCategories(children);
        
        setProducts(prodData.products || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading category data:', err);
        setError('Failed to load category or products');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!category) return <div style={{ padding: '2rem' }}>Category not found.</div>;

  // Helper function to get full image URL (handles both static media and external URLs)
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // If it's a static media path, return as is (Next.js will serve from public)
    if (imagePath.startsWith('/static_media/')) {
      return imagePath;
    }
    // Otherwise, assume it's a relative path and prepend the base URL
    return getFrontendUrl(imagePath);
  };

  // SEO meta tags
  const metaTitle = categorySEO?.meta_title || `${category.name} - Online Art Festival`;
  const metaDescription = categorySEO?.meta_description || categoryContent?.description || category.description || `Explore ${category.name} artwork and products on Online Art Festival`;
  const metaKeywords = categorySEO?.meta_keywords || `${category.name}, art, artwork, online art festival`;
  const canonicalUrl = categorySEO?.canonical_url || getFrontendUrl(`/category/${id}`);

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={metaKeywords} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        {categoryContent?.hero_image && (
          <meta property="og:image" content={getImageUrl(categoryContent.hero_image)} />
        )}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {categoryContent?.hero_image && (
          <meta name="twitter:image" content={getImageUrl(categoryContent.hero_image)} />
        )}
        
        {/* JSON-LD Structured Data */}
        {categorySEO?.json_ld && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: categorySEO.json_ld }}
          />
        )}
      </Head>

      <Header />

        {/* Grey header section that bleeds to top */}
        <div style={{ 
          backgroundColor: '#cccccc', 
          color: 'white',
          paddingTop: '6rem', // Space for fixed header
          paddingBottom: '1rem',
          marginBottom: '0'
        }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
          <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold' }}>{category.name}</h1>
        </div>
      </div>

      {/* Child Categories Menu */}
      {childCategories.length > 0 && (
        <div style={{ 
          backgroundColor: 'var(--primary-color)', 
          padding: '1rem 0',
          marginBottom: '2rem'
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {childCategories.map((child, index) => (
                <span key={child.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a
                    onClick={() => router.push(`/category/${child.id}`)}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: '500',
                      fontSize: '1rem',
                      color: 'white',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease',
                      padding: '0.5rem 0'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#cccccc';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'white';
                    }}
                  >
                    {child.name}
                  </a>
                  {index < childCategories.length - 1 && (
                    <span style={{ color: 'white', fontSize: '1rem' }}>|</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
        {/* Description Box */}
        {(categoryContent?.description || category.description) && (
          <div className="section-box" style={{ marginBottom: '2rem' }}>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '1rem' }}>
              {categoryContent?.description || category.description}
            </p>
          </div>
        )}

        {/* Category Hero Section */}
        {categoryContent?.hero_image && (
          <div style={{ 
            backgroundImage: `url(${getImageUrl(categoryContent.hero_image)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '300px',
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              color: 'white',
              padding: '2rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '1.2rem', margin: 0, maxWidth: '600px' }}>Featured Category Image</p>
            </div>
          </div>
        )}


        {/* Banner Section */}
        {categoryContent?.banner && (
          <div style={{ 
            backgroundImage: `url(${getImageUrl(categoryContent.banner)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '150px',
            borderRadius: '8px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '6px',
              fontSize: '1.1rem',
              fontWeight: '500'
            }}>
              Discover Amazing {category.name} Artwork
            </div>
          </div>
        )}

        {/* Featured Products Section */}
        {categoryContent?.featured_products && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>Featured Products</h2>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
              <p style={{ color: '#856404', marginBottom: '0.5rem' }}>
                <strong>Featured Products Data:</strong> {categoryContent.featured_products}
              </p>
              <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                (This will be parsed and displayed as actual product cards)
              </p>
            </div>
          </div>
        )}

        {/* Featured Artists Section */}
        {categoryContent?.featured_artists && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>Featured Artists</h2>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                <strong>Featured Artists Data:</strong> {categoryContent.featured_artists}
              </p>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>
                (This will be parsed and displayed as actual artist profiles)
              </p>
            </div>
          </div>
        )}

        {/* SEO Information Section */}
        {categorySEO && (
          <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #e0e8f0' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0066cc' }}>SEO Information</h2>
            
            {categorySEO.meta_title && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Meta Title:</strong> {categorySEO.meta_title}
              </div>
            )}
            
            {categorySEO.meta_description && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Meta Description:</strong> {categorySEO.meta_description}
              </div>
            )}
            
            {categorySEO.meta_keywords && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Meta Keywords:</strong> {categorySEO.meta_keywords}
              </div>
            )}
            
            {categorySEO.canonical_url && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Canonical URL:</strong> 
                <a href={categorySEO.canonical_url} style={{ color: '#0066cc', marginLeft: '0.5rem' }}>
                  {categorySEO.canonical_url}
                </a>
              </div>
            )}
            
            {categorySEO.json_ld && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Structured Data:</strong> JSON-LD present
                <details style={{ marginTop: '0.5rem' }}>
                  <summary style={{ cursor: 'pointer', color: '#0066cc' }}>View JSON-LD</summary>
                  <pre style={{ background: 'white', padding: '1rem', borderRadius: '4px', fontSize: '0.8rem', overflow: 'auto', marginTop: '0.5rem' }}>
                    {categorySEO.json_ld}
                  </pre>
                </details>
              </div>
            )}
            
            <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
              {categorySEO.created_at && (
                <span style={{ marginRight: '1rem' }}>
                  <strong>SEO Created:</strong> {new Date(categorySEO.created_at).toLocaleDateString()}
                </span>
              )}
              {categorySEO.updated_at && (
                <span style={{ marginRight: '1rem' }}>
                  <strong>SEO Updated:</strong> {new Date(categorySEO.updated_at).toLocaleDateString()}
                </span>
              )}
              {categorySEO.updated_by && (
                <span>
                  <strong>Updated By User ID:</strong> {categorySEO.updated_by}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <h2 style={{ fontSize: '1.3rem', margin: '2rem 0 1rem' }}>Products in {category.name}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {products.length === 0 ? (
            <div style={{ gridColumn: '1/-1', color: '#888', textAlign: 'center', padding: '2rem' }}>
              No products found in this category.
            </div>
          ) : (
            products.map(product => (
              <div key={product.id} style={{ 
                border: '1px solid #eee', 
                borderRadius: 8, 
                overflow: 'hidden',
                background: '#fff',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => router.push(`/products/${product.id}`)}
              >
                {/* Product Image */}
                {product.images && product.images.length > 0 ? (
                  <div style={{ 
                    height: '200px', 
                    backgroundImage: `url(${typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} />
                ) : (
                  <div style={{ 
                    height: '200px', 
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    No image available
                  </div>
                )}
                
                {/* Product Info */}
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: '#333' }}>{product.name}</h3>
                  <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    {product.description?.slice(0, 100)}...
                  </p>
                  {product.price && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <WholesalePricing
                        price={product.price}
                        wholesalePrice={product.wholesale_price}
                        isWholesaleCustomer={isWholesaleCustomer(userData)}
                        size="medium"
                        layout="inline"
                      />
                    </div>
                  )}
                  <span style={{ color: '#055474', textDecoration: 'underline', fontWeight: 500, fontSize: '0.9rem' }}>
                    View Product →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Category Data Summary */}
        <div style={{ marginTop: '3rem', padding: '2rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#495057' }}>Category Data Summary</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Basic Category Info */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '6px' }}>
              <h3 style={{ color: '#007bff', marginBottom: '1rem' }}>Basic Information</h3>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div><strong>ID:</strong> {category?.id}</div>
                <div><strong>Name:</strong> {category?.name}</div>
                <div><strong>Parent ID:</strong> {category?.parent_id || 'None (Root Category)'}</div>
                <div><strong>Description:</strong> {category?.description || 'No description'}</div>
              </div>
            </div>

            {/* Content Info */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '6px' }}>
              <h3 style={{ color: '#28a745', marginBottom: '1rem' }}>Content Data</h3>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div><strong>Content ID:</strong> {categoryContent?.id || 'No content record'}</div>
                <div><strong>Hero Image:</strong> {categoryContent?.hero_image || 'None'}</div>
                <div><strong>Banner:</strong> {categoryContent?.banner || 'None'}</div>
                <div><strong>Featured Products:</strong> {categoryContent?.featured_products || 'None'}</div>
                <div><strong>Featured Artists:</strong> {categoryContent?.featured_artists || 'None'}</div>
                <div><strong>Content Description:</strong> {categoryContent?.description || 'None'}</div>
              </div>
            </div>

            {/* SEO Info */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '6px' }}>
              <h3 style={{ color: '#ffc107', marginBottom: '1rem' }}>SEO Data</h3>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div><strong>SEO ID:</strong> {categorySEO?.id || 'No SEO record'}</div>
                <div><strong>Meta Title:</strong> {categorySEO?.meta_title || 'None'}</div>
                <div><strong>Meta Description:</strong> {categorySEO?.meta_description ? 'Present' : 'None'}</div>
                <div><strong>Meta Keywords:</strong> {categorySEO?.meta_keywords || 'None'}</div>
                <div><strong>Canonical URL:</strong> {categorySEO?.canonical_url || 'None'}</div>
                <div><strong>JSON-LD:</strong> {categorySEO?.json_ld ? 'Present' : 'None'}</div>
              </div>
            </div>

            {/* Products Info */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '6px' }}>
              <h3 style={{ color: '#dc3545', marginBottom: '1rem' }}>Products Data</h3>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div><strong>Total Products:</strong> {products?.length || 0}</div>
                <div><strong>Products Loaded:</strong> {products?.length > 0 ? 'Yes' : 'No'}</div>
                {products?.length > 0 && (
                  <>
                    <div><strong>First Product:</strong> {products[0]?.name || 'Unnamed'}</div>
                    <div><strong>Price Range:</strong> {products[0]?.price ? `$${products[0].price}` : 'No price'}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '6px' }}>
            <h3 style={{ color: '#6c757d', marginBottom: '1rem' }}>Timestamps & Updates</h3>
            <div style={{ fontSize: '0.9rem', color: '#6c757d', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {categoryContent?.created_at && (
                <span><strong>Content Created:</strong> {new Date(categoryContent.created_at).toLocaleString()}</span>
              )}
              {categoryContent?.updated_at && (
                <span><strong>Content Updated:</strong> {new Date(categoryContent.updated_at).toLocaleString()}</span>
              )}
              {categoryContent?.updated_by && (
                <span><strong>Updated By User:</strong> {categoryContent.updated_by}</span>
              )}
              {categorySEO?.created_at && (
                <span><strong>SEO Created:</strong> {new Date(categorySEO.created_at).toLocaleString()}</span>
              )}
              {categorySEO?.updated_at && (
                <span><strong>SEO Updated:</strong> {new Date(categorySEO.updated_at).toLocaleString()}</span>
              )}
              {categorySEO?.updated_by && (
                <span><strong>SEO Updated By:</strong> {categorySEO.updated_by}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
} 