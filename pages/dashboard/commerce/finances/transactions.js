/**
 * Transaction History Page
 * Dashboard page for detailed transaction history
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { TransactionHistory } from '../../../../modules/finances';

export default function TransactionHistoryPage() {
  return (
    <>
      <Head>
        <title>Transaction History | Dashboard</title>
      </Head>
      <DashboardShell>
        <TransactionHistory />
      </DashboardShell>
    </>
  );
}
