/**
 * TicketPurchaseModal - event ticket purchase on public event page.
 * Uses v2: fetchEventTickets, purchaseEventTicket from lib/events/api.
 * Global styles only: modal-overlay, modal-content, form-card, form-group, form-input,
 * error-alert, loading-state, empty-state, modal-actions, primary, secondary.
 */

import React, { useState, useEffect } from 'react';
import { fetchEventTickets, purchaseEventTicket } from '../../../lib/events/api';

export default function TicketPurchaseModal({ event, isOpen, onClose }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTickets, setSelectedTickets] = useState({});
  const [buyerInfo, setBuyerInfo] = useState({ email: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);

  useEffect(() => {
    if (isOpen && event?.id) {
      fetchTickets();
    }
  }, [isOpen, event?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Stripe) {
      const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      setStripe(stripeInstance);
      setStripeLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (stripeLoaded && stripe && paymentIntent && !elements) {
      const elementsInstance = stripe.elements({
        clientSecret: paymentIntent.client_secret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#055474',
            colorBackground: '#ffffff',
            colorText: '#30313d',
            colorDanger: '#df1b41',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '0px',
          }
        }
      });
      const cardElementInstance = elementsInstance.create('payment', { layout: 'tabs' });
      setElements(elementsInstance);
      setCardElement(cardElementInstance);
    }
  }, [stripeLoaded, stripe, paymentIntent, elements]);

  useEffect(() => {
    if (cardElement && document.getElementById('ticket-card-element')) {
      cardElement.mount('#ticket-card-element');
    }
  }, [cardElement]);

  const fetchTickets = async () => {
    try {
      const list = await fetchEventTickets(event.id);
      setTickets(list);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketQuantityChange = (ticketId, quantity) => {
    setSelectedTickets(prev => ({ ...prev, [ticketId]: Math.max(0, quantity) }));
  };

  const getTotalAmount = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = tickets.find(t => t.id.toString() === ticketId);
      return total + (ticket ? parseFloat(ticket.price) * quantity : 0);
    }, 0);
  };

  const getTotalQuantity = () => {
    return Object.values(selectedTickets).reduce((total, quantity) => total + quantity, 0);
  };

  const createPaymentIntent = async () => {
    if (getTotalQuantity() === 0) {
      setError('Please select at least one ticket');
      return;
    }
    if (!buyerInfo.email) {
      setError('Please enter your email address');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const [ticketId, quantity] = Object.entries(selectedTickets).find(([_, qty]) => qty > 0);
      const data = await purchaseEventTicket(event.id, ticketId, {
        buyer_email: buyerInfo.email,
        buyer_name: buyerInfo.name,
        quantity
      });
      setPaymentIntent(data.payment_intent);
    } catch (err) {
      console.error('Payment intent error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !cardElement) {
      setError('Payment system not ready');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const { error: stripeError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/ticket-purchase/success`,
          payment_method_data: {
            billing_details: { name: buyerInfo.name, email: buyerInfo.email },
          }
        },
        redirect: 'if_required'
      });
      if (stripeError) throw new Error(stripeError.message);
      if (confirmedPaymentIntent.status === 'succeeded') {
        onClose();
        alert('Tickets purchased successfully! You will receive an email with your ticket codes.');
      } else {
        throw new Error('Payment was not completed successfully');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-purchase-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', marginBottom: '1rem', borderBottom: '1px solid #eee' }}>
          <h2 id="ticket-purchase-title" className="modal-title" style={{ margin: 0 }}>
            <i className="fas fa-ticket-alt" style={{ marginRight: '0.5rem' }}></i> Buy Tickets
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="form-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', fontSize: '1.25rem' }}>{event.title}</h3>
          <p style={{ margin: '0.5rem 0', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-calendar"></i>
            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
          </p>
          <p style={{ margin: '0.5rem 0', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-map-marker-alt"></i>
            {event.venue_name}, {event.venue_city}, {event.venue_state}
          </p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading tickets...</p>
          </div>
        ) : (
          <div style={{ padding: '0 0 1rem 0' }}>
            {!paymentIntent ? (
              <>
                {tickets.length === 0 ? (
                  <div className="empty-state">
                    <p>No tickets are currently available for this event.</p>
                  </div>
                ) : (
                  <>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)', fontSize: '1.1rem' }}>Available Tickets</h4>
                    {tickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className="form-card"
                        style={{ marginBottom: '1rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
                      >
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', fontSize: '1rem' }}>{ticket.ticket_type}</h4>
                          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary-color)', margin: 0 }}>
                            ${parseFloat(ticket.price).toFixed(2)}
                          </p>
                          {ticket.description && (
                            <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>{ticket.description}</p>
                          )}
                          {ticket.quantity_available != null && (
                            <p style={{ margin: '0.5rem 0 0 0' }}>
                              <span className="status-badge active">{ticket.quantity_available - (ticket.quantity_sold || 0)} available</span>
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button
                            type="button"
                            className="secondary"
                            style={{ width: '40px', height: '40px', padding: 0, fontSize: '1.25rem' }}
                            onClick={() => handleTicketQuantityChange(ticket.id, (selectedTickets[ticket.id] || 0) - 1)}
                            disabled={!selectedTickets[ticket.id] || selectedTickets[ticket.id] <= 0}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary-color)', minWidth: '2rem', textAlign: 'center' }}>
                            {selectedTickets[ticket.id] || 0}
                          </span>
                          <button
                            type="button"
                            className="secondary"
                            style={{ width: '40px', height: '40px', padding: 0, fontSize: '1.25rem' }}
                            onClick={() => handleTicketQuantityChange(ticket.id, (selectedTickets[ticket.id] || 0) + 1)}
                            disabled={ticket.quantity_available != null && ticket.quantity_available - (ticket.quantity_sold || 0) <= (selectedTickets[ticket.id] || 0)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}

                    {getTotalQuantity() > 0 && (
                      <div className="form-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)', fontSize: '1.1rem' }}>Order Summary</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: 'var(--secondary-color)', fontSize: '1.1rem' }}>
                          <span>Total Tickets: {getTotalQuantity()}</span>
                          <span>Total: ${getTotalAmount().toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label>Contact Information</label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <input
                          type="email"
                          placeholder="Email Address *"
                          value={buyerInfo.email}
                          onChange={(e) => setBuyerInfo(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="form-input"
                          style={{ flex: 1, minWidth: '160px' }}
                        />
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={buyerInfo.name}
                          onChange={(e) => setBuyerInfo(prev => ({ ...prev, name: e.target.value }))}
                          className="form-input"
                          style={{ flex: 1, minWidth: '160px' }}
                        />
                      </div>
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="secondary" onClick={onClose}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={createPaymentIntent}
                        disabled={processing || getTotalQuantity() === 0}
                        className="primary"
                      >
                        {processing ? (
                          <>
                            <span className="spinner small" style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle' }}></span>
                            Processing...
                          </>
                        ) : (
                          `Continue to Payment - $${getTotalAmount().toFixed(2)}`
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <form onSubmit={handlePayment}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Payment Information</label>
                  <div className="form-input" style={{ padding: '0.75rem', minHeight: '50px' }}>
                    <div id="ticket-card-element">
                      {!stripeLoaded && <div className="loading-inline">Loading payment form...</div>}
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => setPaymentIntent(null)}>
                    ← Back to Tickets
                  </button>
                  <button type="submit" disabled={processing || !stripeLoaded} className="primary">
                    {processing ? (
                      <>
                        <span className="spinner small" style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle' }}></span>
                        Processing...
                      </>
                    ) : (
                      `Purchase Tickets - $${getTotalAmount().toFixed(2)}`
                    )}
                  </button>
                </div>
              </form>
            )}

            {error && (
              <div className="error-alert" style={{ marginTop: '1rem' }}>
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
