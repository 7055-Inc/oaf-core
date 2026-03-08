/**
 * Admin Tickets Component
 * Admin ticket management with filters and detail view
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchAllTickets, 
  fetchAdminTicket, 
  addAdminMessage, 
  updateTicket 
} from '../../../lib/communications';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#059669', bg: '#d1fae5' },
  awaiting_customer: { label: 'Awaiting Customer', color: '#d97706', bg: '#fef3c7' },
  awaiting_support: { label: 'Awaiting Support', color: '#2563eb', bg: '#dbeafe' },
  escalated: { label: 'Escalated', color: '#dc2626', bg: '#fee2e2' },
  resolved: { label: 'Resolved', color: '#6b7280', bg: '#f3f4f6' },
  closed: { label: 'Closed', color: '#374151', bg: '#f9fafb' },
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

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#6b7280' },
  normal: { label: 'Normal', color: '#2563eb' },
  high: { label: 'High', color: '#d97706' },
  urgent: { label: 'Urgent', color: '#dc2626' },
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [filter, setFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detail view
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllTickets({
        status: filter,
        ticket_type: typeFilter,
        search: searchTerm
      });
      setTickets(result.tickets || []);
      setStatusCounts(result.status_counts || {});
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter, searchTerm]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadTicketDetail = async (ticketId) => {
    try {
      const result = await fetchAdminTicket(ticketId);
      setSelectedTicket(result.ticket);
      setTicketMessages(result.messages || []);
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError(err.message);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || submitting) return;

    setSubmitting(true);
    try {
      await addAdminMessage(selectedTicket.id, newMessage.trim(), isInternal);
      setNewMessage('');
      setIsInternal(false);
      await loadTicketDetail(selectedTicket.id);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      await updateTicket(ticketId, updates);
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        await loadTicketDetail(ticketId);
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
      setError(err.message);
    }
  };

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

  // Detail View
  if (selectedTicket) {
    return (
      <div>
        {/* Back Button */}
        <button className="secondary small" onClick={() => setSelectedTicket(null)} style={{ marginBottom: '20px' }}>
          ← Back to Tickets
        </button>

        {/* Ticket Header */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <code style={{ fontSize: '13px', color: '#6b7280' }}>{selectedTicket.ticket_number}</code>
                <span style={{
                  padding: '4px 10px',
                  background: STATUS_CONFIG[selectedTicket.status]?.bg,
                  color: STATUS_CONFIG[selectedTicket.status]?.color,
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '4px'
                }}>
                  {STATUS_CONFIG[selectedTicket.status]?.label}
                </span>
                <span style={{
                  padding: '4px 10px',
                  background: '#f3f4f6',
                  color: PRIORITY_CONFIG[selectedTicket.priority]?.color,
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '4px'
                }}>
                  {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                </span>
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{selectedTicket.subject}</h2>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                <strong>From:</strong> {selectedTicket.contact_name || 'Unknown'} ({selectedTicket.contact_email})
                <br />
                <strong>Type:</strong> {TYPE_LABELS[selectedTicket.ticket_type] || selectedTicket.ticket_type}
                <br />
                <strong>Created:</strong> {formatDate(selectedTicket.created_at)}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                value={selectedTicket.status}
                onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                style={{ width: 'auto' }}
              >
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <select
                className="form-select"
                value={selectedTicket.priority}
                onChange={(e) => handleUpdateTicket(selectedTicket.id, { priority: e.target.value })}
                style={{ width: 'auto' }}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Conversation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {ticketMessages.map((msg, index) => {
              const isCustomer = msg.sender_type === 'customer' || msg.sender_type === 'guest';
              const isInternalNote = msg.is_internal;
              
              return (
                <div
                  key={msg.id || index}
                  style={{
                    padding: '12px 16px',
                    background: isInternalNote ? '#fef3c7' : (isCustomer ? '#f9fafb' : '#eff6ff'),
                    borderRadius: '8px',
                    borderLeft: `4px solid ${isInternalNote ? '#d97706' : (isCustomer ? '#9ca3af' : '#3b82f6')}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '13px', color: '#6b7280' }}>
                    <span style={{ fontWeight: '600', color: isInternalNote ? '#92400e' : (isCustomer ? '#374151' : '#1d4ed8') }}>
                      {isInternalNote ? '🔒 Internal Note' : (isCustomer ? (msg.sender_name || 'Customer') : 'Support Team')}
                    </span>
                    <span>{formatDate(msg.created_at)}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '14px' }}>
                    {msg.message_text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reply Form */}
        {selectedTicket.status !== 'closed' && (
          <div className="card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Reply</h3>
            <form onSubmit={handleSendMessage}>
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    Internal note (not visible to customer)
                  </span>
                </label>
                <button type="submit" className="primary" disabled={submitting || !newMessage.trim()}>
                  {submitting ? 'Sending...' : (isInternal ? 'Add Note' : 'Send Reply')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div>
      {/* Stats Overview */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', padding: '16px' }} onClick={() => setFilter('open')}>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#059669' }}>
            {(statusCounts.open || 0) + (statusCounts.awaiting_support || 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Needs Response</div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', padding: '16px' }} onClick={() => setFilter('awaiting_customer')}>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#d97706' }}>{statusCounts.awaiting_customer || 0}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Awaiting Customer</div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', padding: '16px' }} onClick={() => setFilter('escalated')}>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#dc2626' }}>{statusCounts.escalated || 0}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Escalated</div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', padding: '16px' }} onClick={() => setFilter('resolved')}>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#6b7280' }}>{statusCounts.resolved || 0}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Resolved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Status</label>
            <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Type</label>
            <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Search</label>
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ticket #, subject, email..."
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading tickets...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && tickets.length === 0 && (
        <div className="empty-state">
          <i className="fa-solid fa-ticket"></i>
          <p>{filter === 'all' ? 'No support tickets yet.' : `No tickets with "${STATUS_CONFIG[filter]?.label || filter}" status.`}</p>
        </div>
      )}

      {/* Tickets List */}
      {!loading && tickets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tickets.map(ticket => (
            <div
              key={ticket.id}
              className="card"
              style={{ cursor: 'pointer', borderLeft: `4px solid ${STATUS_CONFIG[ticket.status]?.color || '#6b7280'}` }}
              onClick={() => loadTicketDetail(ticket.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '11px', color: '#6b7280' }}>{ticket.ticket_number}</code>
                    <span style={{
                      padding: '2px 8px',
                      background: STATUS_CONFIG[ticket.status]?.bg,
                      color: STATUS_CONFIG[ticket.status]?.color,
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '4px'
                    }}>
                      {STATUS_CONFIG[ticket.status]?.label}
                    </span>
                    <span className="status-badge muted" style={{ fontSize: '11px' }}>
                      {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}
                    </span>
                    {ticket.priority !== 'normal' && (
                      <span style={{
                        padding: '2px 8px',
                        background: PRIORITY_CONFIG[ticket.priority]?.color,
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600',
                        borderRadius: '4px'
                      }}>
                        {PRIORITY_CONFIG[ticket.priority]?.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>{ticket.subject}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {ticket.contact_name || 'Guest'} • {ticket.contact_email}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  <div>{getTimeAgo(ticket.last_message_at || ticket.created_at)}</div>
                  {ticket.message_count > 1 && <div>{ticket.message_count} msgs</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
