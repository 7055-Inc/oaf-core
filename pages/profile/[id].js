'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Breadcrumb from '../../components/Breadcrumb';
import { getApiUrl } from '../../lib/config';
import ProfileDisplay from '../../components/users/ProfileDisplay';
import { authenticatedApiRequest } from '../../lib/csrf';
import styles from './Profile.module.css';

export default function ProfileView() {
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (!id) return;
    
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }
        
        const response = await fetch(getApiUrl('users/me'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.id);
        }
      } catch (err) {
        // Silently handle auth errors - user just won't see edit button
      }
    };

    fetchCurrentUser();

    const fetchProfile = async () => {
      try {
        const res = await fetch(getApiUrl(`users/profile/by-id/${id}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await res.json();
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
      <>
        <Head>
          <title>Profile Not Found | Brakebee</title>
          {id && <link rel="canonical" href={`https://brakebee.com/profile/${id}`} />}
        </Head>
        <div>
          <div className={styles.container}>
            <h1 className={styles.title}>Profile Not Found</h1>
            <p className={styles.error}>Error: {error}</p>
          </div>
        </div>
      </>
    );
  }

  // Build dynamic SEO with fallbacks
  const artistName = userProfile?.display_name || userProfile?.username || 'Artist';
  const artistBio = userProfile?.artist_biography || userProfile?.bio || `Discover artwork by ${artistName} on Brakebee.`;
  const profileImage = userProfile?.profile_picture_url || null;

  // Generate Person Schema for Google Rich Results
  const personSchema = userProfile ? {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": artistName,
    "description": artistBio.substring(0, 500),
    "url": `https://brakebee.com/profile/${id}`,
    ...(profileImage && { "image": profileImage }),
    ...(userProfile.studio_city && {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": userProfile.studio_city,
        "addressRegion": userProfile.studio_state
      }
    }),
    "sameAs": [
      userProfile.website_url,
      userProfile.instagram_url,
      userProfile.facebook_url,
      userProfile.twitter_url
    ].filter(Boolean),
    "jobTitle": "Artist",
    "worksFor": {
      "@type": "Organization",
      "name": "Brakebee",
      "url": "https://brakebee.com"
    }
  } : null;

  return (
    <>
      <Head>
        <title>{artistName} - Artist Profile | Brakebee</title>
        <meta name="description" content={artistBio.substring(0, 160)} />
        <meta property="og:title" content={`${artistName} | Brakebee Artist`} />
        <meta property="og:description" content={artistBio.substring(0, 160)} />
        <meta property="og:type" content="profile" />
        {profileImage && <meta property="og:image" content={profileImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`https://brakebee.com/profile/${id}`} />
        
        {/* Person Schema for Google Rich Results */}
        {personSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
          />
        )}
      </Head>
      
      {/* SEO Breadcrumb */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Artists', href: '/artists' },
          { label: artistName }
        ]} />
      </div>
      
      <ProfileDisplay 
        userProfile={userProfile}
        showEditButton={true}
        currentUserId={currentUserId}
      />
    </>
  );
}