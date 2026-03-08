/**
 * SOP View Component
 * Read-only display of an SOP document
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSOP } from './SOPContext';
import { fetchSop, fetchSopVersions } from '../../../lib/sop';

// Dynamic import for block renderer
const BlockRenderer = dynamic(
  () => import('../../shared/block-editor/BlockRenderer'),
  { ssr: false }
);

const STATUS_LABELS = {
  draft: { label: 'Draft', className: 'status-draft' },
  published: { label: 'Published', className: 'status-published' },
  archived: { label: 'Archived', className: 'status-archived' },
};

export default function SOPView({ sopId }) {
  const { isTop } = useSOP();
  const [sop, setSop] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    loadSop();
  }, [sopId]);

  const loadSop = async () => {
    setLoading(true);
    setError(null);
    try {
      const { sop: data, breadcrumb: bc } = await fetchSop(sopId);
      setSop(data);
      setBreadcrumb(bc || []);
    } catch (err) {
      setError('Failed to load SOP: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    if (versions.length > 0) {
      setShowVersions(!showVersions);
      return;
    }
    try {
      const versionList = await fetchSopVersions(sopId);
      setVersions(versionList);
      setShowVersions(true);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="sop-view-loading">
        <i className="fas fa-spinner fa-spin"></i>
        Loading SOP...
      </div>
    );
  }

  if (error) {
    return (
      <div className="sop-view-error">
        <i className="fas fa-exclamation-circle"></i>
        {error}
        <button className="btn btn-outline" onClick={loadSop}>Try Again</button>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="sop-view-error">
        <i className="fas fa-file-alt"></i>
        SOP not found
      </div>
    );
  }

  const status = STATUS_LABELS[sop.status] || STATUS_LABELS.draft;

  return (
    <div className="sop-view">
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <nav className="sop-breadcrumb">
          <Link href="/sop">SOPs</Link>
          {breadcrumb.map((item, idx) => (
            <React.Fragment key={item.id}>
              <span className="separator">/</span>
              <Link href={`/sop/folder/${item.id}`}>{item.title}</Link>
            </React.Fragment>
          ))}
          <span className="separator">/</span>
          <span className="current">{sop.title}</span>
        </nav>
      )}

      {/* Header */}
      <div className="sop-view-header">
        <div className="sop-view-title-row">
          <h1>{sop.title || 'Untitled SOP'}</h1>
          <span className={`sop-status ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="sop-view-meta">
          {sop.owner_role && (
            <span className="meta-item">
              <i className="fas fa-user"></i>
              {sop.owner_role}
            </span>
          )}
          <span className="meta-item">
            <i className="fas fa-clock"></i>
            Updated {formatDate(sop.updated_at)}
          </span>
        </div>

        <div className="sop-view-actions">
          {isTop && (
            <Link href={`/sop/${sop.id}/edit`} className="btn btn-primary">
              <i className="fas fa-edit"></i>
              Edit
            </Link>
          )}
          <button className="btn btn-outline" onClick={loadVersions}>
            <i className="fas fa-history"></i>
            {showVersions ? 'Hide History' : 'Version History'}
          </button>
        </div>
      </div>

      {/* Version History */}
      {showVersions && (
        <div className="sop-versions">
          <h3>Version History</h3>
          {versions.length === 0 ? (
            <p>No version history available.</p>
          ) : (
            <ul className="version-list">
              {versions.map(v => (
                <li key={v.id} className="version-item">
                  <span className="version-date">{formatDate(v.changed_at)}</span>
                  <span className="version-summary">{v.change_summary || 'No description'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Content Sections */}
      <div className="sop-view-content">
        {/* Purpose */}
        {sop.purpose_expected_outcome && (
          <section className="sop-section">
            <h2>Purpose & Expected Outcome</h2>
            <p>{sop.purpose_expected_outcome}</p>
          </section>
        )}

        {/* When to Use */}
        {(sop.when_to_use || sop.when_not_to_use) && (
          <section className="sop-section sop-when-grid">
            {sop.when_to_use && (
              <div className="sop-when-box sop-when-use">
                <h3><i className="fas fa-check-circle"></i> When to Use</h3>
                <p>{sop.when_to_use}</p>
              </div>
            )}
            {sop.when_not_to_use && (
              <div className="sop-when-box sop-when-not">
                <h3><i className="fas fa-times-circle"></i> When Not to Use</h3>
                <p>{sop.when_not_to_use}</p>
              </div>
            )}
          </section>
        )}

        {/* Standard Workflow */}
        {sop.standard_workflow && (
          <section className="sop-section">
            <h2>Standard Workflow</h2>
            <BlockRenderer content={sop.standard_workflow} />
          </section>
        )}

        {/* Exit Points */}
        {sop.exit_points && (
          <section className="sop-section">
            <h2>Exit Points</h2>
            <BlockRenderer content={sop.exit_points} />
          </section>
        )}

        {/* Escalation */}
        {sop.escalation && (
          <section className="sop-section">
            <h2>Escalation</h2>
            <BlockRenderer content={sop.escalation} />
          </section>
        )}

        {/* Transfer */}
        {sop.transfer && (
          <section className="sop-section">
            <h2>Transfer</h2>
            <BlockRenderer content={sop.transfer} />
          </section>
        )}

        {/* Additional Information */}
        {sop.additional_information && (
          <section className="sop-section">
            <h2>Additional Information</h2>
            <BlockRenderer content={sop.additional_information} />
          </section>
        )}
      </div>
    </div>
  );
}
