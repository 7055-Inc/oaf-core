/**
 * Unclaimed Events Page
 * Admin page for monitoring events pending promoter claim
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authApiRequest } from '../../../lib/apiUtils';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { UnclaimedEvents } from '../../../modules/events/components';

export default function UnclaimedEventsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await authApiRequest('api/v2/auth/me');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setUserData(result.data);
            
            // Check if user is admin or has manage_system permission
            const isAdmin = result.data.user_type === 'admin' || result.data.roles?.includes('admin');
            const hasPermission = result.data.permissions?.includes('manage_system');
            
            if (!isAdmin && !hasPermission) {
              router.push('/dashboard');
            }
          } else {
            setError('Failed to load user data');
          }
        } else {
          setError('Failed to load user data');
        }
      } catch (err) {
        setError(err.message);
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
