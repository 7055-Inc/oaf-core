import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
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
      fetch(`categories/content/${id}`).then(res => res.json()),
      fetch(`categories/seo/${id}`).then(res => res.json()),
      // Use curated art marketplace API with category filter and images
      fetch(`curated/art/products/all?category_id=${id}&include=images`).then(res => res.json())
    ])
      .then(([catData, contentData, seoData, prodData]) => {
        setCategory(catData.category || null);
        setCategoryContent(contentData.content || null);
        setCategorySEO(seoData.seo || null);
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

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
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
              <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem', fontWeight: 'bold' }}>{category.name}</h1>
              {categoryContent?.description && (
                <p style={{ fontSize: '1.2rem', margin: 0, maxWidth: '600px' }}>{categoryContent.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Category Info (if no hero image) */}
        {!categoryContent?.hero_image && (
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>{category.name}</h1>
            {(categoryContent?.description || category.description) && (
              <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '1rem' }}>
                {categoryContent?.description || category.description}
              </p>
            )}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* TODO: Fetch and display featured products by IDs */}
              <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: '#666' }}>Featured products coming soon...</p>
              </div>
            </div>
          </div>
        )}

        {/* Featured Artists Section */}
        {categoryContent?.featured_artists && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>Featured Artists</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* TODO: Fetch and display featured artists by IDs */}
              <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: '#666' }}>Featured artists coming soon...</p>
              </div>
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
                    backgroundImage: `url(${product.images[0]})`,
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
      </div>
    </>
  );
} 