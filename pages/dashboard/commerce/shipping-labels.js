/**
 * Shipping Labels Dashboard Page
 * 
 * Create and manage standalone shipping labels.
 * Uses ChecklistController pattern for subscription gate.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { ShippingLabelsSubscription } from '../../../modules/commerce/components';
import { getCurrentUser } from '../../../lib/users/api';

export default function ShippingLabelsPage() {
  const router = useRouter();
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
          <title>Shipping Labels | Dashboard | Brakebee</title>
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
          <title>Shipping Labels | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Shipping Labels | Dashboard | Brakebee</title>
      </Head>
      
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Shipping Labels</h1>
          <p className="page-description">
            Create and manage standalone shipping labels for your packages.
          </p>
        </div>

        <ShippingLabelsSubscription userData={userData} />
      </div>
    </DashboardShell>
  );
}
