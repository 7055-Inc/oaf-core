/**
 * SocialLinks Component
 * Reusable social media icon links for user profiles
 * Used by ProfileDisplay and AboutTheArtist
 */

import React from 'react';

/**
 * Normalize social URL to full URL format
 */
const normalizeUrl = (url, platform) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  
  const username = url.replace('@', '');
  const prefixes = {
    website: 'https://',
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    tiktok: 'https://tiktok.com/@',
    twitter: 'https://x.com/',
    pinterest: 'https://pinterest.com/',
    whatsapp: 'https://wa.me/',
  };
  
  return prefixes[platform] ? `${prefixes[platform]}${username}` : url;
};

/**
 * Social platform configuration
 */
const PLATFORMS = {
  website: { icon: 'fa-solid fa-globe', title: 'Website' },
  instagram: { icon: 'fa-brands fa-instagram', title: 'Instagram' },
  facebook: { icon: 'fa-brands fa-facebook-f', title: 'Facebook' },
  tiktok: { icon: 'fa-brands fa-tiktok', title: 'TikTok' },
  twitter: { icon: 'fa-brands fa-x-twitter', title: 'X (Twitter)' },
  pinterest: { icon: 'fa-brands fa-pinterest-p', title: 'Pinterest' },
  whatsapp: { icon: 'fa-brands fa-whatsapp', title: 'WhatsApp' },
};

/**
 * Extract social links from user profile
 * Prioritizes business_ prefixed fields
 */
export function extractSocialLinks(profile, useBusinessPriority = true) {
  if (!profile) return {};
  
  if (useBusinessPriority) {
    return {
      website: profile.business_website || profile.website || profile.portfolio_url,
      instagram: profile.business_social_instagram || profile.social_instagram || profile.instagram,
      facebook: profile.business_social_facebook || profile.social_facebook,
      tiktok: profile.business_social_tiktok || profile.social_tiktok,
      twitter: profile.business_social_twitter || profile.social_twitter,
      pinterest: profile.business_social_pinterest || profile.social_pinterest,
      whatsapp: profile.social_whatsapp,
    };
  }
  
  return {
    website: profile.website,
    instagram: profile.social_instagram,
    facebook: profile.social_facebook,
    tiktok: profile.social_tiktok,
    twitter: profile.social_twitter,
    pinterest: profile.social_pinterest,
    whatsapp: profile.social_whatsapp,
  };
}

/**
 * SocialLinks Component
 * 
 * @param {Object} props
 * @param {Object} props.links - Social links object { website, instagram, facebook, etc. }
 * @param {string} props.size - Size variant: 'small' | 'medium' | 'large'
 * @param {string} props.variant - Style variant: 'outline' | 'filled' | 'minimal'
 * @param {string} props.className - Additional CSS class
 */
export default function SocialLinks({ 
  links = {}, 
  size = 'medium',
  variant = 'outline',
  className = ''
}) {
  const activeLinks = Object.entries(links).filter(([_, url]) => url);
  
  if (activeLinks.length === 0) return null;
  
  const sizeStyles = {
    small: { width: '28px', height: '28px', fontSize: '0.8rem' },
    medium: { width: '36px', height: '36px', fontSize: '1rem' },
    large: { width: '44px', height: '44px', fontSize: '1.2rem' },
  };
  
  const variantStyles = {
    outline: {
      background: 'transparent',
      color: 'var(--primary-color)',
      border: '2px solid var(--primary-color)',
    },
    filled: {
      background: 'var(--primary-color)',
      color: 'white',
      border: 'none',
    },
    minimal: {
      background: 'transparent',
      color: '#666',
      border: 'none',
    },
  };
  
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    ...sizeStyles[size],
    ...variantStyles[variant],
  };
  
  const hoverClass = `social-link-${variant}`;
  
  return (
    <div 
      className={`social-links ${className}`}
      style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
    >
      <style jsx>{`
        .social-link-outline:hover {
          background-color: var(--primary-color);
          color: white;
          transform: translateY(-2px);
        }
        .social-link-filled:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
        .social-link-minimal:hover {
          color: var(--primary-color);
          transform: translateY(-2px);
        }
      `}</style>
      {activeLinks.map(([platform, url]) => {
        const config = PLATFORMS[platform];
        if (!config) return null;
        
        return (
          <a
            key={platform}
            href={normalizeUrl(url, platform)}
            target="_blank"
            rel="noopener noreferrer"
            title={config.title}
            className={hoverClass}
            style={baseStyle}
          >
            <i className={config.icon}></i>
          </a>
        );
      })}
    </div>
  );
}
