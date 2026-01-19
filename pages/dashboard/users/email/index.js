/**
 * Email Preferences Page
 * 
 * Dashboard page for managing email notification preferences.
 * Route: /dashboard/users/email
 */

'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import EmailPreferences from '../../../../modules/dashboard/components/users/EmailPreferences';
import { getAuthToken } from '../../../../lib/auth';

export default function EmailPreferencesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/dashboard/users/email');
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
        <title>Email Preferences | Brakebee Dashboard</title>
        <meta name="description" content="Manage your email notification preferences" />
      </Head>
      
      <DashboardShell>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>Email Preferences</h1>
            <p className="page-description">Manage how and when you receive email notifications.</p>
          </div>
          
          <EmailPreferences />
        </div>
      </DashboardShell>
    </>
  );
}
