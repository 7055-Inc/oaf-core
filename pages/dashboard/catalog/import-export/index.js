/**
 * Catalog Import/Export Page
 * /dashboard/catalog/import-export
 * 
 * Bulk import/export of product catalog data via CSV/Excel.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { CatalogImportExport } from '../../../../modules/dashboard/components/catalog';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function CatalogImportExportPage() {
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

  return (
    <>
      <Head>
        <title>Upload/Download Catalog | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Upload/Download Catalog</h1>
          <p className="page-subtitle">Bulk import and export your product data</p>
        </div>
        <CatalogImportExport userData={userData} />
      </DashboardShell>
    </>
  );
}
