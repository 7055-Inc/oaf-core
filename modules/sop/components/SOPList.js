/**
 * SOP List Component
 * Displays list of SOPs with filtering and search
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSOP } from './SOPContext';

const STATUS_LABELS = {
  draft: { label: 'Draft', className: 'status-draft' },
  published: { label: 'Published', className: 'status-published' },
  archived: { label: 'Archived', className: 'status-archived' },
};

export default function SOPList({ folderId = null }) {
  const { sops, sopsLoading, loadSops, isTop } = useSOP();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load SOPs when filters change
  useEffect(() => {
    loadSops(folderId, {
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      limit: 100
    });
  }, [folderId, debouncedSearch, statusFilter, loadSops]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="sop-list">
      {/* Search and Filters */}
      <div className="sop-list-toolbar">
        <div className="sop-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search SOPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control"
          />
        </div>

        <div className="sop-filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-control"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {isTop && (
          <Link href={`/sop/new${folderId ? `?folder=${folderId}` : ''}`} className="btn btn-primary">
            <i className="fas fa-plus"></i>
            New SOP
          </Link>
        )}
      </div>

      {/* SOP Table */}
      {sopsLoading ? (
        <div className="sop-loading">
          <i className="fas fa-spinner fa-spin"></i>
          Loading SOPs...
        </div>
      ) : sops.length === 0 ? (
        <div className="sop-empty">
          <i className="fas fa-file-alt"></i>
          <p>No SOPs found</p>
          {isTop && (
            <Link href={`/sop/new${folderId ? `?folder=${folderId}` : ''}`} className="btn btn-outline">
              Create your first SOP
            </Link>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table sop-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sops.map(sop => {
                const status = STATUS_LABELS[sop.status] || STATUS_LABELS.draft;
                return (
                  <tr key={sop.id}>
                    <td>
                      <Link href={`/sop/${sop.id}`} className="sop-title-link">
                        {sop.title || 'Untitled SOP'}
                      </Link>
                    </td>
                    <td>
                      <span className={`sop-status ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>{sop.owner_role || '-'}</td>
                    <td>{formatDate(sop.updated_at)}</td>
                    <td>
                      <Link href={`/sop/${sop.id}`} className="btn btn-sm btn-outline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
