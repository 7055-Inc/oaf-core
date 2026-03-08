/**
 * Unclaimed Events Page
 * Admin page for monitoring events pending promoter claim
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { UnclaimedEvents } from '../../../modules/events/components';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';

export default function UnclaimedEventsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getCurrentUser();
        setUserData(data);
        if (!checkIsAdmin(data)) {
          router.push('/dashboard');
        }
      } catch (err) {
        setError(err.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="alert alert-danger">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <Head>
        <title>Unclaimed Events | Dashboard | Brakebee</title>
      </Head>

      <div className="page-header">
        <h1>Unclaimed Events</h1>
      </div>

      <UnclaimedEvents />
    </DashboardShell>
  );
}
