import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StateDisplay from './StateDisplay';
import { getApiUrl, getSmartMediaUrl } from '../lib/config';
import styles from './AboutTheArtist.module.css';

const AboutTheArtist = ({ vendorId, vendorData }) => {
  const [vendor, setVendor] = useState(null);
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyModalContent, setPolicyModalContent] = useState({ type: '', content: '', loading: false });

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

  const handlePolicyClick = async (policyType) => {
    if (!vendorId) {
      alert('Unable to load policy - vendor information not available');
      return;
    }

    setPolicyModalContent({ type: policyType, content: '', loading: true });
    setShowPolicyModal(true);

    try {
      // Check if we already have policies cached
      let policiesData = policies;
      
      if (!policiesData) {
        // Fetch all policies at once
        const res = await fetch(getApiUrl(`users/${vendorId}/policies`));
        
        if (!res.ok) {
          throw new Error('Failed to fetch policies');
        }
        
        const data = await res.json();
        
        if (data.success && data.policies) {
          policiesData = data.policies;
          setPolicies(policiesData); // Cache for future use
        } else {
          throw new Error('No policies returned');
        }
      }
      
      // Get the specific policy requested
      const policy = policiesData[policyType];
      
      if (policy && policy.policy_text) {
        setPolicyModalContent({ 
          type: policyType, 
          content: policy.policy_text, 
          loading: false,
          source: policy.policy_source 
        });
      } else {
        setPolicyModalContent({ 
          type: policyType, 
          content: 'No policy available for this artist.', 
          loading: false 
        });
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
      setPolicyModalContent({ 
        type: policyType, 
        content: 'Error loading policy. Please try again later.', 
        loading: false 
      });
    }
  };

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
  const website = vendor.website || vendor.portfolio_url;
  const instagram = vendor.instagram || vendor.social_instagram;
  const memberSince = vendor.created_at ? new Date(vendor.created_at).getFullYear() : null;

  return (
    <div className={styles.aboutArtist}>
      <div className={styles.header}>
        <h3>About the Artist</h3>
      </div>

      <div className={styles.artistInfo}>
        <div className={styles.artistImage}>
          {getProfileImage() ? (
            <img 
              src={getProfileImage()} 
              alt={businessName}
              className={styles.profileImage}
              onError={(e) => {
                // Hide broken image and show default avatar
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

        <div className={styles.artistDetails}>
          <div className={styles.nameAndState}>
            <h4 className={styles.businessName}>{businessName}</h4>
            {location && (
              <div className={styles.location}>
                <span className={styles.locationIcon}>📍</span>
                {location}
              </div>
            )}
          </div>
          
          {memberSince && (
            <div className={styles.memberSince}>
              Selling on Brakebee since {memberSince}
            </div>
          )}

          <div className={styles.bioSection}>
            <p className={styles.bioText}>
              {bio ? truncateBio(bio, 300) : 'This artist hasn\'t added a bio yet.'}
            </p>
          </div>
          
          <div className={styles.artistLinks}>
            <Link href={`/profile/${vendor.id || vendorId}`} className={styles.viewProfileBtn}>
              View Full Profile
            </Link>
            {website && (
              <a href={website.startsWith('http') ? website : `https://${website}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className={styles.websiteLink}>
                🌐 Website
              </a>
            )}
            {instagram && (
              <a href={`https://instagram.com/${instagram.replace('@', '')}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className={styles.socialLink}>
                📷 Instagram
              </a>
            )}
          </div>
        </div>
      </div>

      <div className={styles.policyRibbon}>
        <div className={styles.policyLinks}>
          <button 
            className={styles.policyLink}
            onClick={() => handlePolicyClick('shipping')}
          >
            📦 Shipping Policy
          </button>
          <button 
            className={styles.policyLink}
            onClick={() => handlePolicyClick('return')}
          >
            ↩️ Returns Policy
          </button>
        </div>
      </div>
      
      {/* Policy Modal */}
      {showPolicyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPolicyModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {policyModalContent.type === 'shipping' ? '📦 Shipping Policy' : '↩️ Returns Policy'}
              </h2>
              <button 
                onClick={() => setShowPolicyModal(false)}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {policyModalContent.loading ? (
                <div className={styles.loading}>Loading policy...</div>
              ) : (
                <div className={styles.policyContent}>
                  {policyModalContent.content ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: policyModalContent.content.replace(/\n/g, '<br/>') }}
                    />
                  ) : (
                    <p>No policy available for this artist.</p>
                  )}
                  {policyModalContent.source && (
                    <div className={styles.policySource}>
                      <small>
                        Policy source: {policyModalContent.source === 'custom' ? 'Artist-specific' : 'Default'}
                      </small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutTheArtist; 