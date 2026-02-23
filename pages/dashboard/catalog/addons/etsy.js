/**
 * Etsy Connector Page
 * Catalog > Addons > Etsy Connector
 * Vendor-facing: Etsy Shop connection and product sync.
 * Requires etsy-connector addon (or admin).
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { EtsyConnector } from '../../../../modules/catalog';
import { getCurrentUser } from '../../../../lib/users/api';
import { hasAddon, isAdmin } from '../../../../lib/userUtils';

export default function EtsyConnectorPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        setUserData(data);
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

  const canAccess = isAdmin(userData) || hasAddon(userData, 'etsy-connector');

  if (!canAccess) {
    return (
      <>
        <Head>
          <title>Etsy Connector | Catalog | Dashboard</title>
        </Head>
        <DashboardShell userData={userData}>
          <div className="page-header">
            <h1>Etsy Connector</h1>
            <p className="page-subtitle">Sell your products on Etsy</p>
          </div>
          <div className="alert alert-warning">
            <strong>Addon required.</strong> Purchase the Etsy Connector addon from your subscriptions to use this feature.
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
        <title>Etsy Connector | Catalog | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Etsy Connector</h1>
          <p className="page-subtitle">Connect your Etsy shop and manage product listings</p>
        </div>
        <EtsyConnector userData={userData} />
      </DashboardShell>
    </>
  );
}
