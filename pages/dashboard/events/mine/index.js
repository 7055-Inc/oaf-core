/**
 * My Events Page
 * /dashboard/events/mine
 * 
 * Shows events created by the user (for promoters) or events applied to (for artists).
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { MyEvents } from '../../../../modules/events';
import { getCurrentUser } from '../../../../lib/users/api';

export default function MyEventsPage() {
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
        <title>My Events | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>My Events</h1>
          <p className="page-description">
            {(userData?.permissions?.includes?.('events') || userData?.user_type === 'promoter' || userData?.user_type === 'admin')
              ? 'Manage your art shows, festivals, and events.'
              : 'View events you have applied to.'}
          </p>
        </div>
        <MyEvents userData={userData} />
      </DashboardShell>
    </>
  );
}
