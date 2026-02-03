/**
 * Share Content Page
 * 
 * User-facing page for submitting marketing content (images/videos).
 * Route: /dashboard/marketing/share-content
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authApiRequest } from '../../../lib/apiUtils';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { ShareContent } from '../../../modules/marketing';

export default function ShareContentPage() {
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
        router.push('/login?redirect=/dashboard/marketing/share-content');
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        setUserData(result.data);
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
          <title>Share Content | Dashboard | Brakebee</title>
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
          <title>Share Content | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Share Content | Dashboard | Brakebee</title>
      </Head>
      <ShareContent userData={userData} />
    </DashboardShell>
  );
}
