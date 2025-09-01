import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuthToken } from '../../../../lib/csrf';
import styles from '../../SlideIn.module.css';

export default function MyApplications({ userData }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view applications');
      }

      const response = await fetch('https://api2.onlineartfestival.com/api/applications/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'draft': styles.statusDefault,
      'submitted': styles.statusProcessing,
      'under_review': styles.statusPending,
      'accepted': styles.statusCompleted,
      'rejected': styles.statusFailed,
      'declined': styles.statusDefault,
      'confirmed': styles.statusCompleted,
      'waitlisted': styles.statusPending
    };
    return statusMap[status] || styles.statusDefault;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading-state">Loading applications...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>My Applications</h2>
        <Link href="/events" className="primary">
          Browse Events
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No Applications Yet</h3>
          <p style={{ marginBottom: '20px' }}>You haven't applied to any events yet. Start exploring events and apply to showcase your art!</p>
          <Link href="/events" className="primary">
            Browse Events
          </Link>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeader}>
                <th className={styles.tableHeaderCell}>Event</th>
                <th className={styles.tableHeaderCell}>Applied Date</th>
                <th className={styles.tableHeaderCell}>Status</th>
                <th className={styles.tableHeaderCell}>Fees</th>
                <th className={styles.tableHeaderCell}>Event Date</th>
                <th className={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <strong>{app.event_title}</strong>
                    <br />
                    <small style={{ color: '#666' }}>{app.event_location}</small>
                  </td>
                  <td className={styles.tableCell}>{formatDate(app.applied_date)}</td>
                  <td className={styles.tableCell}>
                    <span className={getStatusBadgeClass(app.status)}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={styles.tableCell}>
                    {app.total_fees > 0 ? `$${parseFloat(app.total_fees).toFixed(2)}` : 'Free'}
                  </td>
                  <td className={styles.tableCell}>{formatDate(app.event_start_date)}</td>
                  <td className={styles.tableCell}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link 
                        href={`/events/${app.event_id}`} 
                        className="secondary"
                        style={{ fontSize: '14px', padding: '6px 12px' }}
                      >
                        View Event
                      </Link>
                      {app.status === 'draft' && (
                        <button className="primary" style={{ fontSize: '14px', padding: '6px 12px' }}>
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
