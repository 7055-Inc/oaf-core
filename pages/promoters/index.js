'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Promoters.module.css';
import { getApiUrl, getSmartMediaUrl } from '../../lib/config';

export default function Promoters() {
  const [promoters, setPromoters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const PROMOTERS_PER_PAGE = 24;

  useEffect(() => {
    loadPromoters(1, true); // Load first page and reset
  }, []);

  const loadPromoters = async (page = 1, reset = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const offset = (page - 1) * PROMOTERS_PER_PAGE;
      const response = await fetch(
        getApiUrl(`users/promoters?limit=${PROMOTERS_PER_PAGE}&offset=${offset}&random=true`)
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch promoters');
      }
      
      const promotersData = await response.json();
      
      if (reset) {
        setPromoters(promotersData);
      } else {
        setPromoters(prev => [...prev, ...promotersData]);
      }
      
      setHasMore(promotersData.length === PROMOTERS_PER_PAGE);
      setCurrentPage(page);
      
    } catch (err) {
      console.error('Error loading promoters:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadPromoters(currentPage + 1, false);
    }
  };

  const formatLocation = (city, state) => {
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return null;
  };

  const getDisplayName = (promoter) => {
    return promoter.business_name || promoter.legal_name || promoter.username || 'Promoter';
  };

  const getPromoterImage = (promoter) => {
    if (promoter.profile_image_path) {
      return getSmartMediaUrl(promoter.profile_image_path);
    }
    return null;
  };

  const truncateBio = (bio, maxLength = 120) => {
    if (!bio) return 'Event promotion and artist management services';
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength) + '...';
  };

  const formatFoundingDate = (foundingDate) => {
    if (!foundingDate) return null;
    try {
      const date = new Date(foundingDate);
      return `Est. ${date.getFullYear()}`;
    } catch {
      return null;
    }
  };

  return (
    <div className={styles.pageContainer}>
      
      <main className={styles.main}>
        {/* Promoters Grid Section */}
        <section className={styles.promotersSection}>
          <div className={styles.container}>
            
            {error && (
              <div className={styles.errorMessage}>
                <p>Error loading promoters: {error}</p>
                <button 
                  onClick={() => loadPromoters(1, true)}
                  className={styles.retryButton}
                >
                  Try Again
                </button>
              </div>
            )}

            {!error && (
              <>
                {/* Promoters Grid */}
                <div className={styles.promotersGrid}>
                  {promoters.map((promoter, index) => (
                    <Link 
                      href={`/profile/${promoter.id}`} 
                      key={`${promoter.id}-${index}`}
                      className={styles.promoterCard}
                    >
                      <div className={styles.promoterImage}>
                        {getPromoterImage(promoter) ? (
                          <img 
                            src={getPromoterImage(promoter)} 
                            alt={getDisplayName(promoter)}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.imagePlaceholder}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
                              <path d="M13.5 9C13.5 10.38 12.38 11.5 11 11.5S8.5 10.38 8.5 9S9.62 7.5 11 7.5S13.5 8.62 13.5 9Z" fill="currentColor"/>
                              <path d="M17 17H7V15.5C7 13.84 9.34 12.5 11 12.5C12.66 12.5 15 13.84 15 15.5V17H17Z" fill="currentColor"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.promoterInfo}>
                        <h3 className={styles.promoterName}>{getDisplayName(promoter)}</h3>
                        
                        {formatLocation(promoter.office_city, promoter.office_state) && (
                          <p className={styles.promoterLocation}>
                            📍 {formatLocation(promoter.office_city, promoter.office_state)}
                          </p>
                        )}
                        
                        {formatFoundingDate(promoter.founding_date) && (
                          <p className={styles.promoterFounding}>
                            {formatFoundingDate(promoter.founding_date)}
                          </p>
                        )}
                        
                        <p className={styles.promoterBio}>
                          {truncateBio(promoter.bio)}
                        </p>
                        
                        <div className={styles.cardFooter}>
                          <span className={styles.viewProfile}>View Profile →</span>
                          {promoter.business_website && (
                            <span className={styles.websiteBadge}>Website</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Loading Skeleton */}
                {isLoading && (
                  <div className={styles.promotersGrid}>
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
                {!isLoading && hasMore && promoters.length > 0 && (
                  <div className={styles.loadMoreContainer}>
                    <button 
                      onClick={loadMore}
                      className={styles.loadMoreButton}
                    >
                      Load More Promoters
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && promoters.length === 0 && !error && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🎪</div>
                    <h3>No Promoters Found</h3>
                    <p>We're working on bringing you amazing event promoters. Check back soon!</p>
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
