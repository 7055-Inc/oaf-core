/**
 * My Applicants Page
 * /dashboard/commerce/applicants
 *
 * Promoter view: manage applications received for their events.
 * Under Business Center.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { MyApplicants } from '../../../../modules/commerce';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function MyApplicantsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
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

  const isPromoter = userData?.permissions?.includes?.('events') || userData?.user_type === 'promoter' || userData?.user_type === 'admin';
  if (!isPromoter) {
    router.replace('/dashboard/commerce');
    return null;
  }

  return (
    <>
      <Head>
        <title>My Applicants | Business Center</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>My Applicants</h1>
          <p className="page-description">
            Manage applications received for your events. Review, accept, waitlist, or reject; track payments for accepted applicants.
          </p>
        </div>
        <MyApplicants userData={userData} />
      </DashboardShell>
    </>
  );
}
