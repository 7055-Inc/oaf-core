import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../../../lib/csrf';
import styles from '../../../SlideIn.module.css';

export default function PaymentDashboard({ applications, selectedEvent, onRefresh }) {
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [selectedForReminder, setSelectedForReminder] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentDashboard();
  }, [selectedEvent]);

  const fetchPaymentDashboard = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`https://api2.onlineartfestival.com/api/events/${selectedEvent.id}/payment-dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch payment dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendPaymentReminder = async (applicationIds) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`https://api2.onlineartfestival.com/api/applications/payment-reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_ids: applicationIds,
          event_id: selectedEvent.id
        })
      });

      if (response.ok) {
        alert(`Payment reminders sent to ${applicationIds.length} applicants`);
        setSelectedForReminder([]);
      } else {
        throw new Error('Failed to send reminders');
      }
    } catch (err) {
      alert('Failed to send payment reminders: ' + err.message);
    }
  };

  const markPaymentReceived = async (applicationId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`https://api2.onlineartfestival.com/api/applications/${applicationId}/payment-received`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        onRefresh();
        fetchPaymentDashboard();
      } else {
        throw new Error('Failed to mark payment as received');
      }
    } catch (err) {
      alert('Failed to update payment status: ' + err.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading-state">Loading payment information...</div>;
  }

  const unpaidApplications = applications.filter(app => 
    app.status === 'accepted' && !app.payment_received
  );

  const paidApplications = applications.filter(app => 
    app.status === 'accepted' && app.payment_received
  );

  return (
    <div className="form-card" style={{ marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 20px 0' }}>Payment Dashboard</h4>
      
      {/* Payment Summary */}
      {paymentSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
              {formatCurrency(paymentSummary.total_received)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Received</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
              {formatCurrency(paymentSummary.total_outstanding)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Outstanding</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
              {paidApplications.length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Paid</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffc107' }}>
              {unpaidApplications.length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Unpaid</div>
          </div>
        </div>
      )}

      {/* Bulk Reminder Actions */}
      {unpaidApplications.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
          <h5 style={{ margin: '0 0 10px 0' }}>Payment Reminders</h5>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedForReminder(unpaidApplications.map(app => app.id))}
              className="secondary"
              style={{ fontSize: '14px' }}
            >
              Select All Unpaid ({unpaidApplications.length})
            </button>
            <button
              onClick={() => setSelectedForReminder([])}
              className="secondary"
              style={{ fontSize: '14px' }}
            >
              Clear Selection
            </button>
            <button
              onClick={() => sendPaymentReminder(selectedForReminder)}
              disabled={selectedForReminder.length === 0}
              className="primary"
              style={{ fontSize: '14px' }}
            >
              Send Reminders ({selectedForReminder.length})
            </button>
          </div>
        </div>
      )}

      {/* Unpaid Applications */}
      {unpaidApplications.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ margin: '0 0 15px 0', color: '#dc3545' }}>
            Awaiting Payment ({unpaidApplications.length})
          </h5>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div className={styles.tableHeaderCell}>
                <input
                  type="checkbox"
                  checked={selectedForReminder.length === unpaidApplications.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForReminder(unpaidApplications.map(app => app.id));
                    } else {
                      setSelectedForReminder([]);
                    }
                  }}
                />
              </div>
              <div className={styles.tableHeaderCell}>Artist</div>
              <div className={styles.tableHeaderCell}>Amount Due</div>
              <div className={styles.tableHeaderCell}>Accepted Date</div>
              <div className={styles.tableHeaderCell}>Actions</div>
            </div>
            {unpaidApplications.map((application) => (
              <div key={application.id} className={styles.tableRow}>
                <div className={styles.tableCell}>
                  <input
                    type="checkbox"
                    checked={selectedForReminder.includes(application.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForReminder([...selectedForReminder, application.id]);
                      } else {
                        setSelectedForReminder(selectedForReminder.filter(id => id !== application.id));
                      }
                    }}
                  />
                </div>
                <div className={styles.tableCell}>{application.artist_name}</div>
                <div className={styles.tableCell}>{formatCurrency(application.total_fees)}</div>
                <div className={styles.tableCell}>{formatDate(application.accepted_date)}</div>
                <div className={styles.tableCell}>
                  <button
                    onClick={() => markPaymentReceived(application.id)}
                    className="primary"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paid Applications */}
      {paidApplications.length > 0 && (
        <div>
          <h5 style={{ margin: '0 0 15px 0', color: '#28a745' }}>
            Payment Received ({paidApplications.length})
          </h5>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div className={styles.tableHeaderCell}>Artist</div>
              <div className={styles.tableHeaderCell}>Amount</div>
              <div className={styles.tableHeaderCell}>Payment Date</div>
              <div className={styles.tableHeaderCell}>Status</div>
            </div>
            {paidApplications.map((application) => (
              <div key={application.id} className={styles.tableRow}>
                <div className={styles.tableCell}>{application.artist_name}</div>
                <div className={styles.tableCell}>{formatCurrency(application.total_fees)}</div>
                <div className={styles.tableCell}>{formatDate(application.payment_date)}</div>
                <div className={styles.tableCell}>
                  <span className={styles.statusCompleted}>Confirmed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No accepted applications requiring payment tracking.
        </div>
      )}
    </div>
  );
}
