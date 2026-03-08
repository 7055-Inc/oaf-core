'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import APIKeys from '../../../components/dashboard/developers/components/APIKeys';
import { getCurrentUser } from '../../../lib/users';

/**
 * API Keys Page (My Account → API Keys)
 * Admin-only. Manage API keys for third-party and server-to-server access.
 */
export default function APIKeysPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await getCurrentUser();
        if (user.user_type !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setUserData(user);
      } catch (err) {
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="loading-state">
          <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p>Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !userData) {
    return (
      <DashboardShell>
        <div className="alert alert-error">{error || 'Access denied'}</div>
      </DashboardShell>
    );
  }

  return (
    <>
      <Head>
        <title>API Keys | My Account | Dashboard | Brakebee</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>API Keys</h1>
            <p className="form-hint">
              Manage API keys for third-party and server-to-server access (e.g. media processing, integrations). Admin only.
            </p>
          </div>
          <div className="dashboard-page-content">
            <APIKeys userData={userData} />
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
