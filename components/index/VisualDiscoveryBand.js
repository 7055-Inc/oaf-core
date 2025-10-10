import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/config';
import styles from './VisualDiscoveryBand.module.css';

const VisualDiscoveryBand = () => {
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHeroFeed();
  }, []);

  const fetchHeroFeed = async () => {
    try {
      setLoading(true);
      
      // Get user ID from JWT token
      const token = localStorage.getItem('token');
      let userId = 'anonymous';
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id || 'anonymous';
        } catch (e) {
          console.warn('Could not decode JWT token');
        }
      }

      const response = await fetch(getApiUrl(`api/hero-feed?userId=${userId}&limit=6`));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setTiles(data.tiles || []);
      
    } catch (err) {
      console.error('Failed to fetch hero feed:', err);
      setError(err.message);
      setTiles([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.visualBand}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Discovering amazing art...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.visualBand}>
        <div className={styles.errorState}>
          <p>Unable to load visual discovery content</p>
        </div>
      </section>
    );
  }

  if (tiles.length === 0) {
    return (
      <section className={styles.visualBand}>
        <div className={styles.emptyState}>
          <p>No content available at this time</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.visualBand}>
      <div className={styles.container}>
        <div className={styles.mosaicGrid}>
          {tiles.map((tile, index) => (
            <div 
              key={tile.id || index}
              className={`${styles.tile} ${styles[`tile${index + 1}`]}`}
              onClick={() => tile.href && (window.location.href = tile.href)}
            >
              {tile.image && (
                <img 
                  src={tile.image} 
                  alt={tile.alt || tile.title || 'Art piece'}
                  className={styles.tileImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div className={styles.tileOverlay}>
                <div className={styles.tileContent}>
                  {tile.title && (
                    <h3 className={styles.tileTitle}>{tile.title}</h3>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VisualDiscoveryBand;
