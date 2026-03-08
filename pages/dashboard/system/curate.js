import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { ProductCuration } from '../../../modules/catalog';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';

/**
 * Product Curation Page
 * 
 * Admin-only page for curating marketplace products:
 * - Sort products into Art or Crafts categories
 * - View curation statistics
 * - Track curation history
 * 
 * Route: /dashboard/system/curate
 */
export default function CuratePage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getCurrentUser();
        setUserData(data);
      } catch (err) {
        setError(err.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="error-alert">Error: {error}</div>
      </DashboardShell>
    );
  }

  // Admin check
  if (!checkIsAdmin(userData)) {
    return (
      <DashboardShell>
        <div className="error-alert">
          Access denied. This page is only available to administrators.
        </div>
      </DashboardShell>
    );
  }

  return (
    <>
      <Head>
        <title>Curate | Dashboard</title>
      </Head>
      <DashboardShell>
        <ProductCuration />
      </DashboardShell>
    </>
  );
}
