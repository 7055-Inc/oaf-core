'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Breadcrumb from '../../../components/Breadcrumb';
import { authApiRequest } from '../../../lib/apiUtils';
import styles from '../Help.module.css';

// Status display configuration
const STATUS_CONFIG = {
  open: { label: 'Open', color: '#28a745' },
  awaiting_customer: { label: 'Awaiting Your Reply', color: '#fd7e14' },
  awaiting_support: { label: 'Awaiting Support', color: '#007bff' },
  escalated: { label: 'Escalated', color: '#dc3545' },
  resolved: { label: 'Resolved', color: '#6c757d' },
  closed: { label: 'Closed', color: '#495057' },
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

export default function TicketDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchTicket();
    }
  }, [id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await authApiRequest(`api/tickets/${id}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
        setMessages(data.messages || []);
      } else if (response.status === 404) {
        setError('Ticket not found');
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        throw new Error('Failed to fetch ticket');
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError('Unable to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSubmitting(true);
    try {
      const response = await authApiRequest(`api/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() })
      });

      if (response.ok) {
        setNewMessage('');
        fetchTicket(); // Refresh ticket and messages
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) return;

    try {
      const response = await authApiRequest(`api/tickets/${id}/close`, {
        method: 'PATCH'
      });

      if (response.ok) {
        fetchTicket(); // Refresh ticket
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to close ticket');
      }
    } catch (err) {
      setError(err.message);
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

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div style={{ textAlign: 'center', padding: '100px 24px', color: '#6c757d' }}>
            Loading ticket...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !ticket) {
    return (
      <>
        <Head>
          <title>Ticket Not Found - Help Center - Brakebee</title>
          <meta name="robots" content="noindex" />
        </Head>

        <div className={styles.container}>
          <div className={styles.content}>
            <Breadcrumb items={[
              { label: 'Home', href: '/' },
              { label: 'Help Center', href: '/help' },
              { label: 'My Tickets', href: '/help/tickets' },
              { label: 'Error' }
            ]} />

            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                margin: '0 auto 24px',
                background: '#f8d7da',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#dc3545' }}></i>
              </div>
              <h1 style={{ marginBottom: '16px', color: '#333' }}>{error}</h1>
              <p style={{ color: '#6c757d', marginBottom: '24px' }}>
                The ticket you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link 
                href="/help/tickets"
                style={{
                  display: 'inline-block',
                  background: 'var(--primary-color)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                Back to My Tickets
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isClosed = ticket?.status === 'closed';
  const isResolved = ticket?.status === 'resolved';

  return (
    <>
      <Head>
        <title>{ticket?.ticket_number} - Help Center - Brakebee</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <Breadcrumb items={[
            { label: 'Home', href: '/' },
            { label: 'Help Center', href: '/help' },
            { label: 'My Tickets', href: '/help/tickets' },
            { label: ticket?.ticket_number }
          ]} />

          {/* Ticket Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: '#6c757d',
                fontFamily: 'monospace'
              }}>
                {ticket?.ticket_number}
              </span>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: STATUS_CONFIG[ticket?.status]?.color || '#6c757d',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                {STATUS_CONFIG[ticket?.status]?.label || ticket?.status}
              </span>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: '#e9ecef',
                color: '#495057',
                fontSize: '0.75rem',
                borderRadius: '4px'
              }}>
                {TYPE_LABELS[ticket?.ticket_type] || ticket?.ticket_type}
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', margin: '0 0 8px 0', color: '#333' }}>
              {ticket?.subject}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6c757d', margin: 0 }}>
              Opened {formatDate(ticket?.created_at)}
              {ticket?.resolved_at && ` • Resolved ${formatDate(ticket.resolved_at)}`}
              {ticket?.closed_at && ` • Closed ${formatDate(ticket.closed_at)}`}
            </p>
          </div>

          {/* Error Message */}
          {error && ticket && (
            <div className={styles.errorMessage} style={{ marginBottom: '20px' }}>{error}</div>
          )}

          {/* Messages */}
          <section className={styles.section}>
            <h2>Conversation</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg, index) => {
                const isCustomer = msg.sender_type === 'customer' || msg.sender_type === 'guest';
                return (
                  <div 
                    key={msg.id || index}
                    style={{
                      padding: '16px',
                      background: isCustomer ? '#f8f9fa' : '#e7f3ff',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${isCustomer ? '#6c757d' : 'var(--primary-color)'}`,
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px',
                      fontSize: '0.8125rem',
                      color: '#6c757d'
                    }}>
                      <span style={{ fontWeight: 600, color: isCustomer ? '#495057' : 'var(--primary-color)' }}>
                        {isCustomer ? 'You' : 'Support Team'}
                      </span>
                      <span>{formatDate(msg.created_at)}</span>
                    </div>
                    <div style={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: 1.6,
                      color: '#333'
                    }}>
                      {msg.message_text}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Reply Form */}
          {!isClosed && (
            <section className={styles.section}>
              <h2>Reply</h2>
              <form onSubmit={handleSendMessage}>
                <div className={styles.formGroup}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    required
                    style={{ minHeight: '120px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={submitting || !newMessage.trim()}
                    style={{ width: 'auto' }}
                  >
                    {submitting ? 'Sending...' : 'Send Reply'}
                  </button>
                  {!isResolved && (
                    <button 
                      type="button"
                      onClick={handleCloseTicket}
                      style={{
                        padding: '14px 24px',
                        background: 'white',
                        color: '#6c757d',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* Closed Message */}
          {isClosed && (
            <section className={styles.section}>
              <div style={{ 
                textAlign: 'center', 
                padding: '24px', 
                background: '#f8f9fa', 
                borderRadius: '8px',
                color: '#6c757d'
              }}>
                <i className="fas fa-lock" style={{ fontSize: '1.5rem', marginBottom: '12px', display: 'block' }}></i>
                This ticket is closed. If you need further assistance, please{' '}
                <Link href="/help/contact">submit a new ticket</Link>.
              </div>
            </section>
          )}

          <div className={styles.backLink}>
            <Link href="/help/tickets">← Back to My Tickets</Link>
          </div>
        </div>
      </div>
    </>
  );
}

