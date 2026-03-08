/**
 * My Tickets Page
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { MyTickets } from '../../../../modules/communications';

export default function TicketsPage() {
  return (
    <>
      <Head>
        <title>My Tickets | Dashboard</title>
      </Head>
      <DashboardShell>
        <MyTickets />
      </DashboardShell>
    </>
  );
}
