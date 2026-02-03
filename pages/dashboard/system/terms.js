/**
 * Terms & Conditions Management Page
 * 
 * Admin-only page for managing terms versions
 * 
 * Route: /dashboard/system/terms
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { authApiRequest } from '../../../lib/apiUtils';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { TermsCore } from '../../../modules/system/components';

export default function TermsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await authApiRequest('api/v2/auth/me');
      if (!response.ok) {
        setError('Failed to load user data');
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        const isAdmin = result.data.roles?.includes('admin') || result.data.user_type === 'admin';
        setUserData({ ...result.data, isAdmin });
        
        if (!isAdmin) {
          setError('Access denied. This page is only available to administrators.');
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

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head>
          <title>Terms & Policies | Dashboard | Brakebee</title>
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
          <title>Terms & Policies | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-danger">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Terms & Conditions | Dashboard | Brakebee</title>
      </Head>
      <TermsCore />
    </DashboardShell>
  );
}
