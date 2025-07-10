import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StateDisplay from './StateDisplay';
import styles from './AboutTheArtist.module.css';

const AboutTheArtist = ({ vendorId }) => {
  const [vendor, setVendor] = useState(null);
  const [shippingPolicy, setShippingPolicy] = useState(null);
  const [returnPolicy, setReturnPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendorId) return;

    const fetchVendorData = async () => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0];
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        // Fetch vendor profile
        const vendorRes = await fetch(`https://api2.onlineartfestival.com/users/profile/by-id/${vendorId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!vendorRes.ok) {
          throw new Error('Failed to fetch vendor profile');
        }

        const vendorData = await vendorRes.json();
        setVendor(vendorData);

        // Fetch vendor policies (shipping and return)
        await fetchVendorPolicies(vendorId, token);

      } catch (err) {
        console.error('Error fetching vendor data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchVendorPolicies = async (vendorId, token) => {
      try {
        // Note: These endpoints might need to be adjusted based on your API
        // For now, I'll create a placeholder structure
        setShippingPolicy({ policy_text: 'Standard shipping policy applies', policy_source: 'default' });
        setReturnPolicy({ policy_text: 'Standard return policy applies', policy_source: 'default' });
      } catch (err) {
        console.error('Error fetching vendor policies:', err);
        // Don't fail the whole component if policies can't be loaded
      }
    };

    fetchVendorData();
  }, [vendorId]);

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
      return `https://api2.onlineartfestival.com${vendor.profile_image_path}`;
    }
    return '/static_media/default-avatar.png'; // Fallback image
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

  const businessName = vendor.business_name || vendor.display_name;
  const bio = vendor.artist_biography || vendor.bio;
  const displayState = vendor.studio_state || vendor.state;

  return (
    <div className={styles.aboutArtist}>
      <div className={styles.header}>
        <h3>About the Artist</h3>
      </div>

      <div className={styles.artistInfo}>
        <div className={styles.artistImage}>
          <img 
            src={getProfileImage()} 
            alt={businessName}
            className={styles.profileImage}
            onError={(e) => {
              e.target.src = '/static_media/default-avatar.png';
            }}
          />
        </div>

        <div className={styles.artistDetails}>
          <div className={styles.nameAndState}>
            <h4 className={styles.businessName}>{businessName}</h4>
            {displayState && (
              <StateDisplay state={displayState} />
            )}
          </div>

          {bio && (
            <div className={styles.bioSection}>
              <p className={styles.bioText}>
                {truncateBio(bio)}
              </p>
              <Link href={`/profile/${vendor.id}`} className={styles.readMoreLink}>
                Read more →
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className={styles.policyRibbon}>
        <div className={styles.policyLinks}>
          <button 
            className={styles.policyLink}
            onClick={() => {
              // TODO: Open shipping policy modal or navigate to policy page
              console.log('Show shipping policy for vendor:', vendorId);
            }}
          >
            📦 Shipping Policy
          </button>
          <button 
            className={styles.policyLink}
            onClick={() => {
              // TODO: Open return policy modal or navigate to policy page  
              console.log('Show return policy for vendor:', vendorId);
            }}
          >
            ↩️ Returns Policy
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutTheArtist; 