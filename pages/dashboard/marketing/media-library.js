/**
 * User Media Library Page (Admin)
 * 
 * Admin-only page for reviewing and managing user-submitted marketing content.
 * Route: /dashboard/marketing/media-library
 */

export async function getServerSideProps() { return { props: {} }; }

import { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { AdminMediaLibrary } from '../../../modules/marketing';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';

export default function MediaLibraryPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUser();
      setUserData(data);
      if (!checkIsAdmin(data)) {
        setError('Access denied. This page is only available to administrators.');
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head>
          <title>User Media Library | Dashboard | Brakebee</title>
        </Head>
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell userData={userData}>
        <Head>
          <title>User Media Library | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>User Media Library | Dashboard | Brakebee</title>
      </Head>
      <AdminMediaLibrary userData={userData} />
    </DashboardShell>
  );
}
