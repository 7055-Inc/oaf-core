import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './ArtistCarousel.module.css';

export default function ArtistCarousel() {
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      // Get 50 random active artists for the carousel
      const response = await fetch('https://api2.onlineartfestival.com/users/artists?limit=50&random=true');
      if (response.ok) {
        const artistsData = await response.json();
        if (artistsData.length > 0) {
          // Duplicate the data multiple times to create seamless infinite scroll
          // We need enough copies to ensure smooth looping without gaps
          const duplicatedArtists = [
            ...artistsData, 
            ...artistsData, 
            ...artistsData, 
            ...artistsData,
            ...artistsData,
            ...artistsData
          ];
          setArtists(duplicatedArtists);
        }
      }
    } catch (err) {
      console.error('Error loading artists:', err);
    } finally {
      setIsLoading(false);
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
      return `https://api2.onlineartfestival.com${artist.profile_image_path}`;
    }
    return null;
  };

  // Split artists into two rows for staggered effect
  const topRowArtists = artists.filter((_, index) => index % 2 === 0);
  const bottomRowArtists = artists.filter((_, index) => index % 2 === 1);

  if (isLoading) {
    return (
      <section className={styles.artistSection}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingRow}>
            {[...Array(6)].map((_, index) => (
              <div key={index} className={styles.skeletonCard}>
                <div className={styles.skeletonImage}></div>
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonText}></div>
                  <div className={styles.skeletonText}></div>
                  <div className={styles.skeletonText}></div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.loadingRow}>
            {[...Array(6)].map((_, index) => (
              <div key={index} className={styles.skeletonCard}>
                <div className={styles.skeletonImage}></div>
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonText}></div>
                  <div className={styles.skeletonText}></div>
                  <div className={styles.skeletonText}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (artists.length === 0) {
    return (
      <section className={styles.artistSection}>
        <div className={styles.emptyState}>
          <p>Featured artists coming soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.artistSection}>
      <div className={styles.carouselContainer}>
        {/* Top Row */}
        <div className={styles.artistRow}>
          <div className={styles.scrollingTrack} data-row="top">
            {topRowArtists.map((artist, index) => (
              <Link 
                href={`/profile/${artist.id}`} 
                key={`top-${artist.id}-${index}`} 
                className={styles.artistCard}
              >
                <div className={styles.artistImage}>
                  {getArtistImage(artist) ? (
                    <img 
                      src={getArtistImage(artist)} 
                      alt={getDisplayName(artist)}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className={styles.artistInfo}>
                  <h3 className={styles.artistName}>{getDisplayName(artist)}</h3>
                  {formatLocation(artist.studio_city, artist.studio_state) && (
                    <p className={styles.artistLocation}>
                      {formatLocation(artist.studio_city, artist.studio_state)}
                    </p>
                  )}
                  <p className={styles.artistBio}>
                    {artist.artist_biography ? 
                      artist.artist_biography.substring(0, 80) + '...' : 
                      'Discover unique artwork and custom pieces'
                    }
                  </p>
                  <span className={styles.viewProfile}>View Profile</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Row */}
        <div className={styles.artistRow}>
          <div className={styles.scrollingTrack} data-row="bottom">
            {bottomRowArtists.map((artist, index) => (
              <Link 
                href={`/profile/${artist.id}`} 
                key={`bottom-${artist.id}-${index}`} 
                className={styles.artistCard}
              >
                <div className={styles.artistImage}>
                  {getArtistImage(artist) ? (
                    <img 
                      src={getArtistImage(artist)} 
                      alt={getDisplayName(artist)}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className={styles.artistInfo}>
                  <h3 className={styles.artistName}>{getDisplayName(artist)}</h3>
                  {formatLocation(artist.studio_city, artist.studio_state) && (
                    <p className={styles.artistLocation}>
                      {formatLocation(artist.studio_city, artist.studio_state)}
                    </p>
                  )}
                  <p className={styles.artistBio}>
                    {artist.artist_biography ? 
                      artist.artist_biography.substring(0, 80) + '...' : 
                      'Discover unique artwork and custom pieces'
                    }
                  </p>
                  <span className={styles.viewProfile}>View Profile</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 