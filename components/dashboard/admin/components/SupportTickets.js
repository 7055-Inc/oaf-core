/**
 * Support Tickets Admin Component
 * Allows admins to view and manage all support tickets
 */
import { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

// Status display configuration
const STATUS_CONFIG = {
  open: { label: 'Open', color: '#28a745', bgColor: '#d4edda' },
  awaiting_customer: { label: 'Awaiting Customer', color: '#fd7e14', bgColor: '#fff3cd' },
  awaiting_support: { label: 'Awaiting Support', color: '#007bff', bgColor: '#cce5ff' },
  escalated: { label: 'Escalated', color: '#dc3545', bgColor: '#f8d7da' },
  resolved: { label: 'Resolved', color: '#6c757d', bgColor: '#e9ecef' },
  closed: { label: 'Closed', color: '#495057', bgColor: '#f8f9fa' },
};

// Ticket type labels
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

// Priority config
const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#6c757d' },
  normal: { label: 'Normal', color: '#007bff' },
  high: { label: 'High', color: '#fd7e14' },
  urgent: { label: 'Urgent', color: '#dc3545' },
};

export default function SupportTickets({ userData }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [filter, setFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detail view state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filter, typeFilter, searchTerm]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (typeFilter !== 'all') params.append('ticket_type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await authApiRequest(`api/tickets/admin/all?${params}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        setStatusCounts(data.status_counts || {});
      } else {
        throw new Error('Failed to fetch tickets');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetail = async (ticketId) => {
    try {
      const response = await authApiRequest(`api/tickets/admin/${ticketId}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data.ticket);
        setTicketMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSubmitting(true);
    try {
      const response = await authApiRequest(`api/tickets/admin/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: newMessage.trim(),
          is_internal: isInternal
        })
      });

      if (response.ok) {
        setNewMessage('');
        setIsInternal(false);
        fetchTicketDetail(selectedTicket.id);
        fetchTickets(); // Refresh list for status changes
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      const response = await authApiRequest(`api/tickets/admin/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        fetchTickets();
        if (selectedTicket?.id === ticketId) {
          fetchTicketDetail(ticketId);
        }
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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
      <div className="slide-in-content">
        {/* Back Button */}
        <button 
          className="btn btn-secondary"
          onClick={() => setSelectedTicket(null)}
          style={{ marginBottom: '20px' }}
        >
          ← Back to Tickets
        </button>

        {/* Ticket Header */}
        <div className="form-card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#6c757d' }}>
                  {selectedTicket.ticket_number}
                </span>
                <span style={{
                  padding: '4px 12px',
                  background: STATUS_CONFIG[selectedTicket.status]?.bgColor,
                  color: STATUS_CONFIG[selectedTicket.status]?.color,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '4px'
                }}>
                  {STATUS_CONFIG[selectedTicket.status]?.label}
                </span>
                <span style={{
                  padding: '4px 12px',
                  background: '#e9ecef',
                  color: PRIORITY_CONFIG[selectedTicket.priority]?.color,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '4px'
                }}>
                  {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                </span>
              </div>
              <h3 style={{ margin: '0 0 8px 0' }}>{selectedTicket.subject}</h3>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
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
                value={selectedTicket.status}
                onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                className="form-control"
                style={{ width: 'auto' }}
              >
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <select
                value={selectedTicket.priority}
                onChange={(e) => handleUpdateTicket(selectedTicket.id, { priority: e.target.value })}
                className="form-control"
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
        <div className="form-card" style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '16px' }}>Conversation</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {ticketMessages.map((msg, index) => {
              const isCustomer = msg.sender_type === 'customer' || msg.sender_type === 'guest';
              const isInternalNote = msg.is_internal;
              
              return (
                <div 
                  key={msg.id || index}
                  style={{
                    padding: '12px 16px',
                    background: isInternalNote ? '#fff3cd' : (isCustomer ? '#f8f9fa' : '#e7f3ff'),
                    borderRadius: '8px',
                    borderLeft: `4px solid ${isInternalNote ? '#fd7e14' : (isCustomer ? '#6c757d' : '#007bff')}`,
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '6px',
                    fontSize: '0.8125rem',
                    color: '#6c757d'
                  }}>
                    <span style={{ fontWeight: 600, color: isInternalNote ? '#856404' : (isCustomer ? '#495057' : '#004085') }}>
                      {isInternalNote ? '🔒 Internal Note' : (isCustomer ? (msg.sender_name || 'Customer') : 'Support Team')}
                    </span>
                    <span>{formatDate(msg.created_at)}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {msg.message_text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reply Form */}
        {selectedTicket.status !== 'closed' && (
          <div className="form-card">
            <h4 style={{ marginBottom: '16px' }}>Reply</h4>
            <form onSubmit={handleSendMessage}>
              <div className="form-group">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="form-control"
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
                  <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                    Internal note (not visible to customer)
                  </span>
                </label>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting || !newMessage.trim()}
                >
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
    <div className="slide-in-content">
      {/* Stats Overview */}
      <div className="form-grid-4" style={{ marginBottom: '24px' }}>
        <div 
          className="form-card" 
          style={{ textAlign: 'center', cursor: 'pointer' }} 
          onClick={() => setFilter('open')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFilter('open'))}
          role="button"
          tabIndex={0}
          aria-label="Filter by needs response"
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {(statusCounts.open || 0) + (statusCounts.awaiting_support || 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>Needs Response</div>
        </div>
        <div 
          className="form-card" 
          style={{ textAlign: 'center', cursor: 'pointer' }} 
          onClick={() => setFilter('awaiting_customer')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFilter('awaiting_customer'))}
          role="button"
          tabIndex={0}
          aria-label="Filter by awaiting customer"
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>{statusCounts.awaiting_customer || 0}</div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>Awaiting Customer</div>
        </div>
        <div 
          className="form-card" 
          style={{ textAlign: 'center', cursor: 'pointer' }} 
          onClick={() => setFilter('escalated')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFilter('escalated'))}
          role="button"
          tabIndex={0}
          aria-label="Filter by escalated"
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>{statusCounts.escalated || 0}</div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>Escalated</div>
        </div>
        <div 
          className="form-card" 
          style={{ textAlign: 'center', cursor: 'pointer' }} 
          onClick={() => setFilter('resolved')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFilter('resolved'))}
          role="button"
          tabIndex={0}
          aria-label="Filter by resolved"
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}>{statusCounts.resolved || 0}</div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>Resolved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="form-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-control"
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="awaiting_support">Awaiting Support</option>
              <option value="awaiting_customer">Awaiting Customer</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-control"
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ticket #, subject, email..."
              className="form-control"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          Loading tickets...
        </div>
      )}

      {/* Tickets List */}
      {!loading && tickets.length === 0 && (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
          <h3>No Tickets Found</h3>
          <p style={{ color: '#6c757d' }}>
            {filter === 'all' ? 'No support tickets yet.' : `No tickets with "${STATUS_CONFIG[filter]?.label || filter}" status.`}
          </p>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tickets.map(ticket => (
            <div 
              key={ticket.id}
              className="form-card"
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderLeft: `4px solid ${STATUS_CONFIG[ticket.status]?.color || '#6c757d'}`
              }}
              onClick={() => fetchTicketDetail(ticket.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6c757d' }}>
                      {ticket.ticket_number}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      background: STATUS_CONFIG[ticket.status]?.bgColor,
                      color: STATUS_CONFIG[ticket.status]?.color,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: '4px'
                    }}>
                      {STATUS_CONFIG[ticket.status]?.label}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      background: '#e9ecef',
                      color: '#495057',
                      fontSize: '0.7rem',
                      borderRadius: '4px'
                    }}>
                      {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}
                    </span>
                    {ticket.priority !== 'normal' && (
                      <span style={{
                        padding: '2px 8px',
                        background: PRIORITY_CONFIG[ticket.priority]?.color,
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        borderRadius: '4px'
                      }}>
                        {PRIORITY_CONFIG[ticket.priority]?.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{ticket.subject}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#6c757d' }}>
                    {ticket.contact_name || 'Guest'} • {ticket.contact_email}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6c757d', whiteSpace: 'nowrap' }}>
                  <div>{getTimeAgo(ticket.last_message_at || ticket.created_at)}</div>
                  {ticket.message_count > 1 && (
                    <div>{ticket.message_count} messages</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

