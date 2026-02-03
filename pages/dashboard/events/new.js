/**
 * Create New Event Page
 * /dashboard/events/new
 * 
 * Uses the accordion-based EventForm component within DashboardShell.
 * Requires 'events' permission (promoter or admin).
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { EventForm } from '../../../modules/events';
import { authApiRequest } from '../../../lib/apiUtils';

export default function NewEventPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { claimed_event_id, edit_event_id } = router.query;

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          
          // Check for events permission (promoter or admin)
          const canCreateEvents = 
            data.permissions?.includes?.('events') || 
            data.user_type === 'promoter' || 
            data.user_type === 'admin';
          
          if (!canCreateEvents) {
            // User doesn't have permission to create events
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
        <title>Create Event | Dashboard</title>
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
          <h1>{claimed_event_id ? 'Complete Event Details' : edit_event_id ? 'Edit Event' : 'Create Event'}</h1>
          <p className="page-description">
            Create an art show, festival, or event for artists to apply to.
          </p>
        </div>
        <EventForm 
          userData={userData} 
          eventId={edit_event_id ? String(edit_event_id) : null}
          claimedEventId={claimed_event_id || null}
        />
      </DashboardShell>
    </>
  );
}
