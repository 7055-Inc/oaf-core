/**
 * Share Content Page
 * 
 * User-facing page for submitting marketing content (images/videos).
 * Route: /dashboard/marketing/share-content
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { ShareContent } from '../../../modules/marketing';
import { getCurrentUser } from '../../../lib/users/api';

export default function ShareContentPage() {
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
