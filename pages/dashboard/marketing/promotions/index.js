/**
 * Promotions Page (Marketing)
 * Coupons and promotion invitations. Uses v2 API.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { PromotionsManagement } from '../../../../modules/commerce';
import { getCurrentUser } from '../../../../lib/users/api';
import { hasPermission } from '../../../../lib/userUtils';

export default function PromotionsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        setUserData(data);
      } catch (err) {
        console.error('Error loading user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) return null;

  const canAccess = hasPermission(userData, 'vendor');

  if (!canAccess) {
    return (
      <>
        <Head>
          <title>Promotions | Marketing | Dashboard</title>
        </Head>
        <DashboardShell userData={userData}>
          <div className="page-header">
            <h1>Promotions</h1>
            <p className="page-subtitle">Coupons and promotion invitations</p>
          </div>
          <div className="warning-alert">
            <strong>Access required.</strong> You need vendor permission to manage coupons and promotions.
          </div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Promotions | Marketing | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Promotions</h1>
          <p className="page-subtitle">Manage your coupons and promotion invitations</p>
        </div>
        <PromotionsManagement userData={userData} />
      </DashboardShell>
    </>
  );
}
