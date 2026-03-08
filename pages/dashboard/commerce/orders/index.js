/**
 * My Orders Page
 * Dashboard page for viewing customer's order history
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { MyOrders } from '../../../../modules/commerce';

export default function MyOrdersPage() {
  return (
    <>
      <Head>
        <title>My Orders | Dashboard</title>
      </Head>
      <DashboardShell>
        <MyOrders />
      </DashboardShell>
    </>
  );
}
