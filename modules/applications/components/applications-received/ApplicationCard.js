/**
 * ApplicationCard - single application card for promoter review (applications received).
 * Used by My Applicants (Business Center). Part of events module.
 */

import { useState } from 'react';

export default function ApplicationCard({ application, onStatusUpdate }) {
  const [showDetails, setShowDetails] = useState(false);
  const [juryComments, setJuryComments] = useState(application.jury_comments || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(application.id, newStatus, juryComments);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'draft': 'status-badge muted',
      'submitted': 'status-badge info',
      'under_review': 'status-badge pending',
      'accepted': 'status-badge active',
      'rejected': 'status-badge danger',
      'declined': 'status-badge muted',
      'confirmed': 'status-badge active',
      'waitlisted': 'status-badge pending'
    };
    return statusMap[status] || 'status-badge muted';
  };

  return (
    <div className="form-card" style={{ marginBottom: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <h4 style={{ margin: '0 0 5px 0' }}>{application.artist_name}</h4>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Applied: {formatDate(application.applied_date)}</p>
        </div>
        <span className={getStatusBadgeClass(application.status)}>
          {application.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setShowDetails(!showDetails)} className="secondary" style={{ fontSize: '14px', padding: '6px 12px' }}>
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
        {application.status === 'submitted' && (
          <>
            <button type="button" onClick={() => handleStatusUpdate('under_review')} disabled={isUpdating} className="primary" style={{ fontSize: '14px', padding: '6px 12px' }}>{isUpdating ? 'Updating...' : 'Review'}</button>
            <button type="button" onClick={() => handleStatusUpdate('accepted')} disabled={isUpdating} className="primary" style={{ fontSize: '14px', padding: '6px 12px' }}>Accept</button>
            <button type="button" onClick={() => handleStatusUpdate('rejected')} disabled={isUpdating} className="danger" style={{ fontSize: '14px', padding: '6px 12px' }}>Reject</button>
          </>
        )}
        {application.status === 'under_review' && (
          <>
            <button type="button" onClick={() => handleStatusUpdate('accepted')} disabled={isUpdating} className="primary" style={{ fontSize: '14px', padding: '6px 12px' }}>Accept</button>
            <button type="button" onClick={() => handleStatusUpdate('waitlisted')} disabled={isUpdating} className="secondary" style={{ fontSize: '14px', padding: '6px 12px' }}>Waitlist</button>
            <button type="button" onClick={() => handleStatusUpdate('rejected')} disabled={isUpdating} className="danger" style={{ fontSize: '14px', padding: '6px 12px' }}>Reject</button>
          </>
        )}
      </div>

      {showDetails && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
            <div><strong>Contact:</strong><br />{application.email}<br />{application.phone && `Phone: ${application.phone}`}</div>
            <div><strong>Company:</strong><br />{application.company_name || 'N/A'}</div>
            <div><strong>Total Fees:</strong><br />${parseFloat(application.total_fees || 0).toFixed(2)}</div>
          </div>
          {application.artist_statement && (
            <div style={{ marginBottom: '15px' }}>
              <strong>Artist Statement:</strong>
              <p style={{ marginTop: '5px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>{application.artist_statement}</p>
            </div>
          )}
          <div className="form-group">
            <label>Jury Comments</label>
            <textarea value={juryComments} onChange={(e) => setJuryComments(e.target.value)} className="form-input" rows="3" placeholder="Add comments for this application..." />
          </div>
        </div>
      )}
    </div>
  );
}
