/**
 * Payouts & Earnings Page
 * Dashboard page for vendor financial overview
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { PayoutsEarnings } from '../../../../modules/finances';

export default function PayoutsEarningsPage() {
  return (
    <>
      <Head>
        <title>Payouts & Earnings | Dashboard</title>
      </Head>
      <DashboardShell>
        <PayoutsEarnings />
      </DashboardShell>
    </>
  );
}
