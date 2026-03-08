/**
 * Admin All Applications
 * List all submitted applications over time with sort, search, filter.
 * Click row to open modal with full application content.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchAdminApplications, fetchAdminApplicationDetail } from '../../../lib/applications';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'declined', label: 'Declined' }
];

const SORT_OPTIONS = [
  { value: 'submitted_at', label: 'Submitted date' },
  { value: 'event_title', label: 'Event title' },
  { value: 'artist_name', label: 'Artist name' },
  { value: 'status', label: 'Status' },
  { value: 'id', label: 'ID' }
];

function DetailModal({ applicationId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    fetchAdminApplicationDetail(applicationId)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [applicationId]);

  if (!applicationId) return null;

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
  const formatCurrency = (n) => (n != null ? `$${parseFloat(n).toFixed(2)}` : '—');

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Application #{applicationId}</h3>
          <button type="button" onClick={onClose} className="btn btn-secondary" aria-label="Close">&times;</button>
        </div>
        {loading && <div className="loading-state">Loading...</div>}
        {error && <div className="error-alert">{error}</div>}
        {detail && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-card">
              <h4 style={{ margin: '0 0 10px 0' }}>Event</h4>
              <p style={{ margin: '4px 0' }}><strong>{detail.event_title}</strong></p>
              <p style={{ margin: '4px 0', color: '#666' }}>
                {formatDate(detail.event_start_date)} – {formatDate(detail.event_end_date)}
              </p>
              <p style={{ margin: '4px 0', color: '#666' }}>
                {[detail.event_venue_name, detail.event_venue_city, detail.event_venue_state].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            <div className="form-card">
              <h4 style={{ margin: '0 0 10px 0' }}>Artist</h4>
              <p style={{ margin: '4px 0' }}>
                {[detail.artist_first_name, detail.artist_last_name].filter(Boolean).join(' ') || '—'}
              </p>
              <p style={{ margin: '4px 0' }}>Email: {detail.artist_email || '—'}</p>
              <p style={{ margin: '4px 0' }}>Business: {detail.artist_business_name || '—'}</p>
              <p style={{ margin: '4px 0' }}>
                <span className={`status-badge status-${detail.status === 'confirmed' || detail.status === 'accepted' ? 'success' : detail.status === 'rejected' || detail.status === 'declined' ? 'danger' : detail.status === 'submitted' || detail.status === 'under_review' ? 'info' : 'warning'}`}>
                  {detail.status?.replace('_', ' ')}
                </span>
              </p>
            </div>
            <div className="form-card">
              <h4 style={{ margin: '0 0 10px 0' }}>Fees &amp; dates</h4>
              <p style={{ margin: '4px 0' }}>Submitted: {formatDate(detail.submitted_at || detail.applied_date)}</p>
              <p style={{ margin: '4px 0' }}>Booth fee: {formatCurrency(detail.booth_fee_amount)}</p>
              <p style={{ margin: '4px 0' }}>Application fee: {formatCurrency(detail.application_fee)}</p>
              <p style={{ margin: '4px 0' }}>Jury fee: {formatCurrency(detail.jury_fee)}</p>
              <p style={{ margin: '4px 0' }}>Total: {formatCurrency(detail.total_fees)}</p>
            </div>
            {detail.artist_statement && (
              <div className="form-card">
                <h4 style={{ margin: '0 0 10px 0' }}>Artist statement</h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{detail.artist_statement}</p>
              </div>
            )}
            {detail.jury_comments && (
              <div className="form-card">
                <h4 style={{ margin: '0 0 10px 0' }}>Jury comments</h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{detail.jury_comments}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminAllApplications() {
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('submitted_at');
  const [order, setOrder] = useState('desc');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminApplications({
        status: statusFilter,
        search: searchDebounced || undefined,
        sort,
        order,
        limit: 50,
        offset: 0
      });
      setList(result.data || []);
      setPagination(result.pagination || { total: 0, limit: 50, offset: 0 });
    } catch (err) {
      setError(err.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchDebounced, sort, order]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
  const formatCurrency = (n) => (n != null ? `$${parseFloat(n).toFixed(2)}` : '—');
  const getStatusClass = (status) => {
    if (status === 'confirmed' || status === 'accepted') return 'status-badge status-success';
    if (status === 'rejected' || status === 'declined') return 'status-badge status-danger';
    if (status === 'submitted' || status === 'under_review') return 'status-badge status-info';
    return 'status-badge status-warning';
  };

  return (
    <div className="section-box">
      <h2 style={{ margin: '0 0 1rem 0' }}>All Applications</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        <input
          type="search"
          placeholder="Search event, artist, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ width: '260px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-input"
          style={{ width: 'auto' }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="form-input"
          style={{ width: 'auto' }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="form-input"
          style={{ width: 'auto' }}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {error && <div className="error-alert">{error}</div>}
      {loading && <div className="loading-state">Loading applications...</div>}

      {!loading && list.length === 0 && (
        <div className="form-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ margin: 0 }}>No applications match your filters.</p>
        </div>
      )}

      {!loading && list.length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Event</th>
                  <th>Artist</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{row.id}</td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{row.event_title}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {formatDate(row.event_start_date)} – {formatDate(row.event_end_date)}
                      </div>
                    </td>
                    <td>
                      <div>{row.artist_name || row.artist_email || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{row.artist_email}</div>
                    </td>
                    <td>{formatDate(row.submitted_at)}</td>
                    <td><span className={getStatusClass(row.status)}>{row.status?.replace('_', ' ')}</span></td>
                    <td>{formatCurrency(row.total_fees)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', fontSize: '14px', color: '#666' }}>
            Showing {list.length} of {pagination.total} applications
          </div>
        </div>
      )}

      {selectedId && (
        <DetailModal applicationId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
