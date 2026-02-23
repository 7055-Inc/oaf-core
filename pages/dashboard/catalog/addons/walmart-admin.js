/**
 * Walmart Connector Admin Page
 * Catalog > Addons > Walmart Connector Admin
 * Admin-only: review and manage products for the Brakebee Walmart feed.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { WalmartConnectorAdmin } from '../../../../modules/catalog';
import { getCurrentUser } from '../../../../lib/users/api';

export default function WalmartConnectorAdminPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        if (data.user_type !== 'admin') {
          router.push('/dashboard/catalog');
          return;
        }
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
        <title>Walmart Feed Admin | Catalog | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Walmart Connector Admin</h1>
          <p className="page-subtitle">Review and manage products for the Brakebee Walmart feed</p>
        </div>
        <WalmartConnectorAdmin userData={userData} />
      </DashboardShell>
    </>
  );
}
