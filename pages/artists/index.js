'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Artists.module.css';
import { getApiUrl, getSmartMediaUrl } from '../../lib/config';

export default function Artists() {
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalArtists, setTotalArtists] = useState(0);
  
  const ARTISTS_PER_PAGE = 24;

  useEffect(() => {
    loadArtists(1, true); // Load first page and reset
  }, []);

  const loadArtists = async (page = 1, reset = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const offset = (page - 1) * ARTISTS_PER_PAGE;
      const response = await fetch(
        getApiUrl(`users/artists?limit=${ARTISTS_PER_PAGE}&offset=${offset}&random=true`)
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch artists');
      }
      
      const artistsData = await response.json();
      
      if (reset) {
        setArtists(artistsData);
      } else {
        setArtists(prev => [...prev, ...artistsData]);
      }
      
      setHasMore(artistsData.length === ARTISTS_PER_PAGE);
      setCurrentPage(page);
      
      // Calculate total for display (approximate)
      if (reset) {
        setTotalArtists(artistsData.length + (artistsData.length === ARTISTS_PER_PAGE ? ARTISTS_PER_PAGE : 0));
      }
      
    } catch (err) {
      console.error('Error loading artists:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadArtists(currentPage + 1, false);
    }
  };

  const formatLocation = (city, state) => {
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return null;
  };

  const getDisplayName = (artist) => {
    return artist.business_name || artist.username || 'Artist';
  };

  const getArtistImage = (artist) => {
    if (artist.profile_image_path) {
      return getSmartMediaUrl(artist.profile_image_path);
    }
    return null;
  };

  const truncateBio = (bio, maxLength = 120) => {
    if (!bio) return 'Discover unique artwork and custom pieces';
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength) + '...';
  };

  return (
    <div className={styles.pageContainer}>
      
      <main className={styles.main}>

        {/* Artists Grid Section */}
        <section className={styles.artistsSection}>
          <div className={styles.container}>
            
            {error && (
              <div className={styles.errorMessage}>
                <p>Error loading artists: {error}</p>
                <button 
                  onClick={() => loadArtists(1, true)}
                  className={styles.retryButton}
                >
                  Try Again
                </button>
              </div>
            )}

            {!error && (
              <>

                {/* Artists Grid */}
                <div className={styles.artistsGrid}>
                  {artists.map((artist, index) => (
                    <Link 
                      href={`/profile/${artist.id}`} 
                      key={`${artist.id}-${index}`}
                      className={styles.artistCard}
                    >
                      <div className={styles.artistImage}>
                        {getArtistImage(artist) ? (
                          <img 
                            src={getArtistImage(artist)} 
                            alt={getDisplayName(artist)}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.imagePlaceholder}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.artistInfo}>
                        <h3 className={styles.artistName}>{getDisplayName(artist)}</h3>
                        
                        {formatLocation(artist.studio_city, artist.studio_state) && (
                          <p className={styles.artistLocation}>
                            📍 {formatLocation(artist.studio_city, artist.studio_state)}
                          </p>
                        )}
                        
                        {artist.art_categories && (
                          <p className={styles.artistCategories}>
                            {Array.isArray(artist.art_categories) 
                              ? artist.art_categories.slice(0, 3).join(', ')
                              : artist.art_categories
                            }
                          </p>
                        )}
                        
                        <p className={styles.artistBio}>
                          {truncateBio(artist.artist_biography || artist.bio)}
                        </p>
                        
                        <div className={styles.cardFooter}>
                          <span className={styles.viewProfile}>View Profile →</span>
                          {artist.does_custom === 'yes' && (
                            <span className={styles.customBadge}>Custom Work</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Loading Skeleton */}
                {isLoading && (
                  <div className={styles.artistsGrid}>
                    {[...Array(8)].map((_, index) => (
                      <div key={`skeleton-${index}`} className={styles.skeletonCard}>
                        <div className={styles.skeletonImage}></div>
                        <div className={styles.skeletonContent}>
                          <div className={styles.skeletonText}></div>
                          <div className={styles.skeletonText}></div>
                          <div className={styles.skeletonText}></div>
                          <div className={styles.skeletonText}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Load More Button */}
                {!isLoading && hasMore && artists.length > 0 && (
                  <div className={styles.loadMoreContainer}>
                    <button 
                      onClick={loadMore}
                      className={styles.loadMoreButton}
                    >
                      Load More Artists
                    </button>
                  </div>
                )}


                {/* Empty State */}
                {!isLoading && artists.length === 0 && !error && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🎨</div>
                    <h3>No Artists Found</h3>
                    <p>We're working on bringing you amazing artists. Check back soon!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

    </div>
  );
}
