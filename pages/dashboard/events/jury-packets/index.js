/**
 * Jury Packets Page
 * /dashboard/events/jury-packets
 *
 * Create, edit, and delete jury packets (artist application templates).
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { JuryPackets } from '../../../../modules/events';
import { getCurrentUser } from '../../../../lib/users/api';

export default function JuryPacketsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        setUserData(data);
      } catch (err) {
        console.error('Error loading user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Jury Packets | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <JuryPackets />
      </DashboardShell>
    </>
  );
}
