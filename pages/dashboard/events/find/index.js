/**
 * Find New Events
 * Searchable, sortable, filterable list of events accepting artist applications.
 * Route: /dashboard/events/find
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { FindEvents } from '../../../../modules/events';

export default function FindEventsPage() {
  return (
    <>
      <Head>
        <title>Find New Events | Dashboard</title>
      </Head>
      <DashboardShell>
        <FindEvents />
      </DashboardShell>
    </>
  );
}
