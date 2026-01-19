'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { ProfileForm } from '../../../../modules/dashboard/components/users';
import { getCurrentUser } from '../../../../lib/users';
import { getAuthToken } from '../../../../lib/auth';

/**
 * Edit Profile Page
 * Uses the new accordion-based ProfileForm from the modular components
 */
export default function EditProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
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
        setUserData(profile);
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
        <title>Edit Profile | Dashboard | Brakebee</title>
      </Head>
      <DashboardShell>
        <div className="dashboard-page">
          {/* Page Header */}
          <div className="dashboard-page-header">
            <h1>Edit Profile</h1>
            <div className="dashboard-page-actions">
              <button 
                onClick={() => router.push('/dashboard/users/profile')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="dashboard-page-content">
            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading profile...</p>
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && userData && (
              <ProfileForm userData={userData} />
            )}
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
