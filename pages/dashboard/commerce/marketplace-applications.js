/**
 * Marketplace Applications Admin Page
 * 
 * Admin interface for reviewing and managing marketplace, verified, and wholesale applications.
 * Query params: ?type=marketplace|verified|wholesale
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { AdminMarketplace } from '../../../modules/commerce/components';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin } from '../../../lib/userUtils';

export default function MarketplaceApplicationsPage() {
  const router = useRouter();
  const { type } = router.query;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine default type from query parameter
  const defaultType = ['marketplace', 'verified', 'wholesale'].includes(type) ? type : 'marketplace';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUser();
      
      if (!isAdmin(data)) {
        router.push('/dashboard');
        return;
      }
      
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
          <title>Marketplace Applications | Admin | Brakebee</title>
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
          <title>Marketplace Applications | Admin | Brakebee</title>
        </Head>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Marketplace Applications | Admin | Brakebee</title>
      </Head>
      
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Applications</h1>
          <p className="page-description">
            Review and manage marketplace, verified, and wholesale applications.
          </p>
        </div>

        <AdminMarketplace userData={userData} defaultType={defaultType} />
      </div>
    </DashboardShell>
  );
}
