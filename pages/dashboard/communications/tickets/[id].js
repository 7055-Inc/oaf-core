/**
 * Ticket Detail Page
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { TicketDetail } from '../../../../modules/communications';

export default function TicketDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <>
      <Head>
        <title>Ticket Details | Dashboard</title>
      </Head>
      <DashboardShell>
        <TicketDetail ticketId={id} />
      </DashboardShell>
    </>
  );
}
