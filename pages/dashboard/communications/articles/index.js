/**
 * Articles & Blogs Page
 * Communications > Articles & Blogs
 * Sites permission or admin. Uses v2 API: /api/v2/content/articles/*
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { ArticlesManagement } from '../../../../modules/communications';
import { authApiRequest } from '../../../../lib/apiUtils';
import { hasPermission, isAdmin } from '../../../../lib/userUtils';

export default function ArticlesPage() {
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

  const canAccess = isAdmin(userData) || hasPermission(userData, 'sites');

  if (!canAccess) {
    return (
      <>
        <Head>
          <title>Articles & Blogs | Communications | Dashboard</title>
        </Head>
        <DashboardShell userData={userData}>
          <div className="page-header">
            <h1>Articles & Blogs</h1>
            <p className="page-subtitle">Manage articles and help content</p>
          </div>
          <div className="warning-alert">
            <strong>Access required.</strong> You need the Sites permission to manage articles and blogs.
          </div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Articles & Blogs | Communications | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Articles & Blogs</h1>
          <p className="page-subtitle">Create and manage articles, help content, and blog posts</p>
        </div>
        <ArticlesManagement userData={userData} />
      </DashboardShell>
    </>
  );
}
