/**
 * My Tickets Component
 * User's support ticket list with filters
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchTickets } from '../../../lib/communications';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#059669' },
  awaiting_customer: { label: 'Awaiting Your Reply', color: '#d97706' },
  awaiting_support: { label: 'Awaiting Support', color: '#2563eb' },
  escalated: { label: 'Escalated', color: '#dc2626' },
  resolved: { label: 'Resolved', color: '#6b7280' },
  closed: { label: 'Closed', color: '#374151' },
};

const TYPE_LABELS = {
  general: 'General',
  return: 'Return/Refund',
  order: 'Order Issue',
  account: 'Account',
  technical: 'Technical',
  selling: 'Selling',
  events: 'Events',
  feedback: 'Feedback',
  other: 'Other',
};

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTickets({ status: filter });
      setTickets(result.tickets || []);
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const statusFilters = ['all', 'open', 'awaiting_customer', 'awaiting_support', 'resolved', 'closed'];

  return (
    <div>
      {/* Header with Create Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="tab-container" style={{ margin: 0 }}>
          {statusFilters.map(status => (
            <button
              key={status}
              className={`tab-button ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
            </button>
          ))}
        </div>
        <Link href="/help/contact" className="primary">
          <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
          New Ticket
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading tickets...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="error-alert">{error}</div>
      )}

      {/* Empty State */}
      {!loading && !error && tickets.length === 0 && (
        <div className="empty-state">
          <i className="fa-solid fa-ticket"></i>
          <p>
            {filter === 'all'
              ? "You haven't submitted any support tickets yet."
              : `No tickets with "${STATUS_CONFIG[filter]?.label || filter}" status.`
            }
          </p>
          <Link href="/help/contact" className="primary">
            Submit a Ticket
          </Link>
        </div>
      )}

      {/* Tickets List */}
      {!loading && !error && tickets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tickets.map(ticket => (
            <Link 
              key={ticket.id}
              href={`/dashboard/communications/tickets/${ticket.id}`}
              className="card"
              style={{ 
                textDecoration: 'none', 
                display: 'block',
                borderLeft: `4px solid ${STATUS_CONFIG[ticket.status]?.color || '#6b7280'}`,
                transition: 'box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '12px', color: '#6b7280' }}>{ticket.ticket_number}</code>
                    <span className={`status-badge ${
                      ticket.status === 'open' || ticket.status === 'awaiting_support' ? 'success' :
                      ticket.status === 'awaiting_customer' ? 'warning' :
                      ticket.status === 'escalated' ? 'danger' : 'muted'
                    }`}>
                      {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                    </span>
                    <span className="status-badge muted">
                      {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#111' }}>
                    {ticket.subject}
                  </h4>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Created {formatDate(ticket.created_at)}
                    {ticket.message_count > 1 && ` • ${ticket.message_count} messages`}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  <div>{getTimeAgo(ticket.last_message_at || ticket.updated_at)}</div>
                  <i className="fas fa-chevron-right" style={{ marginTop: '8px', opacity: 0.5 }}></i>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Help Center Link */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <Link href="/help" style={{ color: '#6b7280', fontSize: '14px' }}>
          <i className="fas fa-question-circle" style={{ marginRight: '6px' }}></i>
          Visit Help Center for FAQs and guides
        </Link>
      </div>
    </div>
  );
}
