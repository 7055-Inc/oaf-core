/**
 * Admin Returns Dashboard Page
 * Admin interface for managing return requests
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { authApiRequest } from '../../../lib/apiUtils';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { AdminReturns } from '../../../modules/commerce/components';

/**
 * Admin Returns Page
 * 
 * Admin-only page for managing returns:
 * - View assistance cases requiring admin intervention
 * - Track pending and completed returns
 * - Send admin messages to return cases
 * 
 * Route: /dashboard/commerce/returns-admin
 */
export default function ReturnsAdminPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await authApiRequest('api/v2/auth/me');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const isAdmin = result.data.roles?.includes('admin') || false;
            setUserData({ ...result.data, isAdmin });
          } else {
            setError('Failed to load user data');
          }
        } else {
          setError('Failed to load user data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="error-alert">Error: {error}</div>
      </DashboardShell>
    );
  }

  // Admin check
  if (!userData?.isAdmin) {
    return (
      <DashboardShell>
        <div className="error-alert">
          Access denied. This page is only available to administrators.
        </div>
      </DashboardShell>
    );
  }

  return (
    <>
      <Head>
        <title>Returns Admin | Dashboard</title>
      </Head>
      <DashboardShell>
        <AdminReturns />
      </DashboardShell>
    </>
  );
}
