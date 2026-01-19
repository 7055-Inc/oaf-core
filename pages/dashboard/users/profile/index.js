'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import ProfileDisplay from '../../../../components/users/ProfileDisplay';
import { getCurrentUser } from '../../../../lib/users';
import { getAuthToken } from '../../../../lib/auth';

/**
 * View Profile Page
 * Shows the current user's profile using the shared ProfileDisplay component
 */
export default function ProfileViewPage() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const profile = await getCurrentUser();
        setUserProfile(profile);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <>
      <Head>
        <title>My Profile | Dashboard | Brakebee</title>
      </Head>
      <DashboardShell>
        <div className="dashboard-page">
          {/* Page Header */}
          <div className="dashboard-page-header">
            <h1>My Profile</h1>
            <div className="dashboard-page-actions">
              <Link href="/dashboard/users/profile/edit" className="button primary">
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className="dashboard-page-content">
            {loading && (
              <div className="loading-state">
                <p>Loading profile...</p>
              </div>
            )}

            {error && (
              <div className="error-alert">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && userProfile && (
              <ProfileDisplay 
                userProfile={userProfile}
                showEditButton={false}
                currentUserId={userProfile.id}
              />
            )}
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
