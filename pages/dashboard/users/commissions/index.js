'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { CommissionManagement } from '../../../../modules/users/components';
import { getCurrentUser } from '../../../../lib/users';

/**
 * Commission Management Page
 * Admin-only page for managing vendor commission rates
 */
export default function CommissionManagementPage() {
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
      if (user.user_type !== 'admin' && !user.permissions?.includes('manage_system')) {
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
        <title>Commission Management | Dashboard | Brakebee</title>
      </Head>
      <DashboardShell>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <div className="header-row">
              <div>
                <nav className="breadcrumb">
                  <Link href="/dashboard/users/manage">User Management</Link>
                  <span className="separator">/</span>
                  <span>Commissions</span>
                </nav>
              </div>
              <div className="header-actions">
                <Link href="/dashboard/users/manage" className="button secondary">
                  <i className="fa-solid fa-arrow-left"></i> Back to Users
                </Link>
              </div>
            </div>
          </div>
          <div className="dashboard-page-content">
            <CommissionManagement />
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
