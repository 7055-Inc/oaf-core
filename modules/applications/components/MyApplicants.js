/**
 * My Applicants
 * Promoter view: manage applications received for their events.
 * Lives under Business Center; uses lib/applications for API.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchPromoterEventsWithApplications,
  fetchEventApplications,
  updateApplicationStatus
} from '../../../lib/applications';
import { ApplicationCard, BulkAcceptanceInterface, PaymentDashboard } from './applications-received';

export default function MyApplicants({ userData }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (userData?.id) {
      fetchPromoterEvents();
    }
  }, [userData?.id]);

  const fetchPromoterEvents = async () => {
    try {
      const data = await fetchPromoterEventsWithApplications(userData.id);
      setEvents(Array.isArray(data) ? data : []);
      if (data?.length > 0) {
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
      const data = await fetchEventApplications(eventId);
      setApplications(data || []);
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

  const handleStatusUpdate = async (applicationId, status, juryComments = '') => {
    try {
      await updateApplicationStatus(applicationId, status, juryComments);
      if (selectedEvent) fetchApplications(selectedEvent.id);
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
    return (
      <div className="loading-state">
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary-color)' }}></i>
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="section-box">
        <div className="section-header">
          <h2>My Applicants</h2>
        </div>
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No Events Accepting Applications</h3>
          <p style={{ marginBottom: '20px' }}>You don&apos;t have any events that accept applications yet.</p>
          <Link href="/dashboard/events/new" className="btn btn-primary">
            Create New Event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section-box">
      <div className="section-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>My Applicants</h2>
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
          <div className="form-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{selectedEvent.title}</h3>
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>Date:</strong> {formatDate(selectedEvent.start_date)} – {formatDate(selectedEvent.end_date)}
            </p>
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>Application Status:</strong>{' '}
              <span className="status-badge status-success" style={{ marginLeft: '8px' }}>
                {selectedEvent.application_status?.replace('_', ' ')}
              </span>
            </p>
          </div>

          <div className="form-card" style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0' }}>Application Statistics</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{applications.length}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{applicationStats.submitted || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Submitted</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>{applicationStats.under_review || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Under Review</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{applicationStats.accepted || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Accepted</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{applicationStats.confirmed || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Confirmed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>{applicationStats.waitlisted || 0}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Waitlisted</div>
              </div>
            </div>
          </div>

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

          {statusFilter === 'submitted' && filteredApplications.length > 0 && (
            <BulkAcceptanceInterface
              applications={filteredApplications}
              selectedEvent={selectedEvent}
              onBulkAccept={() => fetchApplications(selectedEvent.id)}
            />
          )}

          {statusFilter === 'accepted' && (
            <PaymentDashboard
              applications={filteredApplications}
              selectedEvent={selectedEvent}
              onRefresh={() => fetchApplications(selectedEvent.id)}
            />
          )}

          {applicationsLoading ? (
            <div className="loading-state">Loading applications...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
              <h4>No Applications Found</h4>
              <p>
                {statusFilter === 'all'
                  ? 'No applications have been submitted for this event yet.'
                  : `No applications with status "${statusFilter.replace('_', ' ')}".`}
              </p>
            </div>
          ) : (
            <div>
              {filteredApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
