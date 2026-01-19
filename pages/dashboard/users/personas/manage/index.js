import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../../../modules/dashboard/components/layout/DashboardShell';
import { PersonaManagement } from '../../../../../modules/dashboard/components/users';
import { getCurrentUser } from '../../../../../lib/users';

/**
 * All Personas Management Page
 * Admin-only page for viewing/managing all personas system-wide
 */
export default function PersonaManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const user = await getCurrentUser();
      
      // Only admins can access this page
      if (user.user_type !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

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
        <div className="error-alert">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <>
      <Head>
        <title>All Personas | Dashboard | Brakebee</title>
      </Head>
      <DashboardShell>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>All Artist Personas</h1>
            <p className="form-hint">
              Manage all artist personas across the platform.
            </p>
          </div>
          <div className="dashboard-page-content">
            <PersonaManagement />
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
