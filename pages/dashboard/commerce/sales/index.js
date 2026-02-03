/**
 * My Sales Page
 * Dashboard page for vendors to manage incoming orders
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { MySales } from '../../../../modules/commerce';

export default function MySalesPage() {
  return (
    <>
      <Head>
        <title>My Sales | Dashboard</title>
      </Head>
      <DashboardShell>
        <MySales />
      </DashboardShell>
    </>
  );
}
