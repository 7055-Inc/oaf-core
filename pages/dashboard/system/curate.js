import { useState, useEffect } from 'react';
import Head from 'next/head';
import { authApiRequest } from '../../../lib/apiUtils';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { ProductCuration } from '../../../modules/catalog';

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
        const response = await authApiRequest('api/v2/auth/me');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Check if user has admin role
            const isAdmin = result.data.roles?.includes('admin') || false;
            setUserData({ ...result.data, isAdmin });
          } else {
            setError('Failed to load user data');
          }
        } else {
          setError('Failed to load user data');
        }
      } catch (err) {
        setError(err.message);
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
  if (!userData?.isAdmin) {
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
