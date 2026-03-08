/**
 * AboutTheArtist Component
 * Condensed artist card displayed on product pages
 * Shows artist profile summary with social links and bio
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSmartMediaUrl } from '../../lib/config';
import { getPublicProfile } from '../../lib/users';
import SocialLinks, { extractSocialLinks } from './SocialLinks';

const AboutTheArtist = ({ vendorId, vendorData }) => {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    const fetchVendorData = async () => {
      try {
        // Use v2 API via lib/users (public endpoint, no auth required)
        const profile = await getPublicProfile(vendorId);
        setVendor({ ...vendorData, ...profile });
      } catch (err) {
        console.error('Error fetching vendor data:', err);
        // Fallback to vendorData if fetch fails
        if (vendorData) {
          setVendor(vendorData);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId, vendorData]);

  const truncateBio = (bio, maxLength = 300) => {
    if (!bio) return '';
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength).trim() + '...';
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return getSmartMediaUrl(path);
  };

  // Use global loading/error states
  if (loading) {
    return (
      <div className="about-artist-card">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading artist info...</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="about-artist-card">
        <div className="error-state">
          <p>Unable to load artist information</p>
        </div>
      </div>
    );
  }

  const businessName = vendor.business_name || vendor.display_name || 
    (vendor.first_name && vendor.last_name ? `${vendor.first_name} ${vendor.last_name}` : null) ||
    vendor.username || 'Artist';
  const bio = vendor.artist_biography || vendor.bio || vendor.about;
  const displayState = vendor.studio_state || vendor.state;
  const displayCity = vendor.studio_city || vendor.city;
  const location = [displayCity, displayState].filter(Boolean).join(', ');
  const memberSince = vendor.created_at ? new Date(vendor.created_at).getFullYear() : null;
  
  const profileImage = getImageUrl(vendor.profile_image_path);
  const headerImage = getImageUrl(vendor.header_image_path);
  const socialLinks = extractSocialLinks(vendor, true);

  return (
    <div className="about-artist-card">
      <style jsx>{`
        .about-artist-card {
          background-color: #f8fafc;
          border: 2px solid #e2e8f0;
          box-shadow: var(--shadow-soft);
          height: fit-content;
          position: sticky;
          top: 0;
          overflow: hidden;
        }
        
        .about-artist-card .loading-state,
        .about-artist-card .error-state {
          padding: 2rem;
        }
        
        .card-header {
          padding: 1rem 1.5rem;
          border-bottom: 2px solid var(--primary-color);
        }
        
        .card-header h3 {
          margin: 0;
          color: var(--primary-color);
        }
        
        .header-image-section {
          height: 160px;
          background-size: cover;
          background-position: center;
          background: var(--gradient-primary);
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 1rem;
        }
        
        .floating-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          padding: 12px 16px;
          border-radius: var(--border-radius-sm);
          box-shadow: var(--shadow-medium);
          max-width: 90%;
        }
        
        .profile-image {
          width: 56px;
          height: 56px;
          object-fit: cover;
          border: 3px solid var(--primary-color);
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .default-avatar {
          width: 56px;
          height: 56px;
          border: 3px solid var(--primary-color);
          background-color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: #94a3b8;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .floating-info {
          text-align: left;
          min-width: 0;
        }
        
        .floating-info h4 {
          font-size: 0.95rem;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: var(--font-body);
        }
        
        .location {
          font-size: 0.75rem;
          color: #666;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .location i {
          color: var(--primary-color);
        }
        
        .member-since {
          font-size: 0.7rem;
          color: var(--primary-color);
          font-weight: 600;
        }
        
        .artist-details {
          padding: 1rem 1.5rem 0;
          text-align: right;
        }
        
        .bio-text {
          font-size: 0.875rem;
          color: var(--text-color);
          line-height: 1.6;
          margin: 0 0 1rem 0;
          text-align: right;
        }
        
        .artist-links {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.75rem;
        }
        
        .view-profile-btn {
          display: inline-block;
          background: var(--gradient-primary);
          color: white;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: var(--border-radius-sm);
          transition: all 0.2s ease;
        }
        
        .view-profile-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-soft);
        }
        
        .policy-ribbon {
          background: var(--gradient-primary);
          margin-top: 1.5rem;
          padding: 1rem 1.5rem;
        }
        
        .policy-links {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }
        
        .policy-link {
          background: transparent;
          color: white;
          border: 2px solid white;
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: var(--border-radius-sm);
          transition: all 0.2s ease;
        }
        
        .policy-link:hover {
          background: white;
          color: var(--primary-color);
        }
        
        @media (max-width: 1024px) {
          .about-artist-card {
            position: static;
            margin-top: 2rem;
          }
          
          .policy-links {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .policy-link {
            width: 100%;
            text-align: center;
          }
        }
        
        @media (max-width: 768px) {
          .header-image-section {
            height: 130px;
          }
          
          .profile-image,
          .default-avatar {
            width: 48px;
            height: 48px;
          }
          
          .floating-info h4 {
            font-size: 0.85rem;
          }
        }
      `}</style>
      
      <div className="card-header">
        <h3>About the Artist</h3>
      </div>

      <div 
        className="header-image-section"
        style={headerImage ? { backgroundImage: `url(${headerImage})` } : {}}
      >
        <div className="floating-card">
          {profileImage ? (
            <img 
              src={profileImage} 
              alt={businessName}
              className="profile-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="default-avatar"
            style={{ display: profileImage ? 'none' : 'flex' }}
          >
            <i className="fa-solid fa-user"></i>
          </div>
          <div className="floating-info">
            <h4>{businessName}</h4>
            {location && (
              <div className="location">
                <i className="fas fa-map-marker-alt"></i> {location}
              </div>
            )}
            {memberSince && (
              <div className="member-since">Since {memberSince}</div>
            )}
          </div>
        </div>
      </div>

      <div className="artist-details">
        <p className="bio-text">
          {bio ? truncateBio(bio) : "This artist hasn't added a bio yet."}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <SocialLinks links={socialLinks} size="medium" variant="outline" />
        </div>

        <div className="artist-links">
          <Link href={`/profile/${vendor.id || vendorId}`} className="view-profile-btn">
            View Full Profile
          </Link>
        </div>
      </div>

      <div className="policy-ribbon">
        <div className="policy-links">
          <a 
            href="/policies/shipping"
            target="_blank"
            rel="noopener noreferrer"
            className="policy-link"
          >
            <i className="fas fa-box"></i> Shipping Policy
          </a>
          <a 
            href="/policies/returns"
            target="_blank"
            rel="noopener noreferrer"
            className="policy-link"
          >
            <i className="fas fa-undo"></i> Returns Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutTheArtist;
