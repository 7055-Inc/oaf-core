/**
 * Shipping Hub Page
 * Dashboard page for shipping labels and subscription management
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { ShippingHub } from '../../../../modules/commerce';

export default function ShippingPage() {
  return (
    <>
      <Head>
        <title>Shipping | Dashboard</title>
      </Head>
      <DashboardShell>
        <ShippingHub />
      </DashboardShell>
    </>
  );
}
