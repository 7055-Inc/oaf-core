/**
 * Email Management Page
 * 
 * Admin-only page for managing email system including:
 * - Templates management
 * - Email logs and history
 * - Queue management
 * - Bounce tracking
 * 
 * Route: /dashboard/system/email
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { EmailCore } from '../../../modules/system/components';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';

export default function EmailPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUser();
      setUserData(data);
      if (!checkIsAdmin(data)) {
        setError('Access denied. This page is only available to administrators.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head>
          <title>Email Management | Dashboard | Brakebee</title>
        </Head>
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell userData={userData}>
        <Head>
          <title>Email Management | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-danger">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Email Management | Dashboard | Brakebee</title>
      </Head>
      <EmailCore />
    </DashboardShell>
  );
}
