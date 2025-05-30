'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import styles from './Profile.module.css';

export default function ProfileView() {
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('https://api2.onlineartfestival.com/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user profile');
          }
          return res.json();
        })
        .then(data => {
          console.log('Current User Data:', data); // Add this log
          setCurrentUserId(data.id);
        })
        .catch(err => {
          console.error('Error fetching current user ID:', err.message);
        });
    }

    if (!id) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`https://api2.onlineartfestival.com/users/profile/by-id/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await res.json();
        console.log('User Profile Data:', data);
        setUserProfile(data);
      } catch (err) {
        console.error(err.message);
        setError(err.message);
      }
    };

    fetchProfile();
  }, [id]);

  if (error) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1 className={styles.title}>Profile Not Found</h1>
          <p className={styles.error}>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId && currentUserId.toString() === id;

  return (
    <div className={styles.container}>
      <Header />
      {userProfile.header_image_path ? (
        <img
          src={`https://api2.onlineartfestival.com${userProfile.header_image_path}`}
          alt="Header"
          className={styles.headerImage}
        />
      ) : (
        <div className={styles.headerPlaceholder}></div>
      )}
      {isOwnProfile && (
        <div className={styles.editRibbon}>
          <a href="/profile/edit" className={styles.editLink}>
            Edit Profile
          </a>
        </div>
      )}
      <div className={styles.profileWrapper}>
        {userProfile.profile_image_path && (
          <img
            src={`https://api2.onlineartfestival.com${userProfile.profile_image_path}`}
            alt="Profile"
            className={styles.profileImage}
          />
        )}
        <div className={styles.socialIcons}>
          {/* Dynamic social links */}
          {userProfile.website && (
            <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
              <i className="fa-solid fa-globe"></i>
            </a>
          )}
          {userProfile.social_facebook && (
            <a href={userProfile.social_facebook} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-facebook-f"></i>
            </a>
          )}
          {userProfile.social_instagram && (
            <a href={userProfile.social_instagram} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-instagram"></i>
            </a>
          )}
          {userProfile.social_tiktok && (
            <a href={userProfile.social_tiktok} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-tiktok"></i>
            </a>
          )}
          {userProfile.social_twitter && (
            <a href={userProfile.social_twitter} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-x-twitter"></i>
            </a>
          )}
          {userProfile.social_pinterest && (
            <a href={userProfile.social_pinterest} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-pinterest-p"></i>
            </a>
          )}
          {userProfile.social_whatsapp && (
            <a href={userProfile.social_whatsapp} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-whatsapp"></i>
            </a>
          )}
        </div>
      </div>
      <div className={styles.infoCard}>
        <h1 className={styles.userName}>
          {userProfile.first_name} {userProfile.last_name}
        </h1>
        {userProfile.state && (
          <span className={styles.stateBadge}>
            <span className="material-icons stateIcon">location_on</span>
            {userProfile.state}
          </span>
        )}
        {userProfile.bio && (
          <div className={styles.bioQuote}>
            <p>{userProfile.bio}</p>
          </div>
        )}
      </div>

      {userProfile.user_type === 'artist' && (
        <div className={styles.section}>
          <h2 className={styles.subtitle}>Artist Details</h2>
          {userProfile.business_name && <p><strong>Business Name:</strong> {userProfile.business_name}</p>}
          {(userProfile.studio_address_line1 || userProfile.studio_address_line2) && (
            <p>
              <strong>Studio Address:</strong>{' '}
              {userProfile.studio_address_line1}{userProfile.studio_address_line1 && ', '}
              {userProfile.studio_address_line2}
            </p>
          )}
          {userProfile.business_website && (
            <p>
              <strong>Business Website:</strong>{' '}
              <a href={userProfile.business_website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {userProfile.business_website}
              </a>
            </p>
          )}
          {userProfile.artist_biography && <p><strong>Biography:</strong> {userProfile.artist_biography}</p>}
          {userProfile.art_categories && Array.isArray(userProfile.art_categories) && userProfile.art_categories.length > 0 && (
            <p><strong>Art Categories:</strong> {userProfile.art_categories.join(', ')}</p>
          )}
          <p><strong>Accepts Custom Orders:</strong> {userProfile.does_custom}</p>
          {userProfile.does_custom === 'yes' && userProfile.custom_details && (
            <p><strong>Custom Order Details:</strong> {userProfile.custom_details}</p>
          )}
        </div>
      )}

      {userProfile.user_type === 'community' && (
        <div className={styles.section}>
          <h2 className={styles.subtitle}>Community Details</h2>
          {userProfile.art_interests && Array.isArray(userProfile.art_interests) && userProfile.art_interests.length > 0 && (
            <p><strong>Art Interests:</strong> {userProfile.art_interests.join(', ')}</p>
          )}
          {userProfile.wishlist && Array.isArray(userProfile.wishlist) && userProfile.wishlist.length > 0 && (
            <p><strong>Wishlist:</strong> {userProfile.wishlist.join(', ')}</p>
          )}
        </div>
      )}

      {userProfile.user_type === 'promoter' && (
        <div className={styles.section}>
          <h2 className={styles.subtitle}>Promoter Details</h2>
          {userProfile.business_name && <p><strong>Business Name:</strong> {userProfile.business_name}</p>}
          <p><strong>Non-Profit:</strong> {userProfile.is_non_profit}</p>
          {userProfile.upcoming_events && Array.isArray(userProfile.upcoming_events) && userProfile.upcoming_events.length > 0 && (
            <div>
              <strong>Upcoming Events:</strong>
              <ul className={styles.eventList}>
                {userProfile.upcoming_events.map((event, index) => (
                  <li key={index}>{event.name} on {event.date}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}