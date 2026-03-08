/**
 * ArtistCarousel Component
 * Infinite scrolling carousel of featured artists
 * Used on homepage and product pages
 * 
 * Uses global styles from: modules/styles/carousels.css
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSmartMediaUrl } from '../../lib/config';
import { getPublicArtists } from '../../lib/users';

// Cache config
const ARTISTS_CACHE_KEY = 'artists_carousel_cache';
const ARTISTS_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export default function ArtistCarousel({ initialArtists = [] }) {
  const processedInitial = initialArtists.length > 0 
    ? [...initialArtists, ...initialArtists, ...initialArtists] 
    : [];
  const [artists, setArtists] = useState(processedInitial);
  const [isLoading, setIsLoading] = useState(initialArtists.length === 0);

  useEffect(() => {
    if (initialArtists.length === 0) {
      loadArtists();
    }
  }, [initialArtists]);

  const loadArtists = async () => {
    try {
      const cached = localStorage.getItem(ARTISTS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ARTISTS_CACHE_DURATION) {
          const duplicatedArtists = [...data, ...data, ...data];
          setArtists(duplicatedArtists);
          setIsLoading(false);
          return;
        }
      }

      const artistsData = await getPublicArtists({ limit: 50, random: true });
      if (artistsData.length > 0) {
        localStorage.setItem(ARTISTS_CACHE_KEY, JSON.stringify({
          data: artistsData,
          timestamp: Date.now()
        }));
        const duplicatedArtists = [...artistsData, ...artistsData, ...artistsData];
        setArtists(duplicatedArtists);
      }
    } catch (err) {
      // Silent fail
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
      if (artist.profile_image_path.startsWith('http')) {
        return artist.profile_image_path;
      }
      return getSmartMediaUrl(artist.profile_image_path);
    }
    return null;
  };

  const topRowArtists = artists.filter((_, index) => index % 2 === 0);
  const bottomRowArtists = artists.filter((_, index) => index % 2 === 1);

  const renderArtistCard = (artist, index, rowKey) => (
    <Link 
      href={`/profile/${artist.id}`} 
      key={`${rowKey}-${artist.id}-${index}`} 
      className="artist-card"
    >
      <div className="artist-image">
        {getArtistImage(artist) ? (
          <Image 
            src={getArtistImage(artist)} 
            alt={getDisplayName(artist)}
            width={120}
            height={140}
            style={{ objectFit: 'cover' }}
            loading="lazy"
            quality={60}
            unoptimized={getArtistImage(artist)?.toLowerCase().endsWith('.bmp')}
          />
        ) : (
          <div className="image-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
            </svg>
          </div>
        )}
      </div>
      <div className="artist-info">
        <h3 className="artist-name">{getDisplayName(artist)}</h3>
        {formatLocation(artist.studio_city, artist.studio_state) && (
          <p className="artist-location">
            {formatLocation(artist.studio_city, artist.studio_state)}
          </p>
        )}
        <p className="artist-bio">
          {artist.artist_biography ? 
            artist.artist_biography.substring(0, 80) + '...' : 
            'Discover unique artwork and custom pieces'
          }
        </p>
        <span className="view-profile">View Profile</span>
      </div>
    </Link>
  );

  const renderSkeletonCard = (index) => (
    <div key={index} className="skeleton-card">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-text"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text"></div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <section className="artist-carousel">
        <div className="carousel-skeleton">
          <div className="skeleton-row">
            {[...Array(6)].map((_, index) => renderSkeletonCard(index))}
          </div>
          <div className="skeleton-row">
            {[...Array(6)].map((_, index) => renderSkeletonCard(index + 6))}
          </div>
        </div>
      </section>
    );
  }

  if (artists.length === 0) {
    return (
      <section className="artist-carousel">
        <div className="empty-state">
          <p>Featured artists coming soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="artist-carousel">
      <div className="carousel-container">
        <div className="carousel-row">
          <div className="scrolling-track" data-row="top">
            {topRowArtists.map((artist, index) => renderArtistCard(artist, index, 'top'))}
          </div>
        </div>
        <div className="carousel-row">
          <div className="scrolling-track" data-row="bottom">
            {bottomRowArtists.map((artist, index) => renderArtistCard(artist, index, 'bottom'))}
          </div>
        </div>
      </div>
    </section>
  );
}
