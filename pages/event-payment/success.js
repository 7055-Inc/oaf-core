import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest } from '../../lib/csrf';
import { authApiRequest } from '../../lib/apiUtils';
import styles from '../../styles/EventPaymentSuccess.module.css';

export default function EventPaymentSuccess() {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { payment_intent } = router.query;

  useEffect(() => {
    if (payment_intent) {
      loadPaymentConfirmation();
    }
  }, [payment_intent]);

  const loadPaymentConfirmation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApiRequest(`api/applications/payment-intent/${payment_intent}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load payment confirmation');
      }
    } catch (err) {
      console.error('Error loading payment confirmation:', err);
      setError('Failed to load payment confirmation');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Confirming your payment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.error}>
            <h2>Payment Confirmation Error</h2>
            <p>{error}</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className={styles.backButton}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Payment Successful - {paymentData?.event_title}</title>
        <meta name="description" content="Your booth fee payment has been successfully processed" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>


      <div className={styles.successContainer}>
        <div className={styles.successHeader}>
          <div className={styles.successIcon}>
            <div className={styles.checkmark}>
              <svg viewBox="0 0 52 52" className={styles.checkmarkSvg}>
                <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none"/>
                <path className={styles.checkmarkCheck} fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
          </div>
          <h1>🎉 Payment Successful!</h1>
          <p className={styles.successSubtitle}>
            Your booth fee has been processed and your spot is confirmed
          </p>
        </div>

        <div className={styles.successContent}>
          {/* Event Details */}
          <div className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <h2>🎪 {paymentData?.event_title}</h2>
              <div className={styles.eventStatus}>
                <span className={styles.statusBadge}>CONFIRMED</span>
              </div>
            </div>
            <div className={styles.eventDetails}>
              <div className={styles.eventDetail}>
                <span className={styles.detailLabel}>📅 Event Dates:</span>
                <span className={styles.detailValue}>
                  {formatDate(paymentData?.event_start_date)} - {formatDate(paymentData?.event_end_date)}
                </span>
              </div>
              <div className={styles.eventDetail}>
                <span className={styles.detailLabel}>📍 Location:</span>
                <span className={styles.detailValue}>
                  {paymentData?.event_venue_name}, {paymentData?.event_venue_city}, {paymentData?.event_venue_state}
                </span>
              </div>
              <div className={styles.eventDetail}>
                <span className={styles.detailLabel}>👤 Artist:</span>
                <span className={styles.detailValue}>
                  {paymentData?.artist_first_name} {paymentData?.artist_last_name}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className={styles.paymentCard}>
            <h3>💰 Payment Summary</h3>
            <div className={styles.paymentDetails}>
              <div className={styles.paymentLine}>
                <span>Booth Fee:</span>
                <span>{formatCurrency(paymentData?.booth_fee_amount || 0)}</span>
              </div>
              {paymentData?.addons_total > 0 && (
                <div className={styles.paymentLine}>
                  <span>Add-ons:</span>
                  <span>{formatCurrency(paymentData?.addons_total || 0)}</span>
                </div>
              )}
              <div className={styles.paymentLine + ' ' + styles.totalLine}>
                <span>Total Paid:</span>
                <span>{formatCurrency(paymentData?.total_amount || 0)}</span>
              </div>
              <div className={styles.paymentLine + ' ' + styles.transactionLine}>
                <span>Transaction ID:</span>
                <span className={styles.transactionId}>{paymentData?.payment_intent_id}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className={styles.nextStepsCard}>
            <h3>✅ What's Next?</h3>
            <div className={styles.nextStepsList}>
              <div className={styles.nextStep}>
                <div className={styles.stepIcon}>📧</div>
                <div className={styles.stepContent}>
                  <h4>Confirmation Email</h4>
                  <p>You'll receive a confirmation email with your receipt and event details within the next few minutes.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <div className={styles.stepIcon}>📋</div>
                <div className={styles.stepContent}>
                  <h4>Event Preparation</h4>
                  <p>The event organizer will contact you with setup instructions, booth assignments, and additional details.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <div className={styles.stepIcon}>🎨</div>
                <div className={styles.stepContent}>
                  <h4>Prepare Your Artwork</h4>
                  <p>Start preparing your artwork and booth setup. Review any specific requirements mentioned in the event details.</p>
                </div>
              </div>
              <div className={styles.nextStep}>
                <div className={styles.stepIcon}>📞</div>
                <div className={styles.stepContent}>
                  <h4>Contact Information</h4>
                  <p>If you have any questions, you can reach out to the event organizer through your dashboard.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button 
              onClick={() => router.push('/dashboard')}
              className={styles.primaryButton}
            >
              📊 Go to Dashboard
            </button>
            <button 
              onClick={() => router.push('/dashboard?section=my-applications')}
              className={styles.secondaryButton}
            >
              📝 View My Applications
            </button>
            <button 
              onClick={() => window.print()}
              className={styles.secondaryButton}
            >
              🖨️ Print Confirmation
            </button>
          </div>
        </div>

        <div className={styles.successFooter}>
          <div className={styles.footerContent}>
            <p>
              <strong>Important:</strong> Keep this confirmation for your records. 
              Your payment has been processed and your participation is confirmed.
            </p>
            <div className={styles.supportInfo}>
              <p>
                Need help? Contact support at 
                <a href="mailto:support@beemeeart.com"> support@beemeeart.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 