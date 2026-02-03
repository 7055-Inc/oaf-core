/**
 * Events I Own Page
 * /dashboard/events/own
 *
 * Promoter's owned events: current (draft + active) and archived tabs,
 * with review links and edit/view/delete. Replaces old dashboard slide-in.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { EventsIOwn } from '../../../../modules/events';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function EventsIOwnPage() {
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

  if (!userData) {
    return null;
  }

  const isPromoter = userData?.permissions?.includes?.('events') || userData?.user_type === 'promoter' || userData?.user_type === 'admin';
  if (!isPromoter) {
    router.replace('/dashboard/events/mine');
    return null;
  }

  const handleEdit = (eventId) => {
    router.push(`/dashboard/events/${eventId}/edit`);
  };

  return (
    <>
      <Head>
        <title>Events I Own | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Events I Own</h1>
          <p className="page-description">
            Manage your current and archived events. View applications, copy artist review links, and edit or renew events.
          </p>
        </div>
        <EventsIOwn userData={userData} onEdit={handleEdit} />
      </DashboardShell>
    </>
  );
}
