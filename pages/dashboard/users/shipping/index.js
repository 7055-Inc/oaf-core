/**
 * Shipping Settings Page
 * 
 * Dashboard page for managing shipping preferences.
 * Route: /dashboard/users/shipping
 */

'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import ShippingSettings from '../../../../modules/dashboard/components/users/ShippingSettings';
import { getAuthToken } from '../../../../lib/auth';

export default function ShippingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/dashboard/users/shipping');
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="dashboard-page">
          <div className="loading-state">
            <p>Loading...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Shipping Settings | Brakebee Dashboard</title>
        <meta name="description" content="Manage your shipping preferences and return address" />
      </Head>
      
      <DashboardShell>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>Shipping Settings</h1>
            <p className="page-description">Configure your return address, handling time, and label preferences.</p>
          </div>
          
          <ShippingSettings />
        </div>
      </DashboardShell>
    </>
  );
}
