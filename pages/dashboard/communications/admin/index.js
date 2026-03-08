/**
 * Admin Tickets Page
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { AdminTickets } from '../../../../modules/communications';

export default function AdminTicketsPage() {
  return (
    <>
      <Head>
        <title>All Tickets | Dashboard</title>
      </Head>
      <DashboardShell>
        <AdminTickets />
      </DashboardShell>
    </>
  );
}
