/**
 * Admin Refunds Dashboard Page
 * Centralized payment and refund management
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { AdminRefunds } from '../../../modules/finances/components';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';

/**
 * Admin Refunds Page
 * 
 * Admin-only page for processing refunds across all payment types:
 * - Orders (checkout)
 * - Application fees
 * - Booth fees
 * - Subscriptions
 * 
 * Route: /dashboard/finances/refunds
 */
export default function RefundsPage() {
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
        <title>Admin Refunds | Dashboard</title>
      </Head>
      <DashboardShell>
        <AdminRefunds />
      </DashboardShell>
    </>
  );
}
