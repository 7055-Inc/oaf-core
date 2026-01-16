import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

export default function ApplicationRefunds() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refunding, setRefunding] = useState(null);
  const [refundError, setRefundError] = useState(null);
  const [refundSuccess, setRefundSuccess] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [page, searchTerm]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: 'submitted,accepted,under_review',
        ...(searchTerm && { search: searchTerm })
      });

      const response = await authenticatedApiRequest(getApiUrl(`admin/applications?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.applications || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (application) => {
    if (!confirm(`Are you sure you want to refund $${parseFloat(application.amount_paid || 0).toFixed(2)} for application #${application.id}?\n\nThis will:\n- Refund the artist's payment\n- Reverse any transfer to the promoter\n- Mark the application as refunded`)) {
      return;
    }

    try {
      setRefunding(application.id);
      setRefundError(null);
      setRefundSuccess(null);
      
      const response = await authenticatedApiRequest(getApiUrl(`admin/applications/${application.id}/refund`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      setRefundSuccess(`Refund processed successfully for application #${application.id}`);
      
      // Refresh the list
      fetchApplications();
    } catch (err) {
      setRefundError(err.message);
    } finally {
      setRefunding(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'submitted': { class: styles.statusProcessing, label: 'Submitted' },
      'accepted': { class: styles.statusCompleted, label: 'Accepted' },
      'under_review': { class: styles.statusPending, label: 'Under Review' },
      'rejected': { class: styles.statusFailed, label: 'Rejected' },
      'refunded': { class: styles.statusDefault, label: 'Refunded' }
    };
    const info = statusMap[status] || { class: styles.statusDefault, label: status };
    return <span className={info.class}>{info.label}</span>;
  };

  if (loading && applications.length === 0) {
    return <div className="loading-state">Loading applications...</div>;
  }

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>Application Fee Refunds</h2>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search by artist name, email, or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <button type="submit" className="primary">
            Search
          </button>
        </div>
      </form>

      {/* Messages */}
      {refundSuccess && (
        <div className="success-alert" style={{ marginBottom: '16px' }}>
          <i className="fas fa-check-circle"></i> {refundSuccess}
        </div>
      )}
      {refundError && (
        <div className="error-alert" style={{ marginBottom: '16px' }}>
          <i className="fas fa-exclamation-triangle"></i> {refundError}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ marginBottom: '16px' }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No Applications Found</h3>
          <p>No paid applications match your search criteria.</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <caption className="sr-only">Application refund requests</caption>
              <thead>
                <tr className={styles.tableHeader}>
                  <th scope="col" className={styles.tableHeaderCell}>ID</th>
                  <th scope="col" className={styles.tableHeaderCell}>Event</th>
                  <th scope="col" className={styles.tableHeaderCell}>Artist</th>
                  <th scope="col" className={styles.tableHeaderCell}>Amount Paid</th>
                  <th scope="col" className={styles.tableHeaderCell}>Date</th>
                  <th scope="col" className={styles.tableHeaderCell}>Status</th>
                  <th scope="col" className={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>#{app.id}</td>
                    <td className={styles.tableCell}>
                      <strong>{app.event_title}</strong>
                      <br />
                      <small style={{ color: '#666' }}>Promoter: {app.promoter_name}</small>
                    </td>
                    <td className={styles.tableCell}>
                      {app.artist_name}
                      <br />
                      <small style={{ color: '#666' }}>{app.artist_email}</small>
                    </td>
                    <td className={styles.tableCell}>
                      ${parseFloat(app.amount_paid || 0).toFixed(2)}
                      {app.refunded_at && (
                        <span style={{ color: '#dc3545', marginLeft: '8px' }}>(Refunded)</span>
                      )}
                    </td>
                    <td className={styles.tableCell}>{formatDate(app.submitted_at)}</td>
                    <td className={styles.tableCell}>{getStatusBadge(app.status)}</td>
                    <td className={styles.tableCell}>
                      {app.amount_paid > 0 && !app.refunded_at ? (
                        <button
                          onClick={() => handleRefund(app)}
                          disabled={refunding === app.id}
                          className="danger"
                          style={{ fontSize: '13px', padding: '6px 12px' }}
                        >
                          {refunding === app.id ? 'Processing...' : 'Refund'}
                        </button>
                      ) : app.refunded_at ? (
                        <span style={{ color: '#6c757d', fontSize: '13px' }}>
                          Refunded {formatDate(app.refunded_at)}
                        </span>
                      ) : (
                        <span style={{ color: '#6c757d', fontSize: '13px' }}>No payment</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="secondary"
              >
                Previous
              </button>
              <span style={{ padding: '8px 16px', alignSelf: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

