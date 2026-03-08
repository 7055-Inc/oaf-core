/**
 * Etsy Connector Page
 * Catalog > Addons > Etsy Connector
 * Vendor-facing: Etsy Shop connection and product sync.
 * Uses ConnectorSubscriptionGate for tier/terms/card flow.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { getCurrentUser } from '../../../../lib/users/api';

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
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '12px', margin: '20px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔜</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#333' }}>Coming Soon</h2>
          <p style={{ color: '#666', maxWidth: '400px', margin: '0 auto' }}>
            The Etsy Connector is currently awaiting platform approval. It will be available shortly.
          </p>
        </div>
      </DashboardShell>
    </>
  );
}
