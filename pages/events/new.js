/**
 * Legacy create/edit event URL: redirects to the new dashboard event form.
 * /events/new → /dashboard/events/new
 * Query params (claimed_event_id, edit_event_id) are preserved for deep links.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function EventsNewRedirect() {
  const router = useRouter();

  useEffect(() => {
    const query = new URLSearchParams();
    if (router.query.claimed_event_id) query.set('claimed_event_id', String(router.query.claimed_event_id));
    if (router.query.edit_event_id) query.set('edit_event_id', String(router.query.edit_event_id));
    const qs = query.toString();
    router.replace(`/dashboard/events/new${qs ? `?${qs}` : ''}`);
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting to Create Event…</p>
    </div>
  );
}
