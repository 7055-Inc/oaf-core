'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';

/**
 * Users Section Index
 * Redirects to profile page by default
 */
export default function UsersIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile page
    router.replace('/dashboard/users/profile');
  }, [router]);

  return (
    <>
      <Head>
        <title>Users | Dashboard | Brakebee</title>
      </Head>
      <DashboardShell>
        <div className="dashboard-page">
          <p>Redirecting to profile...</p>
        </div>
      </DashboardShell>
    </>
  );
}
