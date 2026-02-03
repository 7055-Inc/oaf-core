/**
 * User Media Library Page (Admin)
 * 
 * Admin-only page for reviewing and managing user-submitted marketing content.
 * Route: /dashboard/marketing/media-library
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authApiRequest } from '../../../lib/apiUtils';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { AdminMediaLibrary } from '../../../modules/marketing';

export default function MediaLibraryPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await authApiRequest('api/v2/auth/me');
      if (!response.ok) {
        router.push('/login?redirect=/dashboard/marketing/media-library');
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        // Check if user has admin role
        const isAdmin = result.data.roles?.includes('admin') || result.data.user_type === 'admin';
        setUserData({ ...result.data, isAdmin });
        
        if (!isAdmin) {
          setError('Access denied. This page is only available to administrators.');
        }
      } else {
        setError('Failed to load user data');
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
