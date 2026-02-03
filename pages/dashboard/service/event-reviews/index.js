/**
 * Admin Event Review Page
 * /dashboard/service/event-reviews
 *
 * All event reviews and flag management (admin only).
 * Replaces old dashboard slide-in "Event Reviews".
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import AdminEventReviews from '../../../../components/dashboard/admin/AdminEventReviews';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AdminEventReviewsPage() {
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
            router.push('/dashboard');
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
        <title>Admin Event Review | Service | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Admin Event Review</h1>
          <p className="page-description">
            All event reviews and flag management. Approve, reject, or add reviews.
          </p>
        </div>
        <AdminEventReviews />
      </DashboardShell>
    </>
  );
}
