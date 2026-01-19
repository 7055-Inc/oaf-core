/**
 * Payment Settings Page
 * 
 * Dashboard page for managing Stripe Connect and payment settings.
 * Route: /dashboard/users/payments
 */

'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import PaymentSettings from '../../../../modules/dashboard/components/users/PaymentSettings';
import { getAuthToken } from '../../../../lib/auth';

export default function PaymentSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/dashboard/users/payments');
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
        <title>Payment Settings | Brakebee Dashboard</title>
        <meta name="description" content="Manage your Stripe Connect account and payment settings" />
      </Head>
      
      <DashboardShell>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>Payment Settings</h1>
            <p className="page-description">Manage your Stripe Connect account, view earnings, and configure payout preferences.</p>
          </div>
          
          <PaymentSettings />
        </div>
      </DashboardShell>
    </>
  );
}
