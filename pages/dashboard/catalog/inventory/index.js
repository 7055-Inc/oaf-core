/**
 * Inventory Management Page
 */
import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { InventoryManager } from '../../../../modules/dashboard/components/catalog';

export default function InventoryPage() {
  return (
    <DashboardShell>
      <Head>
        <title>Manage Inventory | Dashboard</title>
      </Head>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <h1>Manage Inventory</h1>
        <InventoryManager />
      </div>
    </DashboardShell>
  );
}
