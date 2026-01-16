'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './FeaturedArtist.module.css';
import { getApiUrl, getSmartMediaUrl } from '../lib/config';

export default function FeaturedArtist() {
  const [artist, setArtist] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFeaturedArtist();
  }, []);

  const loadFeaturedArtist = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch artists who are approved vendors
      const response = await fetch(getApiUrl('users/artists?has_permission=vendor&limit=50'));
      
      if (!response.ok) {
        throw new Error('Failed to fetch artists');
      }
      
      const data = await response.json();
      // API returns array directly, not { artists: [...] }
      const artists = Array.isArray(data) ? data : (data.artists || []);
      
      if (artists.length === 0) {
        setError('No artists found');
        return;
      }
      
      // Pick a random artist
      const randomArtist = artists[Math.floor(Math.random() * artists.length)];
      setArtist(randomArtist);
      
      // Fetch their products with images
      if (randomArtist.id) {
        const productsResponse = await fetch(getApiUrl(`products/all?vendor_id=${randomArtist.id}&include=images`));
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          const allProducts = productsData.products || [];
          
          // Filter to active parent products only
          const parentProducts = allProducts.filter(p => 
            p.parent_id === null && 
            p.status === 'active' &&
            p.name && 
            p.name.toLowerCase() !== 'new product draft'
          ).slice(0, 4);
          
          // Process image URLs like ArtistProductCarousel does
          const processedProducts = parentProducts.map(product => {
            let imageUrl = null;
            
            if (product.images && product.images.length > 0) {
              const firstImg = product.images[0];
              imageUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
            }
            
            // Convert relative URL to absolute
            if (imageUrl && !imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('/temp_images/')) {
                imageUrl = getApiUrl(imageUrl.substring(1));
              } else {
                imageUrl = getSmartMediaUrl(imageUrl);
              }
            }
            
            return { ...product, processedImageUrl: imageUrl };
          });
          
          setProducts(processedProducts);
        }
      }
      
    } catch (err) {
      console.error('Error loading featured artist:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (isLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.skeletonLayout}>
            <div className={styles.skeletonProfile}>
              <div className={styles.skeletonAvatar}></div>
              <div className={styles.skeletonText}></div>
              <div className={styles.skeletonText} style={{ width: '60%' }}></div>
            </div>
            <div className={styles.skeletonProducts}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={styles.skeletonProduct}></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !artist) {
    return null; // Silently fail - don't show section if no artist
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.badge}>Featured Artist</span>
          <h2 className={styles.sectionTitle}>Meet the Maker</h2>
        </div>

        <div className={styles.contentGrid}>
          {/* Artist Profile */}
          <div className={styles.profileCard}>
            <Link href={`/profile/${artist.id}`} className={styles.profileLink}>
              <div className={styles.avatarWrapper}>
                {artist.profile_image_path ? (
                  <Image
                    src={getSmartMediaUrl(artist.profile_image_path)}
                    alt={artist.business_name || `${artist.first_name} ${artist.last_name}` || 'Artist'}
                    fill
                    sizes="160px"
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <span>{(artist.business_name || artist.first_name || 'A').charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </Link>

            <div className={styles.profileInfo}>
              <Link href={`/profile/${artist.id}`} className={styles.artistName}>
                {artist.business_name || `${artist.first_name} ${artist.last_name}`.trim() || 'Artist'}
              </Link>
              
              {(artist.studio_city || artist.studio_state) && (
                <p className={styles.location}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {[artist.studio_city, artist.studio_state].filter(Boolean).join(', ')}
                </p>
              )}

              {artist.artist_biography && (
                <p className={styles.bio}>
                  {artist.artist_biography.length > 200 
                    ? artist.artist_biography.substring(0, 200) + '...' 
                    : artist.artist_biography}
                </p>
              )}

              <Link href={`/profile/${artist.id}`} className={styles.viewProfileBtn}>
                View Full Profile
              </Link>
            </div>
          </div>

          {/* Sample Products */}
          {products.length > 0 && (
            <div className={styles.productsSection}>
              <h3 className={styles.productsTitle}>Recent Work</h3>
              <div className={styles.productsGrid}>
                {products.map(product => (
                  <Link 
                    href={`/products/${product.id}`} 
                    key={product.id}
                    className={styles.productCard}
                  >
                    <div className={styles.productImageWrapper}>
                      {product.processedImageUrl ? (
                        <Image
                          src={product.processedImageUrl}
                          alt={product.name || product.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 200px"
                          className={styles.productImage}
                        />
                      ) : (
                        <div className={styles.productPlaceholder}>
                          <span>No Image</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.productInfo}>
                      <p className={styles.productTitle}>{product.name || product.title}</p>
                      {product.price && (
                        <p className={styles.productPrice}>{formatPrice(product.price)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              
              <Link href={`/artist/${artist.id}/products`} className={styles.shopAllBtn}>
                Shop All from {artist.business_name || `${artist.first_name} ${artist.last_name}`.trim() || 'this Artist'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
