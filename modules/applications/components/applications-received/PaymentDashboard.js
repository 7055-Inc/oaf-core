/**
 * PaymentDashboard - payment summary and reminders for event applications (promoter).
 * Used by My Applicants (Business Center). Part of events module.
 */

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';

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
      const response = await fetch(getApiUrl(`api/v2/applications/payment-dashboard/${selectedEvent.id}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const json = await response.json();
        const summary = json.data?.summary || json.summary;
        setPaymentSummary(summary ? {
          total_received: summary.total_collected ?? 0,
          total_outstanding: summary.total_outstanding ?? 0
        } : null);
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
      const response = await fetch(getApiUrl('api/v2/applications/payment-reminder'), {
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
      const response = await fetch(getApiUrl(`api/v2/applications/${applicationId}/payment-received`), {
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

      {unpaidApplications.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
          <h5 style={{ margin: '0 0 10px 0' }}>Payment Reminders</h5>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setSelectedForReminder(unpaidApplications.map(app => app.id))} className="secondary" style={{ fontSize: '14px' }}>
              Select All Unpaid ({unpaidApplications.length})
            </button>
            <button type="button" onClick={() => setSelectedForReminder([])} className="secondary" style={{ fontSize: '14px' }}>
              Clear Selection
            </button>
            <button type="button" onClick={() => sendPaymentReminder(selectedForReminder)} disabled={selectedForReminder.length === 0} className="primary" style={{ fontSize: '14px' }}>
              Send Reminders ({selectedForReminder.length})
            </button>
          </div>
        </div>
      )}

      {unpaidApplications.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ margin: '0 0 15px 0', color: '#dc3545' }}>
            Awaiting Payment ({unpaidApplications.length})
          </h5>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 110px 100px', gap: '12px', padding: '12px 16px', backgroundColor: '#f9fafb', fontWeight: '600', fontSize: '14px' }}>
              <div><input type="checkbox" checked={selectedForReminder.length === unpaidApplications.length} onChange={(e) => { if (e.target.checked) setSelectedForReminder(unpaidApplications.map(app => app.id)); else setSelectedForReminder([]); }} /></div>
              <div>Artist</div>
              <div>Amount Due</div>
              <div>Accepted Date</div>
              <div>Actions</div>
            </div>
            {unpaidApplications.map((application) => (
              <div key={application.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 110px 100px', gap: '12px', padding: '12px 16px', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
                <div><input type="checkbox" checked={selectedForReminder.includes(application.id)} onChange={(e) => { if (e.target.checked) setSelectedForReminder([...selectedForReminder, application.id]); else setSelectedForReminder(selectedForReminder.filter(id => id !== application.id)); }} /></div>
                <div>{application.artist_name}</div>
                <div>{formatCurrency(application.total_fees)}</div>
                <div>{formatDate(application.accepted_date)}</div>
                <div>
                  <button type="button" onClick={() => markPaymentReceived(application.id)} className="secondary">Mark Paid</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {paidApplications.length > 0 && (
        <div>
          <h5 style={{ margin: '0 0 15px 0', color: '#28a745' }}>
            Payment Received ({paidApplications.length})
          </h5>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 100px', gap: '12px', padding: '12px 16px', backgroundColor: '#f9fafb', fontWeight: '600', fontSize: '14px' }}>
              <div>Artist</div>
              <div>Amount</div>
              <div>Payment Date</div>
              <div>Status</div>
            </div>
            {paidApplications.map((application) => (
              <div key={application.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 100px', gap: '12px', padding: '12px 16px', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
                <div>{application.artist_name}</div>
                <div>{formatCurrency(application.total_fees)}</div>
                <div>{formatDate(application.payment_date)}</div>
                <div><span className="status-badge active">Confirmed</span></div>
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
