/**
 * Admin Events Page
 * /dashboard/events/admin
 * 
 * Admin view of all events with filtering, search, and management.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { AdminEvents } from '../../../../modules/events';
import { getCurrentUser } from '../../../../lib/users/api';

export default function AdminEventsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        
        if (data.user_type !== 'admin') {
          router.push('/dashboard');
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
        <title>All Events | Admin Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>All Events</h1>
          <p className="page-description">
            Manage all events across the platform.
          </p>
        </div>
        <AdminEvents />
      </DashboardShell>
    </>
  );
}
