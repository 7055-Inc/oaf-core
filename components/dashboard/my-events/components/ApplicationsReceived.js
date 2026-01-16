import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuthToken } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';
import ApplicationCard from './applications-received/ApplicationCard';
import BulkAcceptanceInterface from './applications-received/BulkAcceptanceInterface';
import PaymentDashboard from './applications-received/PaymentDashboard';

export default function ApplicationsReceived({ userData }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPromoterEvents();
  }, []);

  const fetchPromoterEvents = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to manage applications');
      }

      const response = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&allow_applications=1`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data);
      
      // Auto-select first event if available
      if (data.length > 0) {
        setSelectedEvent(data[0]);
        fetchApplications(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (eventId) => {
    setApplicationsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`api/applications/events/${eventId}/applications`), {
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
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    fetchApplications(event.id);
  };

  const updateApplicationStatus = async (applicationId, status, juryComments = '') => {
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`api/applications/${applicationId}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          jury_comments: juryComments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update application status');
      }

      // Refresh applications after status update
      if (selectedEvent) {
        fetchApplications(selectedEvent.id);
      }
    } catch (err) {
      alert('Failed to update application status: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredApplications = statusFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === statusFilter);

  const applicationStats = applications.reduce((stats, app) => {
    stats[app.status] = (stats[app.status] || 0) + 1;
    return stats;
  }, {});

  if (loading) {
    return <div className="loading-state">Loading events...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  if (events.length === 0) {
    return (
      <div className="section-box">
        <div className="section-header">
          <h2>Applications Received</h2>
        </div>
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No Events Accepting Applications</h3>
          <p style={{ marginBottom: '20px' }}>You don't have any events that accept applications yet.</p>
          <Link href="/events/new" className="primary">
            Create New Event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>Applications Received</h2>
        <select 
          value={selectedEvent?.id || ''} 
          onChange={(e) => {
            const event = events.find(ev => ev.id == e.target.value);
            if (event) handleEventSelect(event);
          }}
          className="form-input"
          style={{ width: 'auto', minWidth: '250px' }}
        >
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.title} ({event.application_status})
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Event Details */}
          <div className="form-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{selectedEvent.title}</h3>
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>Date:</strong> {formatDate(selectedEvent.start_date)} - {formatDate(selectedEvent.end_date)}
            </p>
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>Application Status:</strong> 
              <span className={styles.statusCompleted} style={{ marginLeft: '8px' }}>
                {selectedEvent.application_status?.replace('_', ' ')}
              </span>
            </p>
          </div>

          {/* Application Statistics */}
          <div className="form-card" style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0' }}>Application Statistics</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{applications.length}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{applicationStats.submitted || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Submitted</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{applicationStats.under_review || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Under Review</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{applicationStats.accepted || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Accepted</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{applicationStats.confirmed || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Confirmed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>{applicationStats.waitlisted || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Waitlisted</div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ margin: 0 }}>Applications</h4>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', minWidth: '200px' }}
            >
              <option value="all">All Applications ({applications.length})</option>
              <option value="submitted">Submitted ({applicationStats.submitted || 0})</option>
              <option value="under_review">Under Review ({applicationStats.under_review || 0})</option>
              <option value="accepted">Accepted ({applicationStats.accepted || 0})</option>
              <option value="confirmed">Confirmed ({applicationStats.confirmed || 0})</option>
              <option value="waitlisted">Waitlisted ({applicationStats.waitlisted || 0})</option>
              <option value="rejected">Rejected ({applicationStats.rejected || 0})</option>
            </select>
          </div>

          {/* Bulk Acceptance Interface for Submitted Applications */}
          {statusFilter === 'submitted' && filteredApplications.length > 0 && (
            <BulkAcceptanceInterface 
              applications={filteredApplications}
              selectedEvent={selectedEvent}
              onBulkAccept={() => fetchApplications(selectedEvent.id)}
            />
          )}

          {/* Payment Dashboard Interface for Accepted Applications */}
          {statusFilter === 'accepted' && (
            <PaymentDashboard 
              applications={filteredApplications}
              selectedEvent={selectedEvent}
              onRefresh={() => fetchApplications(selectedEvent.id)}
            />
          )}

          {/* Applications List */}
          {applicationsLoading ? (
            <div className="loading-state">Loading applications...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
              <h4>No Applications Found</h4>
              <p>
                {statusFilter === 'all' 
                  ? 'No applications have been submitted for this event yet.' 
                  : `No applications with status "${statusFilter.replace('_', ' ')}".`
                }
              </p>
            </div>
          ) : (
            <div>
              {filteredApplications.map((application) => (
                <ApplicationCard 
                  key={application.id} 
                  application={application} 
                  onStatusUpdate={updateApplicationStatus}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
