/**
 * TikTok Connector Admin Page
 * Catalog > Addons > TikTok Connector Admin
 * Admin-only: review and manage products for the Brakebee TikTok feed.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { TikTokConnectorAdmin } from '../../../../modules/catalog';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function TikTokConnectorAdminPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          if (data.user_type !== 'admin') {
            router.push('/dashboard/catalog');
            return;
          }
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

  return (
    <>
      <Head>
        <title>TikTok Feed Admin | Catalog | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>TikTok Connector Admin</h1>
          <p className="page-subtitle">Review and manage products for the Brakebee TikTok feed</p>
        </div>
        <TikTokConnectorAdmin userData={userData} />
      </DashboardShell>
    </>
  );
}
