/**
 * Websites > All Sites (admin) – System-wide site list.
 * Admin only; no subscription gate.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { AllSites } from '../../../modules/websites';
import { authApiRequest } from '../../../lib/apiUtils';

export default function WebsitesAdminPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (!response.ok) {
          router.push('/login');
          return;
        }
        setUserData(await response.json());
      } catch (err) {
        console.error('Error loading:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }
  if (!userData) return null;

  const isAdmin = userData?.user_type === 'admin';
  if (!isAdmin) {
    return (
      <>
        <Head><title>All Sites | Websites | Dashboard</title></Head>
        <DashboardShell userData={userData}>
          <div className="page-header"><h1>All Sites</h1></div>
          <div className="warning-alert">Admin access required.</div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head><title>All Sites | Websites | Dashboard</title></Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>All Sites</h1>
          <p className="page-subtitle">System-wide website list. Visit or manage any site.</p>
        </div>
        <AllSites userData={userData} />
      </DashboardShell>
    </>
  );
}
