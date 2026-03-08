/**
 * Find Events (Find New)
 * Searchable, sortable, filterable list of future events.
 * Shows an application-status flag per event (accepting, closed, jurying, etc.).
 * List rows expand to show full event detail cards for research and apply.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchBrowseEvents, fetchEventTypes } from '../../../lib/events';

/** Application status badge: label + CSS class for styling */
function getApplicationStatus(event) {
  if (!event.allow_applications) {
    return { label: 'No applications', className: 'badge badge-muted' };
  }
  const status = (event.application_status || 'not_accepting').toLowerCase();
  if (status === 'accepting') {
    return { label: 'Accepting applications', className: 'badge badge-success' };
  }
  if (status === 'jurying') {
    return { label: 'Jurying', className: 'badge badge-warning' };
  }
  if (status === 'not_accepting' || status === 'closed') {
    return { label: 'Applications closed', className: 'badge badge-muted' };
  }
  return { label: status.replace(/_/g, ' '), className: 'badge' };
}

const SORT_OPTIONS = [
  { value: 'start_date', label: 'Date (soonest first)' },
  { value: 'start_date_desc', label: 'Date (latest first)' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'title_desc', label: 'Title (Z–A)' },
  { value: 'event_type', label: 'Type (A–Z)' },
  { value: 'location', label: 'Location (city)' },
];

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(n) {
  return n != null && Number(n) > 0
    ? `$${parseFloat(n).toFixed(2)}`
    : null;
}

export default function FindEvents() {
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('start_date');
  const [filterTypeId, setFilterTypeId] = useState('');
  const [filterState, setFilterState] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsList, types] = await Promise.all([
        fetchBrowseEvents({ application_status: 'accepting' }),
        fetchEventTypes(),
      ]);
      setEvents(eventsList);
      setEventTypes(types || []);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueStates = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      if (e.venue_state) set.add(e.venue_state);
    });
    return Array.from(set).sort();
  }, [events]);

  const filteredAndSortedEvents = useMemo(() => {
    let list = [...events];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.venue_city && e.venue_city.toLowerCase().includes(q)) ||
          (e.venue_state && e.venue_state.toLowerCase().includes(q)) ||
          (e.venue_name && e.venue_name.toLowerCase().includes(q)) ||
          (e.event_type_name && e.event_type_name.toLowerCase().includes(q))
      );
    }
    if (filterTypeId) {
      list = list.filter((e) => String(e.event_type_id) === String(filterTypeId));
    }
    if (filterState) {
      list = list.filter((e) => e.venue_state === filterState);
    }

    const [field, desc] = sortBy.includes('_desc')
      ? [sortBy.replace('_desc', ''), true]
      : [sortBy, false];
    list.sort((a, b) => {
      let aVal, bVal;
      switch (field) {
        case 'start_date':
          aVal = a.start_date || '';
          bVal = b.start_date || '';
          return desc ? (bVal < aVal ? -1 : 1) : (aVal < bVal ? -1 : 1);
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          return (desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)) || 0;
        case 'event_type':
          aVal = (a.event_type_name || '').toLowerCase();
          bVal = (b.event_type_name || '').toLowerCase();
          return (desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)) || 0;
        case 'location':
          aVal = (a.venue_city || '').toLowerCase();
          bVal = (b.venue_city || '').toLowerCase();
          return (desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)) || 0;
        default:
          return 0;
      }
    });

    return list;
  }, [events, searchQuery, filterTypeId, filterState, sortBy]);

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="page-header">
        <h1 className="page-title">Find New Events</h1>
        <p>Loading events…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-header">
        <h1 className="page-title">Find New Events</h1>
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Find New Events</h1>
        <p className="page-description">
          Explore upcoming events. Each event shows whether it’s accepting applications, jurying, or closed. Search, filter, and expand rows to see details.
        </p>
      </div>

      <div className="form-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="form-panel-header">
          <span className="form-panel-title">Search & filter</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Search</span>
            <input
              type="search"
              placeholder="Title, venue, type, location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              aria-label="Search events"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              aria-label="Sort events"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Event type</span>
            <select
              value={filterTypeId}
              onChange={(e) => setFilterTypeId(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              aria-label="Filter by event type"
            >
              <option value="">All types</option>
              {eventTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>State</span>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              aria-label="Filter by state"
            >
              <option value="">All states</option>
              {uniqueStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#666' }}>
          Showing {filteredAndSortedEvents.length} event{filteredAndSortedEvents.length !== 1 ? 's' : ''}. Click a row to expand details.
        </p>
      </div>

      {filteredAndSortedEvents.length === 0 ? (
        <div className="form-panel" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ margin: 0, color: '#666' }}>
            No events match your search and filters. Try adjusting them or check back later for new opportunities.
          </p>
        </div>
      ) : (
        <div className="form-panel">
          <ul
            className="find-events-list"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              border: '1px solid rgba(5, 84, 116, 0.12)',
              borderRadius: 'var(--border-radius-md)',
              overflow: 'hidden',
            }}
          >
            {filteredAndSortedEvents.map((event) => {
              const isExpanded = expandedId === event.id;
              const location = [event.venue_city, event.venue_state].filter(Boolean).join(', ');
              const appFee = formatMoney(event.application_fee);
              const juryFee = formatMoney(event.jury_fee);
              const appStatus = getApplicationStatus(event);

              return (
                <li
                  key={event.id}
                  style={{
                    borderBottom: '1px solid rgba(5, 84, 116, 0.08)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(event.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: isExpanded ? 'rgba(5, 84, 116, 0.04)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '1rem',
                    }}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `Collapse ${event.title}` : `Expand ${event.title}`}
                  >
                    <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <strong style={{ color: 'var(--primary-color)' }}>{event.title}</strong>
                      <span style={{ marginLeft: '0.5rem' }}>
                        <span className={appStatus.className} style={{ marginRight: '0.5rem' }}>
                          {appStatus.label}
                        </span>
                        <span style={{ color: '#666' }}>
                          {event.event_type_name || 'Event'}
                          {location && ` · ${location}`}
                          {event.start_date && ` · ${formatDate(event.start_date)}`}
                        </span>
                      </span>
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        transition: 'transform 0.2s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      }}
                      aria-hidden
                    >
                      ▼
                    </span>
                  </button>

                  {isExpanded && (
                    <div
                      className="find-events-detail"
                      style={{
                        padding: '1rem 1.25rem 1.5rem',
                        background: 'rgba(5, 84, 116, 0.02)',
                        borderTop: '1px solid rgba(5, 84, 116, 0.08)',
                      }}
                    >
                      <p style={{ margin: '0 0 1rem' }}>
                        <span className={appStatus.className}>{appStatus.label}</span>
                      </p>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: '1rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Dates</span>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
                            {formatDate(event.start_date)} – {formatDate(event.end_date)}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Venue</span>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
                            {event.venue_name || '—'}
                            {location && `, ${location}`}
                          </p>
                        </div>
                        {event.application_deadline && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Application deadline</span>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>{formatDate(event.application_deadline)}</p>
                          </div>
                        )}
                        {(appFee || juryFee) && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Fees</span>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
                              {[appFee && `Application ${appFee}`, juryFee && `Jury ${juryFee}`].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </div>
                        )}
                      </div>
                      {event.short_description && (
                        <p style={{ margin: '0 0 1rem', fontSize: '0.9375rem', color: '#555', lineHeight: 1.5 }}>
                          {event.short_description}
                        </p>
                      )}
                      <Link href={`/events/${event.id}`} className="primary">
                        View event & apply
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
