import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import WholesalePricing from '../../components/WholesalePricing';
import { isWholesaleCustomer } from '../../lib/userUtils';
import { getAuthToken } from '../../lib/csrf';
import { getApiUrl, getFrontendUrl, getSmartMediaUrl } from '../../lib/config';

export default function CategoryLandingPage() {
  const router = useRouter();
  const { id } = router.query;
  const [category, setCategory] = useState(null);
  const [categoryContent, setCategoryContent] = useState(null);
  const [categorySEO, setCategorySEO] = useState(null);
  const [childCategories, setChildCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [featuredArtists, setFeaturedArtists] = useState([]);
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
      fetch(getApiUrl(`api/curated/art/products/all?category_id=${id}&include=images`)).then(res => res.json())
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
        
        // Fetch featured artists if set
        if (contentData.content?.featured_artists) {
          fetchFeaturedArtists(contentData.content.featured_artists);
        }
      })
      .catch(err => {
        console.error('Error loading category data:', err);
        setError('Failed to load category or products');
        setLoading(false);
      });
  }, [id]);

  // Fetch featured artist profiles
  const fetchFeaturedArtists = async (featuredArtistsData) => {
    try {
      // Parse the featured_artists data - could be JSON array or comma-separated string
      let artistIds = [];
      
      if (typeof featuredArtistsData === 'string') {
        // Try parsing as JSON first
        try {
          const parsed = JSON.parse(featuredArtistsData);
          artistIds = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // If not JSON, try comma-separated
          artistIds = featuredArtistsData.split(',').map(id => id.trim()).filter(id => id);
        }
      } else if (Array.isArray(featuredArtistsData)) {
        artistIds = featuredArtistsData;
      }
      
      if (artistIds.length === 0) return;
      
      // Fetch each artist's profile
      const artistPromises = artistIds.map(async (artistId) => {
        try {
          const response = await fetch(getApiUrl(`users/profile/by-id/${artistId}`));
          if (response.ok) {
            return await response.json();
          }
          return null;
        } catch {
          return null;
        }
      });
      
      const artists = await Promise.all(artistPromises);
      setFeaturedArtists(artists.filter(a => a !== null));
    } catch (err) {
      console.error('Error fetching featured artists:', err);
    }
  };

  if (loading) return (
    <>
      <Head>
        <title>Loading Category | Brakebee</title>
        {id && <link rel="canonical" href={getFrontendUrl(`/category/${id}`)} />}
      </Head>
      <div style={{ padding: '2rem' }}>Loading...</div>
    </>
  );
  if (error) return (
    <>
      <Head>
        <title>Category Error | Brakebee</title>
        {id && <link rel="canonical" href={getFrontendUrl(`/category/${id}`)} />}
      </Head>
      <div style={{ padding: '2rem', color: 'red' }}>{error}</div>
    </>
  );
  if (!category) return (
    <>
      <Head>
        <title>Category Not Found | Brakebee</title>
        {id && <link rel="canonical" href={getFrontendUrl(`/category/${id}`)} />}
      </Head>
      <div style={{ padding: '2rem' }}>Category not found.</div>
    </>
  );

  // Helper function to get full image URL (handles both static media and external URLs)
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // If it's a temp_images path, use API base URL directly
    if (imagePath.startsWith('/temp_images/')) {
      return `${getApiUrl()}${imagePath}`;
    }
    // If it's a static media path, return as is (Next.js will serve from public)
    if (imagePath.startsWith('/static_media/')) {
      return imagePath;
    }
    // Otherwise, use smart media proxy
    return getSmartMediaUrl(imagePath);
  };

  // SEO meta tags
  const metaTitle = categorySEO?.meta_title || `${category.name} | Shop Art on Brakebee`;
  const metaDescription = categorySEO?.meta_description || categoryContent?.description || category.description || `Discover unique ${category.name} artwork from independent artists on Brakebee. Shop original art, connect with creators.`;
  const metaKeywords = categorySEO?.meta_keywords || `${category.name}, art, artwork, brakebee, independent artists, original art`;
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
        
        {/* JSON-LD Structured Data - Auto-generated (Google compliant) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": category.name,
              "description": metaDescription,
              "url": canonicalUrl,
              ...(categoryContent?.hero_image && {
                "image": getImageUrl(categoryContent.hero_image)
              }),
              "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": products.length,
                "itemListElement": products.slice(0, 20).map((product, index) => ({
                  "@type": "ListItem",
                  "position": index + 1,
                  "item": {
                    "@type": "Product",
                    "name": product.name,
                    "description": product.description ? product.description.slice(0, 200) : product.short_description || `${product.name} - available on our marketplace`,
                    "url": getFrontendUrl(`/products/${product.id}`),
                    ...(product.sku && { "sku": product.sku }),
                    ...(product.images && product.images.length > 0 && {
                      "image": getImageUrl(typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)
                    }),
                    ...(product.price && {
                      "offers": {
                        "@type": "Offer",
                        "price": product.price,
                        "priceCurrency": "USD",
                        "availability": product.status === 'active' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                        "url": getFrontendUrl(`/products/${product.id}`)
                      }
                    })
                  }
                }))
              },
              "breadcrumb": {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": getFrontendUrl('/') },
                  { "@type": "ListItem", "position": 2, "name": "Marketplace", "item": getFrontendUrl('/marketplace') },
                  ...(category.parent_name ? [{ "@type": "ListItem", "position": 3, "name": category.parent_name, "item": getFrontendUrl(`/category/${category.parent_id}`) }] : []),
                  { "@type": "ListItem", "position": category.parent_name ? 4 : 3, "name": category.name, "item": canonicalUrl }
                ]
              }
            })
          }}
        />
      </Head>

      {/* SEO Breadcrumb */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem 2rem 0' }}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Marketplace', href: '/marketplace' },
          ...(category.parent_name ? [{ label: category.parent_name, href: `/category/${category.parent_id}` }] : []),
          { label: category.name }
        ]} />
      </div>

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
            marginBottom: '2rem'
          }} />
        )}


        {/* Banner Section */}
        {categoryContent?.banner && (
          <div style={{ 
            backgroundImage: `url(${getImageUrl(categoryContent.banner)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '150px',
            borderRadius: '8px',
            marginBottom: '2rem'
          }} />
        )}

        {/* Featured Artists Section */}
        {featuredArtists.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              fontSize: '1.3rem', 
              margin: '0 0 1.25rem 0',
              color: '#333',
              fontWeight: '600'
            }}>
              Featured Artists in {category.name}
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '1.25rem' 
            }}>
              {featuredArtists.map(artist => {
                const displayName = artist.business_name || artist.display_name || 
                  (artist.first_name && artist.last_name ? `${artist.first_name} ${artist.last_name}` : artist.username) || 'Artist';
                const location = artist.studio_city && artist.studio_state 
                  ? `${artist.studio_city}, ${artist.studio_state}` 
                  : artist.studio_city || artist.studio_state || null;
                const profileImage = artist.profile_picture_url || artist.profile_image_path;
                const imageUrl = profileImage 
                  ? (profileImage.startsWith('http') ? profileImage : getSmartMediaUrl(profileImage))
                  : null;
                
                return (
                  <Link 
                    href={`/profile/${artist.id || artist.user_id}`} 
                    key={artist.id || artist.user_id}
                    style={{
                      display: 'flex',
                      background: 'white',
                      border: '2px solid var(--primary-color)',
                      borderRadius: '0',
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      height: '140px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Artist Image */}
                    <div style={{
                      width: '120px',
                      minWidth: '120px',
                      height: '100%',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={displayName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f0f0f0',
                          color: '#999'
                        }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Artist Info */}
                    <div style={{
                      flex: 1,
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden'
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: 'var(--primary-color)',
                          margin: '0 0 0.25rem 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {displayName}
                        </h3>
                        {location && (
                          <p style={{
                            fontSize: '0.8rem',
                            color: '#055474',
                            margin: '0 0 0.5rem 0',
                            fontWeight: '500'
                          }}>
                            {location}
                          </p>
                        )}
                        {artist.artist_biography && (
                          <p style={{
                            fontSize: '0.75rem',
                            color: '#666',
                            margin: 0,
                            lineHeight: '1.4',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {artist.artist_biography}
                          </p>
                        )}
                      </div>
                      <span style={{
                        fontSize: '0.8rem',
                        color: 'var(--primary-color)',
                        fontWeight: '500'
                      }}>
                        View Profile →
                      </span>
                    </div>
                  </Link>
                );
              })}
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
                    backgroundImage: `url(${getImageUrl(typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)})`,
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