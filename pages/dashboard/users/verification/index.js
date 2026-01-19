/**
 * Verification Hub Page
 * 
 * Dashboard page for artist verification management.
 * Route: /dashboard/users/verification
 */

'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import VerificationHub from '../../../../modules/dashboard/components/users/VerificationHub';
import { getAuthToken } from '../../../../lib/auth';

export default function VerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/dashboard/users/verification');
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
        <title>Artist Verification | Brakebee Dashboard</title>
        <meta name="description" content="Get verified to access premium features and unlock exclusive opportunities" />
      </Head>
      
      <DashboardShell>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>Artist Verification</h1>
            <p className="page-description">Get verified to access premium features and skip certain application requirements.</p>
          </div>
          
          <VerificationHub />
        </div>
      </DashboardShell>
    </>
  );
}
