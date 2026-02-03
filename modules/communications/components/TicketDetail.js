/**
 * Ticket Detail Component
 * Single ticket view with messaging
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { fetchTicket, addTicketMessage, closeTicket } from '../../../lib/communications';

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

export default function TicketDetail({ ticketId }) {
  const router = useRouter();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTicket(ticketId);
      setTicket(result.ticket);
      setMessages(result.messages || []);
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || submitting) return;

    setSubmitting(true);
    try {
      await addTicketMessage(ticketId, newMessage.trim());
      setNewMessage('');
      await loadTicket(); // Refresh
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) return;

    setClosing(true);
    try {
      await closeTicket(ticketId);
      await loadTicket(); // Refresh
    } catch (err) {
      setError(err.message);
    } finally {
      setClosing(false);
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

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading ticket...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div>
        <div className="error-alert">{error}</div>
        <Link href="/dashboard/communications/tickets" className="secondary" style={{ marginTop: '16px', display: 'inline-block' }}>
          ← Back to Tickets
        </Link>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-ticket"></i>
        <p>Ticket not found</p>
        <Link href="/dashboard/communications/tickets" className="secondary">
          Back to Tickets
        </Link>
      </div>
    );
  }

  const isOpen = !['closed', 'resolved'].includes(ticket.status);

  return (
    <div>
      {/* Back Link */}
      <Link href="/dashboard/communications/tickets" style={{ color: '#6b7280', fontSize: '14px', display: 'inline-block', marginBottom: '16px' }}>
        ← Back to My Tickets
      </Link>

      {/* Ticket Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <code style={{ fontSize: '13px', color: '#6b7280' }}>{ticket.ticket_number}</code>
              <span 
                className="status-badge"
                style={{ backgroundColor: STATUS_CONFIG[ticket.status]?.color, color: 'white' }}
              >
                {STATUS_CONFIG[ticket.status]?.label || ticket.status}
              </span>
              <span className="status-badge muted">
                {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}
              </span>
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{ticket.subject}</h2>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Created {formatDate(ticket.created_at)}
              {ticket.updated_at !== ticket.created_at && ` • Updated ${formatDate(ticket.updated_at)}`}
            </div>
          </div>
          {isOpen && (
            <button 
              className="secondary small"
              onClick={handleCloseTicket}
              disabled={closing}
            >
              {closing ? 'Closing...' : 'Close Ticket'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <div className="error-alert" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Messages */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Conversation</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, index) => {
            const isCustomer = msg.sender_type === 'customer' || msg.sender_type === 'guest';
            return (
              <div
                key={msg.id || index}
                style={{
                  padding: '16px',
                  background: isCustomer ? '#f9fafb' : '#eff6ff',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${isCustomer ? '#9ca3af' : '#3b82f6'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: isCustomer ? '#374151' : '#1d4ed8' }}>
                    {isCustomer ? 'You' : 'Support Team'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {formatDate(msg.created_at)}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '14px' }}>
                  {msg.message_text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Form */}
      {isOpen ? (
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Reply</h3>
          <form onSubmit={handleSendMessage}>
            <div className="form-group">
              <textarea
                className="form-textarea"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="primary" disabled={submitting || !newMessage.trim()}>
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            This ticket is {ticket.status}. Need more help?
          </p>
          <Link href="/help/contact" className="primary">
            Open a New Ticket
          </Link>
        </div>
      )}
    </div>
  );
}
