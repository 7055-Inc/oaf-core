/**
 * SOP Dashboard Component
 * Main entry point for SOP module
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSOP } from './SOPContext';
import SOPFolderTree from './SOPFolderTree';
import SOPList from './SOPList';

export default function SOPDashboard({ folderId = null }) {
  const { 
    sopUser, 
    isLoading, 
    authError, 
    isTop, 
    loadFolders,
    foldersFlat
  } = useSOP();

  useEffect(() => {
    if (sopUser) {
      loadFolders();
    }
  }, [sopUser, loadFolders]);

  // Loading state
  if (isLoading) {
    return (
      <div className="sop-auth-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Checking SOP access...</p>
      </div>
    );
  }

  // Auth error states
  if (authError) {
    if (authError.code === 'NO_TOKEN') {
      return (
        <div className="sop-auth-required">
          <i className="fas fa-lock"></i>
          <h2>Sign In Required</h2>
          <p>Please sign in to access the SOP system.</p>
          <Link href="/signin" className="btn btn-primary">
            Sign In with Brakebee
          </Link>
        </div>
      );
    }

    if (authError.code === 'NOT_ENROLLED') {
      return (
        <div className="sop-not-enrolled">
          <i className="fas fa-user-slash"></i>
          <h2>Access Not Granted</h2>
          <p>You are not enrolled in the SOP system. Contact an administrator for access.</p>
          <Link href="/dashboard" className="btn btn-outline">
            Return to Dashboard
          </Link>
        </div>
      );
    }

    return (
      <div className="sop-auth-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h2>Authentication Error</h2>
        <p>{authError.message}</p>
        <Link href="/signin" className="btn btn-primary">
          Sign In Again
        </Link>
      </div>
    );
  }

  // Get current folder info
  const currentFolder = folderId 
    ? foldersFlat.find(f => f.id === parseInt(folderId, 10))
    : null;

  return (
    <div className="sop-dashboard">
      {/* Header */}
      <div className="sop-dashboard-header">
        <div className="sop-dashboard-title">
          <h1>
            {currentFolder ? currentFolder.title : 'Standard Operating Procedures'}
          </h1>
          {sopUser && (
            <span className="user-badge">
              {isTop ? 'Admin' : 'Viewer'}
            </span>
          )}
        </div>

        {isTop && (
          <div className="sop-dashboard-actions">
            <Link href="/sop/users" className="btn btn-outline">
              <i className="fas fa-users"></i>
              Manage Users
            </Link>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="sop-dashboard-layout">
        {/* Sidebar - Folder Tree */}
        <aside className="sop-sidebar">
          <SOPFolderTree currentFolderId={folderId ? parseInt(folderId, 10) : null} />
        </aside>

        {/* Main Content - SOP List */}
        <main className="sop-main">
          <SOPList folderId={folderId ? parseInt(folderId, 10) : null} />
        </main>
      </div>
    </div>
  );
}
