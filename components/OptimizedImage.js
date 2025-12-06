'use client';
import Image from 'next/image';
import { useState } from 'react';

/**
 * OptimizedImage - Wrapper around next/image for external images
 * 
 * Automatically optimizes images from api.brakebee.com:
 * - Resizes to appropriate dimensions
 * - Converts to WebP/AVIF
 * - Caches optimized versions
 * - Provides fallback for errors
 * 
 * Usage:
 * <OptimizedImage 
 *   src="https://api.brakebee.com/api/images/profiles/123.jpg"
 *   alt="Profile"
 *   width={200}
 *   height={200}
 *   className={styles.image}
 * />
 */
export default function OptimizedImage({ 
  src, 
  alt = '', 
  width = 400, 
  height = 400,
  className = '',
  style = {},
  priority = false,
  quality = 75,
  objectFit = 'cover',
  fallbackSrc = null,
  ...props 
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If no src or error occurred, show fallback or placeholder
  if (!src || error) {
    if (fallbackSrc) {
      return (
        <Image
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          className={className}
          style={{ objectFit, ...style }}
          {...props}
        />
      );
    }
    
    // Default placeholder
    return (
      <div 
        className={className}
        style={{ 
          width, 
          height, 
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style 
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#ccc">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
    );
  }

  // Check if URL is external (needs next/image remotePatterns)
  const isExternal = src.startsWith('http://') || src.startsWith('https://');
  
  // For external URLs, use next/image with optimization
  // For internal URLs (starting with /), also use next/image
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ 
        objectFit,
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.3s ease',
        ...style 
      }}
      quality={quality}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      {...props}
    />
  );
}

/**
 * ProfileImage - Optimized for circular profile images
 */
export function ProfileImage({ src, alt, size = 100, className = '', ...props }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '50%' }}
      objectFit="cover"
      {...props}
    />
  );
}

/**
 * ProductImage - Optimized for product images
 */
export function ProductImage({ src, alt, width = 400, height = 400, className = '', ...props }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      objectFit="contain"
      {...props}
    />
  );
}

