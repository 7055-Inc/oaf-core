/**
 * Wayfair Connector Page
 * Catalog > Addons > Wayfair Connector
 * Vendor-facing: list products, add/manage Wayfair listings.
 * Uses ConnectorSubscriptionGate for tier/terms/card flow.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { WayfairConnector } from '../../../../modules/catalog';
import { getCurrentUser } from '../../../../lib/users/api';
import { isAdmin } from '../../../../lib/userUtils';
import ConnectorSubscriptionGate from '../../../../modules/catalog/components/ConnectorSubscriptionGate';
import { WAYFAIR_CONNECTOR_OPTS } from '../../../../modules/catalog/components/connectorSubscriptionConfig';

export default function WayfairConnectorPage() {
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

  return (
    <>
      <Head>
        <title>Wayfair Connector | Catalog | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        {isAdmin(userData) ? (
          <>
            <div className="page-header">
              <h1>Wayfair Connector</h1>
              <p className="page-subtitle">List your products on Wayfair.com through Brakebee&apos;s supplier account</p>
            </div>
            <WayfairConnector userData={userData} />
          </>
        ) : (
          <ConnectorSubscriptionGate
            addonSlug="wayfair-connector"
            userData={userData}
            connectorOpts={WAYFAIR_CONNECTOR_OPTS}
          >
            <div className="page-header">
              <h1>Wayfair Connector</h1>
              <p className="page-subtitle">List your products on Wayfair.com through Brakebee&apos;s supplier account</p>
            </div>
            <WayfairConnector userData={userData} />
          </ConnectorSubscriptionGate>
        )}
      </DashboardShell>
    </>
  );
}
