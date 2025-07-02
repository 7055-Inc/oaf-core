import { useState, useEffect } from 'react';
import styles from './ApplicationStatus.module.css';

export default function ApplicationStatus({ eventId, user }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId || !user) return;

    const fetchApplicationStatus = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setLoading(false);
          return;
        }

        // Get user's applications and find the one for this event
        const response = await fetch('https://api2.onlineartfestival.com/api/applications/my-applications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch applications');
        }

        const data = await response.json();
        const eventApplication = data.applications.find(app => app.event_id == eventId);
        
        setApplication(eventApplication || null);
      } catch (err) {
        console.error('Error fetching application status:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationStatus();
  }, [eventId, user]);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          color: '#6c757d',
          icon: 'fas fa-edit',
          description: 'Application saved but not submitted'
        };
      case 'submitted':
        return {
          label: 'Submitted',
          color: '#007bff',
          icon: 'fas fa-paper-plane',
          description: 'Application submitted, awaiting review'
        };
      case 'under_review':
        return {
          label: 'Under Review',
          color: '#ffc107',
          icon: 'fas fa-search',
          description: 'Application is being reviewed by the jury'
        };
      case 'accepted':
        return {
          label: 'Accepted',
          color: '#28a745',
          icon: 'fas fa-check-circle',
          description: 'Congratulations! Your application has been accepted'
        };
      case 'rejected':
        return {
          label: 'Not Selected',
          color: '#dc3545',
          icon: 'fas fa-times-circle',
          description: 'Application was not selected this time'
        };
      case 'waitlisted':
        return {
          label: 'Waitlisted',
          color: '#fd7e14',
          icon: 'fas fa-clock',
          description: 'You are on the waiting list for this event'
        };
      case 'confirmed':
        return {
          label: 'Confirmed',
          color: '#20c997',
          icon: 'fas fa-star',
          description: 'Confirmed! You are participating in this event'
        };
      default:
        return {
          label: 'Unknown',
          color: '#6c757d',
          icon: 'fas fa-question',
          description: 'Status unknown'
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.statusCard}>
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          Checking application status...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.statusCard}>
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          Unable to load application status
        </div>
      </div>
    );
  }

  if (!application) {
    return null; // No application found for this event
  }

  const statusInfo = getStatusInfo(application.status);

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusHeader}>
        <div className={styles.statusBadge} style={{ backgroundColor: statusInfo.color }}>
          <i className={statusInfo.icon}></i>
          <span>{statusInfo.label}</span>
        </div>
        <div className={styles.submissionDate}>
          Applied {formatDate(application.submitted_at)}
        </div>
      </div>

      <div className={styles.statusDescription}>
        {statusInfo.description}
      </div>

      {application.jury_comments && (
        <div className={styles.juryComments}>
          <h4>Jury Comments</h4>
          <p>{application.jury_comments}</p>
        </div>
      )}

      {application.status === 'accepted' && (
        <div className={styles.nextSteps}>
          <h4>Next Steps</h4>
          <p>
            <i className="fas fa-info-circle"></i>
            You'll receive an email with booth fee details and confirmation instructions.
          </p>
        </div>
      )}

      {application.status === 'waitlisted' && (
        <div className={styles.nextSteps}>
          <h4>What's Next?</h4>
          <p>
            <i className="fas fa-info-circle"></i>
            You'll be notified if a spot becomes available. No action needed at this time.
          </p>
        </div>
      )}

      <div className={styles.applicationDetails}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Application ID:</span>
          <span className={styles.detailValue}>#{application.id}</span>
        </div>
        
        {application.portfolio_url && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Portfolio:</span>
            <a 
              href={application.portfolio_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.portfolioLink}
            >
              View Portfolio <i className="fas fa-external-link-alt"></i>
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 