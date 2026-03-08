/**
 * Vendor Returns Page
 * Dashboard page for vendors to manage return requests
 */

import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { VendorReturns } from '../../../../modules/commerce';

export default function VendorReturnsPage() {
  return (
    <>
      <Head>
        <title>Returns | Dashboard</title>
      </Head>
      <DashboardShell>
        <VendorReturns />
      </DashboardShell>
    </>
  );
}
