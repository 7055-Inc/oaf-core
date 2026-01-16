import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StateDisplay from './StateDisplay';
import { getApiUrl, getSmartMediaUrl } from '../lib/config';
import styles from './AboutTheArtist.module.css';

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
        // Always fetch full profile for complete data (image, bio, state, etc.)
        // Try public profile endpoint first (no auth required)
        const publicRes = await fetch(getApiUrl(`users/profile/by-id/${vendorId}`));
        
        if (publicRes.ok) {
          const data = await publicRes.json();
          // Merge with any vendorData passed from parent
          setVendor({ ...vendorData, ...data });
          setLoading(false);
          return;
        }
        
        // Fallback: try authenticated endpoint
        const token = localStorage.getItem('token') || document.cookie.split('token=')[1]?.split(';')[0];
        if (token) {
          const authRes = await fetch(getApiUrl(`users/profile/by-id/${vendorId}`), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (authRes.ok) {
            const vendorResult = await authRes.json();
            setVendor({ ...vendorData, ...vendorResult });
            setLoading(false);
            return;
          }
        }
        
        // Last fallback: use vendorData from props if available
        if (vendorData) {
          setVendor(vendorData);
          setLoading(false);
          return;
        }
        
        setError('Could not load artist profile');
        setLoading(false);

      } catch (err) {
        console.error('Error fetching vendor data:', err);
        // Fallback to vendorData if fetch fails
        if (vendorData) {
          setVendor(vendorData);
        } else {
          setError(err.message);
        }
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId, vendorData]);

  const truncateBio = (bio, maxLength = 150) => {
    if (!bio) return '';
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength).trim() + '...';
  };

  const getProfileImage = () => {
    if (vendor?.profile_image_path) {
      if (vendor.profile_image_path.startsWith('http')) {
        return vendor.profile_image_path;
      }
      return getSmartMediaUrl(vendor.profile_image_path);
    }
    return null; // No fallback - we'll use CSS icon instead
  };

  if (loading) {
    return (
      <div className={styles.aboutArtist}>
        <div className={styles.loading}>Loading artist info...</div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className={styles.aboutArtist}>
        <div className={styles.error}>Unable to load artist information</div>
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

  // Business socials (prioritize business_ prefixed fields)
  const website = vendor.business_website || vendor.website || vendor.portfolio_url;
  const facebook = vendor.business_social_facebook || vendor.social_facebook;
  const instagram = vendor.business_social_instagram || vendor.social_instagram || vendor.instagram;
  const tiktok = vendor.business_social_tiktok || vendor.social_tiktok;
  const twitter = vendor.business_social_twitter || vendor.social_twitter;
  const pinterest = vendor.business_social_pinterest || vendor.social_pinterest;

  // Header/banner image
  const getHeaderImage = () => {
    if (vendor?.header_image_path) {
      if (vendor.header_image_path.startsWith('http')) {
        return vendor.header_image_path;
      }
      return getSmartMediaUrl(vendor.header_image_path);
    }
    return null;
  };

  return (
    <div className={styles.aboutArtist}>
      <div className={styles.header}>
        <h3>About the Artist</h3>
      </div>

      <div className={styles.artistInfo}>
        {/* Header/Banner Image Section */}
        <div 
          className={styles.headerImageSection}
          style={getHeaderImage() ? { backgroundImage: `url(${getHeaderImage()})` } : {}}
        >
          {/* Floating info card overlay */}
          <div className={styles.floatingCard}>
            <div className={styles.profileImageWrapper}>
              {getProfileImage() ? (
                <img 
                  src={getProfileImage()} 
                  alt={businessName}
                  className={styles.profileImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={styles.defaultAvatar}
                style={{ display: getProfileImage() ? 'none' : 'flex' }}
                title={businessName}
              ></div>
            </div>
            <div className={styles.floatingCardInfo}>
              <h4 className={styles.businessName}>{businessName}</h4>
              {location && (
                <div className={styles.location}>
                  <i className="fas fa-map-marker-alt"></i> {location}
                </div>
              )}
              {memberSince && (
                <div className={styles.memberSince}>
                  Since {memberSince}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.artistDetails}>

          <div className={styles.bioSection}>
            <p className={styles.bioText}>
              {bio ? truncateBio(bio, 300) : 'This artist hasn\'t added a bio yet.'}
            </p>
          </div>
          
          {/* Social Icons Row */}
          <div className={styles.socialIcons}>
            {website && (
              <a href={website.startsWith('http') ? website : `https://${website}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className={styles.socialIcon}
                 title="Website">
                <i className="fas fa-globe"></i>
              </a>
            )}
            {instagram && (
              <a href={`https://instagram.com/${instagram.replace('@', '')}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className={styles.socialIcon}
                 title="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
            )}
            {facebook && (
              <a href={facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className={styles.socialIcon}
                 title="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
            )}
            {tiktok && (
              <a href={tiktok.startsWith('http') ? tiktok : `https://tiktok.com/@${tiktok.replace('@', '')}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className={styles.socialIcon}
                 title="TikTok">
                <i className="fab fa-tiktok"></i>
              </a>
            )}
            {twitter && (
              <a href={twitter.startsWith('http') ? twitter : `https://x.com/${twitter.replace('@', '')}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className={styles.socialIcon}
                 title="X (Twitter)">
                <i className="fab fa-x-twitter"></i>
              </a>
            )}
            {pinterest && (
              <a href={pinterest.startsWith('http') ? pinterest : `https://pinterest.com/${pinterest.replace('@', '')}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className={styles.socialIcon}
                 title="Pinterest">
                <i className="fab fa-pinterest-p"></i>
              </a>
            )}
          </div>

          <div className={styles.artistLinks}>
            <Link href={`/profile/${vendor.id || vendorId}`} className={styles.viewProfileBtn}>
              View Full Profile
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.policyRibbon}>
        <div className={styles.policyLinks}>
          <a 
            href="/policies/shipping"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.policyLink}
          >
            <i className="fas fa-box"></i> Shipping Policy
          </a>
          <a 
            href="/policies/returns"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.policyLink}
          >
            <i className="fas fa-undo"></i> Returns Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutTheArtist; 