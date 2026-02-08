/**
 * Wayfair Connector Page
 * Catalog > Addons > Wayfair Connector
 * Vendor-facing: list products, add/manage Wayfair listings.
 * Requires wayfair-connector addon (or admin).
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { WayfairConnector } from '../../../../modules/catalog';
import { authApiRequest } from '../../../../lib/apiUtils';
import { hasAddon, isAdmin } from '../../../../lib/userUtils';

export default function WayfairConnectorPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Error loading user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const canAccess = isAdmin(userData) || hasAddon(userData, 'wayfair-connector');

  if (!canAccess) {
    return (
      <>
        <Head>
          <title>Wayfair Connector | Catalog | Dashboard</title>
        </Head>
        <DashboardShell userData={userData}>
          <div className="page-header">
            <h1>Wayfair Connector</h1>
            <p className="page-subtitle">List your products on Wayfair.com</p>
          </div>
          <div className="alert alert-warning">
            <strong>Addon required.</strong> Purchase the Wayfair Connector addon from your subscriptions to use this feature.
            <br />
            <a href="/dashboard/business/subscriptions" className="btn btn-primary" style={{ marginTop: '10px' }}>View subscriptions</a>
          </div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Wayfair Connector | Catalog | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Wayfair Connector</h1>
          <p className="page-subtitle">List your products on Wayfair.com through Brakebee&apos;s seller account</p>
        </div>
        <WayfairConnector userData={userData} />
      </DashboardShell>
    </>
  );
}
