// View Profile Component
// This file uses the shared ProfileDisplay component
// Title is handled by slide-in header template in Dashboard

import { useState, useEffect } from 'react';
import ProfileDisplay from '../../../shared/ProfileDisplay';

export default function ViewProfile({ userData }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userData?.id) return;
    
    const fetchProfile = async () => {
      try {
        const response = await fetch(`https://api2.onlineartfestival.com/users/profile/by-id/${userData.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userData?.id]);

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Use the shared ProfileDisplay component - same as public profile page
  return (
    <ProfileDisplay 
      userProfile={userProfile}
      showEditButton={false}
      currentUserId={userData?.id}
    />
  );
}
