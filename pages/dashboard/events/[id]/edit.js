/**
 * Edit Event Page
 * /dashboard/events/[id]/edit
 * 
 * Uses the accordion-based EventForm component within DashboardShell.
 * Requires 'events' permission (promoter or admin).
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { EventForm } from '../../../../modules/events';
import { getCurrentUser } from '../../../../lib/users/api';

export default function EditEventPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        // Check for events permission (promoter or admin)
        const canEditEvents =
          data.permissions?.includes?.('events') ||
          data.user_type === 'promoter' ||
          data.user_type === 'admin';
        if (!canEditEvents) {
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

  if (loading || !id) {
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
        <title>Edit Event | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <button 
              onClick={() => router.push('/dashboard/events')}
              className="btn btn-secondary btn-sm"
            >
              <i className="fas fa-arrow-left"></i> Back to Events
            </button>
          </div>
          <h1>Edit Event</h1>
          <p className="page-description">
            Update your event details, dates, venue, and settings.
          </p>
        </div>
        <EventForm 
          userData={userData} 
          eventId={String(id)}
        />
      </DashboardShell>
    </>
  );
}
