/**
 * Faire Connector Page
 * Catalog > Addons > Faire Connector
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import FaireConnector from '../../../../modules/catalog/components/addons/FaireConnector';
import { getCurrentUser } from '../../../../lib/users/api';
import { isAdmin } from '../../../../lib/userUtils';
import ConnectorSubscriptionGate from '../../../../modules/catalog/components/ConnectorSubscriptionGate';
import { FAIRE_CONNECTOR_OPTS } from '../../../../modules/catalog/components/connectorSubscriptionConfig';

export default function FaireConnectorPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try { setUserData(await getCurrentUser()); }
      catch (err) { console.error(err); router.push('/login'); }
      finally { setLoading(false); }
    }
    loadUser();
  }, [router]);

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>;
  if (!userData) return null;

  return (
    <>
      <Head><title>Faire Connector | Catalog | Dashboard</title></Head>
      <DashboardShell userData={userData}>
        {isAdmin(userData) ? (
          <>
            <div className="page-header"><h1>Faire Connector</h1><p className="page-subtitle">Connect your Faire brand and manage wholesale listings</p></div>
            <FaireConnector userData={userData} />
          </>
        ) : (
          <ConnectorSubscriptionGate addonSlug="faire-connector" userData={userData} connectorOpts={FAIRE_CONNECTOR_OPTS}>
            <div className="page-header"><h1>Faire Connector</h1><p className="page-subtitle">Connect your Faire brand and manage wholesale listings</p></div>
            <FaireConnector userData={userData} />
          </ConnectorSubscriptionGate>
        )}
      </DashboardShell>
    </>
  );
}
