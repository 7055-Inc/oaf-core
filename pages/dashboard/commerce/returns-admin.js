/**
 * Admin Returns Dashboard Page
 * Admin interface for managing return requests
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { AdminReturns } from '../../../modules/commerce/components';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';

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
        const data = await getCurrentUser();
        setUserData(data);
      } catch (err) {
        setError(err.message || 'Failed to load user data');
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
  if (!checkIsAdmin(userData)) {
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
