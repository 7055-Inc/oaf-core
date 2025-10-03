import React, { useState, useEffect } from 'react';
import styles from './TicketPurchaseModal.module.css';
import { getApiUrl } from '../lib/config';

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
    // Check if Stripe is already loaded (from existing script)
    if (typeof window !== 'undefined' && window.Stripe) {
      const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      setStripe(stripeInstance);
      setStripeLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Initialize Stripe Elements when we have payment intent
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

      const cardElementInstance = elementsInstance.create('card', {
        style: {
          base: {
            fontSize: '16px',
            fontFamily: 'system-ui, sans-serif',
            '::placeholder': { color: '#6c757d' }
          }
        }
      });

      setElements(elementsInstance);
      setCardElement(cardElementInstance);
    }
  }, [stripeLoaded, stripe, paymentIntent, elements]);

  useEffect(() => {
    // Mount card element when available
    if (cardElement && document.getElementById('ticket-card-element')) {
      cardElement.mount('#ticket-card-element');
    }
  }, [cardElement]);

  const fetchTickets = async () => {
    try {
      const response = await fetch(getApiUrl(`api/events/${event.id}/tickets`));
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketQuantityChange = (ticketId, quantity) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketId]: Math.max(0, quantity)
    }));
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
      // For now, process the first selected ticket type
      // In a real implementation, you might combine all into one purchase
      const [ticketId, quantity] = Object.entries(selectedTickets).find(([_, qty]) => qty > 0);
      
      const response = await fetch(getApiUrl(`api/events/${event.id}/tickets/${ticketId}/purchase`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_email: buyerInfo.email,
          buyer_name: buyerInfo.name,
          quantity: quantity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process purchase');
      }

      const data = await response.json();
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
            billing_details: {
              name: buyerInfo.name,
              email: buyerInfo.email,
            },
          }
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (confirmedPaymentIntent.status === 'succeeded') {
        // Success! Close modal and show success
        onClose();
        // Could show success toast or redirect
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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2><i className="fas fa-ticket-alt"></i> Buy Tickets</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.eventInfo}>
          <h3>{event.title}</h3>
          <p>
            <i className="fas fa-calendar"></i>
            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
          </p>
          <p>
            <i className="fas fa-map-marker-alt"></i>
            {event.venue_name}, {event.venue_city}, {event.venue_state}
          </p>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i>
            Loading tickets...
          </div>
        ) : (
          <div className={styles.purchaseForm}>
            {!paymentIntent ? (
              // Ticket Selection Phase
              <>
                {tickets.length === 0 ? (
                  <div className={styles.noTickets}>
                    <p>No tickets are currently available for this event.</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.ticketsSection}>
                      <h4>Available Tickets</h4>
                      {tickets.map(ticket => (
                        <div key={ticket.id} className={styles.ticketOption}>
                          <div className={styles.ticketInfo}>
                            <h5>{ticket.ticket_type}</h5>
                            <p className={styles.ticketPrice}>${parseFloat(ticket.price).toFixed(2)}</p>
                            {ticket.description && (
                              <p className={styles.ticketDescription}>{ticket.description}</p>
                            )}
                            {ticket.quantity_available && (
                              <p className={styles.availability}>
                                {ticket.quantity_available - ticket.quantity_sold} available
                              </p>
                            )}
                          </div>
                          <div className={styles.quantitySelector}>
                            <button
                              type="button"
                              onClick={() => handleTicketQuantityChange(ticket.id, (selectedTickets[ticket.id] || 0) - 1)}
                              disabled={!selectedTickets[ticket.id] || selectedTickets[ticket.id] <= 0}
                              className={styles.quantityBtn}
                            >
                              -
                            </button>
                            <span className={styles.quantity}>{selectedTickets[ticket.id] || 0}</span>
                            <button
                              type="button"
                              onClick={() => handleTicketQuantityChange(ticket.id, (selectedTickets[ticket.id] || 0) + 1)}
                              disabled={ticket.quantity_available && ticket.quantity_available - ticket.quantity_sold <= (selectedTickets[ticket.id] || 0)}
                              className={styles.quantityBtn}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {getTotalQuantity() > 0 && (
                      <div className={styles.orderSummary}>
                        <h4>Order Summary</h4>
                        <div className={styles.summaryLine}>
                          <span>Total Tickets: {getTotalQuantity()}</span>
                          <span>Total: ${getTotalAmount().toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className={styles.buyerSection}>
                      <h4>Contact Information</h4>
                      <div className={styles.formRow}>
                        <input
                          type="email"
                          placeholder="Email Address *"
                          value={buyerInfo.email}
                          onChange={(e) => setBuyerInfo(prev => ({...prev, email: e.target.value}))}
                          required
                          className={styles.input}
                        />
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={buyerInfo.name}
                          onChange={(e) => setBuyerInfo(prev => ({...prev, name: e.target.value}))}
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.formActions}>
                      <button type="button" onClick={onClose} className={styles.cancelBtn}>
                        Cancel
                      </button>
                      <button 
                        onClick={createPaymentIntent}
                        disabled={processing || getTotalQuantity() === 0}
                        className={styles.continueBtn}
                      >
                        {processing ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
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
              // Payment Phase
              <form onSubmit={handlePayment}>
                <div className={styles.paymentSection}>
                  <h4>Payment Information</h4>
                  <div className={styles.cardElement}>
                    <div id="ticket-card-element">
                      {!stripeLoaded && <div className={styles.loadingSpinner}>Loading payment form...</div>}
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="button" onClick={() => setPaymentIntent(null)} className={styles.backBtn}>
                    ← Back to Tickets
                  </button>
                  <button 
                    type="submit" 
                    disabled={processing || !stripeLoaded}
                    className={styles.purchaseBtn}
                  >
                    {processing ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
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
              <div className={styles.error}>
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 