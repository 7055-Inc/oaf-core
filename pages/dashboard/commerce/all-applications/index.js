/**
 * All Applications (Admin)
 * /dashboard/commerce/all-applications
 *
 * Admin-only: list all submitted applications with sort, search, filter;
 * click row to open modal with full content.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { AdminAllApplications } from '../../../../modules/commerce';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AllApplicationsPage() {
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

  if (!userData) return null;

  const isAdmin = userData?.user_type === 'admin';
  if (!isAdmin) {
    router.replace('/dashboard/commerce');
    return null;
  }

  return (
    <>
      <Head>
        <title>All Applications | Business Center</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>All Applications</h1>
          <p className="page-description">
            View all submitted event applications. Search, filter by status, sort by date or name. Click a row to open full application details.
          </p>
        </div>
        <AdminAllApplications />
      </DashboardShell>
    </>
  );
}
