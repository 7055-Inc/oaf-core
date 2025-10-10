'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../../lib/config';
import Header from '../../components/Header';
import ProfileDisplay from '../../components/shared/ProfileDisplay';
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
      <div>
        <Header />
        <div className={styles.container}>
          <h1 className={styles.title}>Profile Not Found</h1>
          <p className={styles.error}>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <ProfileDisplay 
        userProfile={userProfile}
        showEditButton={true}
        currentUserId={currentUserId}
      />
    </div>
  );
}