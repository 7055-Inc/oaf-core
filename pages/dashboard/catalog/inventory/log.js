/**
 * Inventory Log Page
 */
import Head from 'next/head';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { InventoryLog } from '../../../../modules/dashboard/components/catalog';

export default function InventoryLogPage() {
  return (
    <DashboardShell>
      <Head>
        <title>Inventory Log | Dashboard</title>
      </Head>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <h1>Inventory Log</h1>
        <InventoryLog />
      </div>
    </DashboardShell>
  );
}
