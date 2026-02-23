/**
 * My Applications Page
 * /dashboard/events/applications
 * 
 * Shows events the artist has applied to with status and actions.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { MyApplications } from '../../../../modules/events';
import { getCurrentUser } from '../../../../lib/users/api';

export default function MyApplicationsPage() {
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
        <title>My Applications | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>My Applications</h1>
          <p className="page-description">
            Track your event applications and their status.
          </p>
        </div>
        <MyApplications userData={userData} />
      </DashboardShell>
    </>
  );
}
