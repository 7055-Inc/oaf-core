/**
 * Solicit Promoter Page (admin only)
 * /dashboard/events/solicit-promoter
 *
 * Create draft promoter + event and send claim email. Promoter claims via /promoters/claim/[token].
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { AddPromoter } from '../../../modules/marketing';
import { authApiRequest } from '../../../lib/apiUtils';

export default function SolicitPromoterPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          if (data.user_type !== 'admin') {
            router.push('/dashboard');
            return;
          }
          setUserData(data);
        } else {
          router.push('/login');
        }
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
        <div className="spinner"></div>
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
        <title>Solicit Promoter | Events | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Solicit Promoter</h1>
          <p className="page-description">
            Create a draft promoter and event, then send a claim link so they can activate their account and claim the event.
          </p>
        </div>
        <AddPromoter />
      </DashboardShell>
    </>
  );
}
