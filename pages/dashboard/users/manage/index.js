'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { UserManagement } from '../../../../modules/dashboard/components/users';
import { getCurrentUser } from '../../../../lib/users';

/**
 * User Management Page
 * Admin-only page for managing all users
 */
export default function UserManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const user = await getCurrentUser();
      
      // Only admins can access this page
      if (user.user_type !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <DashboardShell>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <>
      <Head>
        <title>User Management | Dashboard | Brakebee</title>
      </Head>
      <DashboardShell>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>User Management</h1>
            <p className="form-hint">
              Manage users, permissions, commissions, and account settings across the platform.
            </p>
          </div>
          <div className="dashboard-page-content">
            <UserManagement />
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
