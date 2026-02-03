/**
 * Category Management Page
 * /dashboard/catalog/categories
 * 
 * Admin-only page for managing product categories.
 * Handles hierarchical categories, content, SEO, and product associations.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { CategoryManagement } from '../../../../modules/catalog';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function CategoriesPage() {
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
          
          // Check if user is admin
          const isAdmin = data.user_type === 'admin' || data.roles?.includes('admin');
          const hasPermission = data.permissions?.includes('manage_system');
          if (!isAdmin && !hasPermission) {
            router.push('/dashboard');
          }
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
        <title>Category Management | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Category Management</h1>
          <p className="page-subtitle">Manage product categories, content, SEO, and product associations</p>
        </div>
        <CategoryManagement />
      </DashboardShell>
    </>
  );
}
