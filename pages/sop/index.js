/**
 * SOP Index Page
 * Main entry point for SOP system
 */

import Head from 'next/head';
import { SOPLayout, SOPDashboard } from '../../modules/sop';

export default function SOPIndexPage() {
  return (
    <>
      <Head>
        <title>SOP Center | Standard Operating Procedures</title>
        <meta name="description" content="Standard Operating Procedures management system" />
      </Head>
      <SOPLayout>
        <SOPDashboard />
      </SOPLayout>
    </>
  );
}
