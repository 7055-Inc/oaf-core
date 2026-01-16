'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Breadcrumb from '../../../components/Breadcrumb';
import { authApiRequest } from '../../../lib/apiUtils';
import { getAuthToken } from '../../../lib/csrf';
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

export default function TicketsPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthAndFetchTickets();
  }, [filter]);

  const checkAuthAndFetchTickets = async () => {
    try {
      // Check authentication via token
      const token = getAuthToken();
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      // Fetch tickets
      const ticketParams = new URLSearchParams();
      if (filter !== 'all') {
        ticketParams.append('status', filter);
      }

      const ticketResponse = await authApiRequest(`api/tickets/my?${ticketParams}`, {
        method: 'GET'
      });

      if (ticketResponse.ok) {
        const data = await ticketResponse.json();
        setTickets(data.tickets || []);
      } else {
        throw new Error('Failed to fetch tickets');
      }

    } catch (err) {
      console.error('Error:', err);
      setError('Unable to load tickets');
    } finally {
      setLoading(false);
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

  // Not logged in state
  if (!loading && !isLoggedIn) {
    return (
      <>
        <Head>
          <title>My Tickets - Help Center - Brakebee</title>
          <meta name="robots" content="noindex" />
        </Head>

        <div className={styles.container}>
          <div className={styles.content}>
            <Breadcrumb items={[
              { label: 'Home', href: '/' },
              { label: 'Help Center', href: '/help' },
              { label: 'My Tickets' }
            ]} />

            <div className={styles.hero}>
              <h1>My Tickets</h1>
              <p className={styles.heroSubtitle}>Please log in to view your support tickets.</p>
            </div>

            <section className={styles.section}>
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ 
                  width: 80, 
                  height: 80, 
                  margin: '0 auto 24px',
                  background: 'var(--secondary-color, #f0f0f0)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-lock" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i>
                </div>
                <h2 style={{ marginBottom: '16px', color: '#333' }}>Login Required</h2>
                <p style={{ color: '#6c757d', marginBottom: '24px' }}>
                  You need to be logged in to view and manage your support tickets.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link 
                    href="/login"
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
                    Log In
                  </Link>
                  <Link 
                    href="/help/contact"
                    style={{
                      display: 'inline-block',
                      background: 'white',
                      color: 'var(--primary-color)',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      border: '2px solid var(--primary-color)'
                    }}
                  >
                    Submit New Ticket
                  </Link>
                </div>
              </div>
            </section>

            <div className={styles.backLink}>
              <Link href="/help">← Back to Help Center</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>My Tickets - Help Center - Brakebee</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <Breadcrumb items={[
            { label: 'Home', href: '/' },
            { label: 'Help Center', href: '/help' },
            { label: 'My Tickets' }
          ]} />

          <div className={styles.hero}>
            <h1>My Tickets</h1>
            <p className={styles.heroSubtitle}>View and manage your support requests.</p>
          </div>

          {/* Actions Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['all', 'open', 'awaiting_customer', 'awaiting_support', 'resolved', 'closed'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  style={{
                    padding: '8px 16px',
                    border: filter === status ? '2px solid var(--primary-color)' : '1px solid #dee2e6',
                    background: filter === status ? 'var(--primary-color)' : 'white',
                    color: filter === status ? 'white' : '#495057',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: filter === status ? 600 : 400,
                    fontSize: '0.875rem'
                  }}
                >
                  {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
                </button>
              ))}
            </div>
            <Link 
              href="/help/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--primary-color)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem'
              }}
            >
              <i className="fas fa-plus"></i>
              New Ticket
            </Link>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6c757d' }}>
              Loading tickets...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}

          {/* Tickets List */}
          {!loading && !error && tickets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                margin: '0 auto 24px',
                background: 'var(--secondary-color, #f0f0f0)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-ticket" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i>
              </div>
              <h2 style={{ marginBottom: '16px', color: '#333' }}>No Tickets Found</h2>
              <p style={{ color: '#6c757d', marginBottom: '24px' }}>
                {filter === 'all' 
                  ? "You haven't submitted any support tickets yet."
                  : `No tickets with status "${STATUS_CONFIG[filter]?.label || filter}".`
                }
              </p>
              <Link 
                href="/help/contact"
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
                Submit a Ticket
              </Link>
            </div>
          )}

          {!loading && !error && tickets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tickets.map(ticket => (
                <Link 
                  key={ticket.id} 
                  href={`/help/tickets/${ticket.id}`}
                  className={styles.quickLinkCard}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: '#6c757d',
                        fontFamily: 'monospace'
                      }}>
                        {ticket.ticket_number}
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: STATUS_CONFIG[ticket.status]?.color || '#6c757d',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#e9ecef',
                        color: '#495057',
                        fontSize: '0.7rem',
                        borderRadius: '4px'
                      }}>
                        {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#333' }}>
                      {ticket.subject}
                    </h3>
                    <div style={{ fontSize: '0.8125rem', color: '#6c757d' }}>
                      Created {formatDate(ticket.created_at)}
                      {ticket.message_count > 1 && ` • ${ticket.message_count} messages`}
                    </div>
                  </div>
                  <i className={`fas fa-chevron-right ${styles.quickLinkArrow}`}></i>
                </Link>
              ))}
            </div>
          )}

          <div className={styles.backLink}>
            <Link href="/help">← Back to Help Center</Link>
          </div>
        </div>
      </div>
    </>
  );
}
