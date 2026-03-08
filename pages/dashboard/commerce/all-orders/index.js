/**
 * All Orders (Admin)
 * Admin-only page to view all orders site-wide.
 * Route: /dashboard/commerce/all-orders
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { AdminAllOrders } from '../../../../modules/commerce';

export default function AllOrdersPage() {
  return (
    <>
      <Head>
        <title>All Orders | Dashboard</title>
      </Head>
      <DashboardShell>
        <AdminAllOrders />
      </DashboardShell>
    </>
  );
}
