import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Breadcrumb } from '../../modules/shared';
import { getApiUrl, getSmartMediaUrl } from '../../lib/config';
import { getCurrentUser } from '../../lib/users/api';
import { ProfileDisplay } from '../../modules/shared';
import styles from './Profile.module.css';

export default function ProfileView({ initialProfile, initialProducts = [], initialError }) {
  const [userProfile, setUserProfile] = useState(initialProfile);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [error, setError] = useState(initialError || null);
  const router = useRouter();
  const { id } = router.query;

  // Client-side only: check if current user is viewing their own profile
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const data = await getCurrentUser();
        setCurrentUserId(data.id);
      } catch (err) {
        // Silently handle auth errors - user just won't see edit button
      }
    };

    fetchCurrentUser();
  }, []);

  // Fallback client-side fetch if SSR failed
  useEffect(() => {
    if (initialProfile || !id) return;
    
    const fetchProfile = async () => {
      try {
        const res = await fetch(getApiUrl(`users/profile/by-id/${id}`), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Failed to fetch user profile');
        const data = await res.json();
        setUserProfile(data);
      } catch (err) {
        console.error(err.message);
        setError(err.message);
      }
    };

    fetchProfile();
  }, [id, initialProfile]);

  if (error) {
    return (
      <>
        <Head>
          <title>Profile Not Found | Brakebee</title>
          {id && <link rel="canonical" href={`https://brakebee.com/profile/${id}`} />}
        </Head>
        <div>
          <div className={styles.container}>
            <h1 className={styles.title}>Profile Not Found</h1>
            <p className={styles.error}>Error: {error}</p>
          </div>
        </div>
      </>
    );
  }

  // Build dynamic SEO with fallbacks
  const hasBusinessName = !!userProfile?.business_name;
  const artistName = userProfile?.business_name || userProfile?.display_name || userProfile?.username || 'Artist';
  const artistBio = userProfile?.artist_biography || userProfile?.bio || `Discover artwork by ${artistName} on Brakebee.`;
  const profileImage = userProfile?.profile_picture_url || null;
  const profileType = hasBusinessName ? "Organization" : "Person";

  // Generate Person/Organization Schema for Google Rich Results
  const personSchema = userProfile ? {
    "@context": "https://schema.org",
    "@type": profileType,
    "name": artistName,
    "description": artistBio.substring(0, 500),
    "url": `https://brakebee.com/profile/${id}`,
    ...(profileImage && { "image": profileImage }),
    ...(userProfile.studio_city && {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": userProfile.studio_city,
        "addressRegion": userProfile.studio_state
      }
    }),
    "sameAs": [
      userProfile.website_url || userProfile.business_website,
      userProfile.instagram_url || userProfile.business_social_instagram,
      userProfile.facebook_url || userProfile.business_social_facebook,
      userProfile.twitter_url || userProfile.business_social_twitter
    ].filter(Boolean),
    ...(profileType === "Person" && { "jobTitle": "Artist" }),
    "memberOf": {
      "@type": "Organization",
      "name": "Brakebee Marketplace",
      "url": "https://brakebee.com"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://brakebee.com/profile/${id}`,
      "isPartOf": {
        "@type": "WebSite",
        "name": "Brakebee",
        "url": "https://brakebee.com"
      }
    },
    "additionalProperty": [
      { "@type": "PropertyValue", "name": "Marketplace", "value": "Brakebee" },
      { "@type": "PropertyValue", "name": "Seller Type", "value": "Independent Artist" }
    ]
  } : null;

  return (
    <>
      <Head>
        <title>{artistName} - Artist Profile | Brakebee</title>
        <meta name="description" content={artistBio.substring(0, 160)} />
        <meta property="og:title" content={`${artistName} | Brakebee Artist`} />
        <meta property="og:description" content={artistBio.substring(0, 160)} />
        <meta property="og:type" content="profile" />
        {profileImage && <meta property="og:image" content={profileImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`https://brakebee.com/profile/${id}`} />
        
        {personSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
          />
        )}
      </Head>
      
      {/* SEO Breadcrumb */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Artists', href: '/artists' },
          { label: artistName }
        ]} />
      </div>
      
      <ProfileDisplay 
        userProfile={userProfile}
        initialProducts={initialProducts}
        showEditButton={true}
        currentUserId={currentUserId}
      />
      
      {/* SSR Product Links for SEO - crawlable by search engines */}
      {initialProducts.length > 0 && (
        <nav aria-label="Artist products" style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '2rem 1rem',
          borderTop: '1px solid #eee'
        }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Products by {artistName}
          </h2>
          <ul style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            {initialProducts.map(product => (
              <li key={product.id}>
                <Link 
                  href={`/products/${product.id}`}
                  style={{
                    display: 'block',
                    padding: '1rem',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'box-shadow 0.2s'
                  }}
                >
                  {product.imageUrl && (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    />
                  )}
                  <div style={{ fontWeight: '500' }}>{product.name}</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    ${parseFloat(product.price || 0).toFixed(2)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}

// Server-side data fetching for SEO - products render in initial HTML
export async function getServerSideProps(context) {
  const { id } = context.params;
  
  if (!id) {
    return { props: { initialProfile: null, initialProducts: [], initialError: 'Profile ID not found' } };
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com';
  
  let initialProfile = null;
  let initialProducts = [];
  let initialError = null;

  try {
    // Fetch profile and products in parallel
    const [profileRes, productsRes] = await Promise.all([
      fetch(`${apiUrl}/users/profile/by-id/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch(`${apiUrl}/api/v2/catalog/public/products?vendor_id=${id}&limit=24`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null)
    ]);

    if (!profileRes.ok) {
      return { props: { initialProfile: null, initialProducts: [], initialError: 'Profile not found' } };
    }

    initialProfile = await profileRes.json();

    // Process products for SSR
    if (productsRes?.ok) {
      const productsData = await productsRes.json();
      const products = productsData.data || [];
      
      // Filter to active parent products only
      initialProducts = products
        .filter(p => 
          p.status === 'active' && 
          !p.parent_id &&
          p.name && 
          p.name.toLowerCase() !== 'new product draft'
        )
        .slice(0, 24)
        .map(product => {
          let imageUrl = null;
          if (product.images && product.images.length > 0) {
            const firstImg = product.images[0];
            imageUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
            
            // Convert relative URLs to absolute
            if (imageUrl && !imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('/temp_images/')) {
                imageUrl = `${apiUrl}${imageUrl}`;
              } else {
                imageUrl = `${apiUrl}/smart-media/${imageUrl}`;
              }
            }
          }
          
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl
          };
        });
    }
  } catch (error) {
    console.error('SSR fetch error:', error);
    initialError = 'Error loading profile';
  }

  return {
    props: {
      initialProfile,
      initialProducts,
      initialError
    }
  };
}
