'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Breadcrumb from '../../components/Breadcrumb';
import { authApiRequest, apiRequest } from '../../lib/apiUtils';
import { getAuthToken } from '../../lib/csrf';
import styles from './Help.module.css';

// Contact configuration
const CONTACT_INFO = {
  email: 'support@brakebee.com',
  hours: 'Monday – Friday, 9am – 5pm EST',
  responseTime: 'Usually within 24-48 hours',
  mailingAddress: '7055 IA-9, Harris, Iowa 51345-7534',
};

// Ticket categories (maps to ticket_type enum)
const TICKET_CATEGORIES = [
  { value: '', label: 'Select a topic...' },
  { value: 'order', label: 'Order Issue' },
  { value: 'return', label: 'Return or Refund' },
  { value: 'account', label: 'Account Help' },
  { value: 'selling', label: 'Selling on Brakebee' },
  { value: 'events', label: 'Events & Applications' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'feedback', label: 'Feedback or Suggestion' },
  { value: 'other', label: 'Other' },
];

export default function ContactPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState(null);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const response = await authApiRequest('users/me', {
          method: 'GET'
        });
        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(true);
          setUserEmail(data.username || '');
        }
      } catch (err) {
        // Not logged in, that's fine
      }
    };
    checkAuth();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const ticketData = {
        subject: formData.subject,
        message: formData.message,
        ticket_type: formData.category || 'general',
        priority: 'normal'
      };

      // Add guest info if not logged in
      if (!isLoggedIn) {
        ticketData.guest_email = formData.email;
        ticketData.guest_name = formData.name;
      }

      // Use authApiRequest if logged in, apiRequest if guest
      const requestFn = isLoggedIn ? authApiRequest : apiRequest;
      const response = await requestFn('api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTicketNumber(data.ticket_number);
        setSubmitted(true);
      } else {
        throw new Error(data.error || 'Failed to create ticket');
      }

    } catch (err) {
      console.error('Error submitting ticket:', err);
      setError(err.message || 'Unable to submit your request. Please try again or email us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Contact Us - Help Center - Brakebee</title>
        <meta name="description" content="Get in touch with our support team. We're here to help with orders, returns, account issues, and more." />
        <link rel="canonical" href="https://brakebee.com/help/contact" />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          
          <Breadcrumb items={[
            { label: 'Home', href: '/' },
            { label: 'Help Center', href: '/help' },
            { label: 'Contact Us' }
          ]} />

          <div className={styles.hero}>
            <h1>Contact Us</h1>
            <p className={styles.heroSubtitle}>We're here to help. Send us a message and we'll respond as soon as possible.</p>
          </div>

          <div className={styles.contactPageGrid}>
            
            {/* Contact Form */}
            <div className={styles.contactForm}>
              {submitted ? (
                <div className={styles.successMessage}>
                  <i className="fas fa-check-circle" style={{ fontSize: '2rem', marginBottom: '16px', display: 'block' }}></i>
                  <strong>Ticket Submitted!</strong>
                  <p>Your ticket number is: <strong>{ticketNumber}</strong></p>
                  <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>
                    We've received your request and will respond within 24-48 hours.
                    {isLoggedIn && (
                      <> You can track your ticket in <Link href="/help/tickets">My Tickets</Link>.</>
                    )}
                  </p>
                  <div style={{ marginTop: '20px' }}>
                    <Link 
                      href="/help" 
                      style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        background: 'var(--primary-color)',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 600
                      }}
                    >
                      Back to Help Center
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className={styles.errorMessage}>{error}</div>
                  )}

                  {!isLoggedIn && (
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="name">Your Name</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="Enter your name"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="email">Email Address</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="Enter your email"
                        />
                      </div>
                    </>
                  )}

                  {isLoggedIn && (
                    <div className={styles.formGroup}>
                      <label>Logged in as</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', color: '#495057' }}>
                        {userEmail}
                      </div>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label htmlFor="category">Topic</label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      {TICKET_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="subject">Subject</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="Please describe your issue or question in detail..."
                    />
                  </div>

                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Details Sidebar */}
            <div className={styles.contactDetails}>
              <h3>Other Ways to Reach Us</h3>
              
              <div className={styles.contactDetailItem}>
                <i className="fas fa-envelope"></i>
                <div>
                  <strong>Email</strong>
                  <span>
                    <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
                  </span>
                </div>
              </div>

              <div className={styles.contactDetailItem}>
                <i className="fas fa-clock"></i>
                <div>
                  <strong>Support Hours</strong>
                  <span>{CONTACT_INFO.hours}</span>
                </div>
              </div>

              <div className={styles.contactDetailItem}>
                <i className="fas fa-hourglass-half"></i>
                <div>
                  <strong>Response Time</strong>
                  <span>{CONTACT_INFO.responseTime}</span>
                </div>
              </div>

              <div className={styles.contactDetailItem}>
                <i className="fas fa-envelope-open-text"></i>
                <div>
                  <strong>Physical Correspondence</strong>
                  <span>{CONTACT_INFO.mailingAddress}</span>
                </div>
              </div>

              <div className={styles.contactDetailItem}>
                <i className="fas fa-book"></i>
                <div>
                  <strong>Help Articles</strong>
                  <span>
                    <Link href="/help">Browse our Help Center</Link> for quick answers to common questions.
                  </span>
                </div>
              </div>

              {isLoggedIn && (
                <div className={styles.contactDetailItem}>
                  <i className="fas fa-ticket"></i>
                  <div>
                    <strong>My Tickets</strong>
                    <span>
                      <Link href="/help/tickets">View your support tickets</Link>
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className={styles.backLink}>
            <Link href="/help">← Back to Help Center</Link>
          </div>

        </div>
      </div>
    </>
  );
}
