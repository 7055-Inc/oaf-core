import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import fs from 'fs';
import path from 'path';

// Import components with SSR enabled for SEO
import FeaturedArtist from '../components/FeaturedArtist';
import EventsCarousel from '../components/EventsCarousel';
import ArtistCarousel from '../components/ArtistCarousel';

// LoginModal can stay client-side only (not SEO relevant)
const LoginModal = dynamic(() => import('../components/login/LoginModal'), {
  ssr: false,
  loading: () => null
});

export default function Home({ heroData, featuredArtist, featuredProducts, events, artists }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const router = useRouter();

  // Check login state client-side only (uses localStorage)
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleVideoEnd = () => {
    if (heroData && heroData.videos.length > 1) {
      setCurrentVideoIndex((prev) => (prev + 1) % heroData.videos.length);
    }
  };

  const handleHeroButtonClick = () => {
    if (heroData && heroData.buttonUrl) {
      router.push(heroData.buttonUrl);
    }
  };

  return (
    <>
      <Head>
        <title key="title">{heroData?.h1Text ? `${heroData.h1Text} | Brakebee` : 'Brakebee | Discover Unique Handmade Art'}</title>
        <meta key="description" name="description" content={heroData?.h3Text || 'Discover and shop unique handmade art from talented artists. Browse paintings, sculptures, photography, jewelry, and more from independent creators.'} />
        <meta key="og:title" property="og:title" content={heroData?.h1Text || 'Brakebee - Discover Unique Handmade Art'} />
        <meta key="og:description" property="og:description" content={heroData?.h3Text || 'Discover and shop unique handmade art from talented artists.'} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://brakebee.com" />
        {/* canonical tag is set by _app.js for static pages */}
      </Head>

      {/* === NEW HOMEPAGE SECTIONS === */}
      {/* Section 1: Visual Discovery Band */}
      {/* <VisualDiscoveryBand /> */}
      
      {/* === ARCHIVED CONTENT BELOW - FOR FUTURE RECYCLING === */}
      {/* Hero Section */}
      {heroData && heroData.videos.length > 0 && (
        <section style={{ 
          position: 'relative', 
          height: '100vh', 
          overflow: 'hidden',
          backgroundColor: '#000'
        }}>
          {/* Video Background */}
          <video 
            key={heroData.videos[currentVideoIndex]?.id}
            autoPlay 
            muted 
            onEnded={handleVideoEnd}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <source src={`/static_media/${heroData.videos[currentVideoIndex]?.filename}`} type="video/mp4" />
          </video>

          {/* Overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#1a1a2e'
          }}>
            <div style={{ maxWidth: '800px', padding: '2rem' }}>
              {heroData.h1Text && (
                <h1 style={{ 
                  fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                  marginBottom: '1rem', 
                  fontWeight: 'bold',
                  textShadow: '1px 1px 3px rgba(255,255,255,0.8)',
                  lineHeight: 1.2
                }}>
                  {heroData.h1Text}
                </h1>
              )}
              {heroData.h3Text && (
                <h2 style={{ 
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)', 
                  marginBottom: '2rem',
                  textShadow: '1px 1px 2px rgba(255,255,255,0.9)',
                  lineHeight: 1.4,
                  fontWeight: 'normal'
                }}>
                  {heroData.h3Text}
                </h2>
              )}
              {heroData.buttonText && (
                <button 
                  onClick={handleHeroButtonClick}
                  style={{
                    fontSize: '1.1rem',
                    padding: '1rem 2.5rem'
                  }}
                >
                  {heroData.buttonText}
                </button>
              )}
            </div>
          </div>

          {/* Video Progress Indicator */}
          {heroData.videos.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '0.5rem'
            }}>
              {heroData.videos.map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: index === currentVideoIndex ? '#055474' : 'rgba(255,255,255,0.5)',
                    transition: 'background-color 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured Artist */}
      <FeaturedArtist initialArtist={featuredArtist} initialProducts={featuredProducts} />

      {/* Events Carousel */}
      <EventsCarousel initialEvents={events} />

      {/* Artist Carousel */}
      <ArtistCarousel initialArtists={artists} />

      {/* Fallback Content */}
      {(!heroData || heroData.videos.length === 0) && (
        <div style={{ padding: '2rem' }}>
          {isLoggedIn ? (
            <div>
              <h1>Welcome Back!</h1>
              <p>You are logged in. Visit your <a href="/dashboard">dashboard</a> to continue.</p>
            </div>
          ) : (
            <div>
              <h1>Welcome to Online Art Festival</h1>
              <p>Login to access your dashboard.</p>
              <LoginModal />
            </div>
          )}
        </div>
      )}

    </>
  );
}

// Server-side data fetching for SEO - all content renders on server
export async function getServerSideProps() {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com';
  
  let heroData = null;
  let featuredArtist = null;
  let featuredProducts = [];
  let events = [];
  let artists = [];
  
  try {
    // Read hero.json from the public directory on the server
    const heroPath = path.join(process.cwd(), 'public', 'static_media', 'hero.json');
    if (fs.existsSync(heroPath)) {
      const heroContent = fs.readFileSync(heroPath, 'utf8');
      heroData = JSON.parse(heroContent);
    }
  } catch (error) {
    console.error('Error loading hero data:', error);
  }

  // Fetch all carousel data in parallel for performance
  try {
    const [artistsRes, eventsRes, vendorsRes] = await Promise.all([
      // Artists for carousel
      fetch(`${apiUrl}/users/artists?limit=50&random=true`).catch(() => null),
      // Events for carousel
      fetch(`${apiUrl}/api/events/upcoming?limit=10`).catch(() => null),
      // Vendors for featured artist
      fetch(`${apiUrl}/users/artists?has_permission=vendor&limit=50`).catch(() => null),
    ]);

    // Process artists
    if (artistsRes?.ok) {
      const artistsData = await artistsRes.json();
      artists = Array.isArray(artistsData) ? artistsData : [];
    }

    // Process events
    if (eventsRes?.ok) {
      events = await eventsRes.json();
    }

    // Process featured artist
    if (vendorsRes?.ok) {
      const vendorsData = await vendorsRes.json();
      const vendors = Array.isArray(vendorsData) ? vendorsData : [];
      
      if (vendors.length > 0) {
        // Pick a random artist
        featuredArtist = vendors[Math.floor(Math.random() * vendors.length)];
        
        // Fetch their products
        if (featuredArtist?.id) {
          try {
            const productsRes = await fetch(`${apiUrl}/products/all?vendor_id=${featuredArtist.id}&include=images`);
            if (productsRes.ok) {
              const productsData = await productsRes.json();
              const allProducts = productsData.products || [];
              
              // Filter to active parent products only
              featuredProducts = allProducts
                .filter(p => 
                  p.parent_id === null && 
                  p.status === 'active' &&
                  p.name && 
                  p.name.toLowerCase() !== 'new product draft'
                )
                .slice(0, 4)
                .map(product => {
                  let imageUrl = null;
                  if (product.images && product.images.length > 0) {
                    const firstImg = product.images[0];
                    imageUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
                  }
                  // Convert relative URLs to absolute for SSR
                  if (imageUrl && !imageUrl.startsWith('http')) {
                    if (imageUrl.startsWith('/temp_images/')) {
                      imageUrl = `${apiUrl}${imageUrl}`;
                    } else {
                      imageUrl = `${apiUrl}/smart-media/${imageUrl}`;
                    }
                  }
                  return { ...product, processedImageUrl: imageUrl };
                });
            }
          } catch (e) {
            console.error('Error fetching featured products:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching homepage data:', error);
  }
  
  return {
    props: {
      heroData,
      featuredArtist,
      featuredProducts,
      events,
      artists
    }
  };
}