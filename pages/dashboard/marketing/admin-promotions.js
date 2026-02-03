/**
 * Admin Promotions Page
 * Platform promotions, sales, and coupons management.
 * Admin-only.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { AdminPromotions } from '../../../modules/marketing/components';
import { getCurrentUser } from '../../../lib/users';

export default function AdminPromotionsPage() {
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
        <title>Admin Promotions | Marketing | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>Admin Promotions</h1>
            <p className="form-hint">
              Manage platform promotions, site-wide sales, and admin coupons.
            </p>
          </div>
          <div className="dashboard-page-content">
            <AdminPromotions />
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
