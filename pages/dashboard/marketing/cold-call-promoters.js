/**
 * Cold-Call Promoters Page
 * Create draft promoter accounts and events with claim emails.
 * Admin-only.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { AddPromoter } from '../../../modules/marketing/components';
import { getCurrentUser } from '../../../lib/users';

export default function ColdCallPromotersPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const user = await getCurrentUser();
      
      // Only admins can access
      if (user.user_type !== 'admin' && !user.permissions?.includes('manage_system')) {
        router.push('/dashboard');
        return;
      }
      
      setUserData(user);
      setLoading(false);
    } catch (err) {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <>
      <Head>
        <title>Cold-Call Promoters | Marketing | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="dashboard-page">
          <div className="dashboard-page-content">
            <AddPromoter />
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
