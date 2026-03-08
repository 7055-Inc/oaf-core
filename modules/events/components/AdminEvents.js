/**
 * AdminEvents Component
 * Admin view of all events with filtering and search
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchAllEvents } from '../../../lib/events';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchAllEvents({
        status: statusFilter,
        search: searchTerm,
        limit: pagination.limit,
        offset: pagination.offset
      });
      setEvents(result.data || []);
      setPagination(prev => ({ ...prev, total: result.pagination?.total || 0 }));
      setError(null);
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, pagination.limit, pagination.offset]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle search with debounce
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'status-badge status-success';
      case 'draft': return 'status-badge status-warning';
      case 'archived': return 'status-badge status-muted';
      case 'published': return 'status-badge status-success';
      default: return 'status-badge';
    }
  };

  // Pagination handlers
  const handlePrevPage = () => {
    setPagination(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit)
    }));
  };

  const handleNextPage = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: '1', minWidth: '200px', marginBottom: 0 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search events..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
          <select 
            className="form-control"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, offset: 0 }));
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <Link href="/dashboard/events/new" className="btn btn-primary">
          <i className="fas fa-plus"></i> Create Event
        </Link>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary-color)' }}></i>
          <span>Loading events...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="error-alert">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && events.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-calendar-alt" style={{ fontSize: '48px', color: '#ccc', marginBottom: '1rem' }}></i>
          <h3>No Events Found</h3>
          <p>No events match your current filters.</p>
        </div>
      )}

      {/* Events Table */}
      {!loading && events.length > 0 && (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Event</th>
                  <th>Promoter</th>
                  <th>Dates</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{event.id}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{event.title || 'Untitled'}</div>
                      {event.event_type_name && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{event.event_type_name}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px' }}>{event.promoter_email || '—'}</span>
                    </td>
                    <td>
                      <div>{formatDate(event.start_date)}</div>
                      {event.end_date && event.end_date !== event.start_date && (
                        <div style={{ fontSize: '12px', color: '#666' }}>to {formatDate(event.end_date)}</div>
                      )}
                    </td>
                    <td>
                      {event.venue_city && event.venue_state ? (
                        <span>{event.venue_city}, {event.venue_state}</span>
                      ) : (
                        <span style={{ color: '#999' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={getStatusClass(event.event_status)}>
                        {event.event_status || 'draft'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link 
                          href={`/events/${event.id}`}
                          className="btn btn-sm btn-secondary"
                          title="View"
                        >
                          <i className="fas fa-eye"></i>
                        </Link>
                        <Link 
                          href={`/dashboard/events/${event.id}/edit`}
                          className="btn btn-sm btn-secondary"
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <div style={{ color: '#666', fontSize: '14px' }}>
                Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0}
                >
                  <i className="fas fa-chevron-left"></i> Previous
                </button>
                <span style={{ padding: '0.5rem 1rem', color: '#666' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={handleNextPage}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
