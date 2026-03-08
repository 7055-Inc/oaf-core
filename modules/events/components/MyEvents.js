/**
 * MyEvents Component
 * - Promoters: Events they created (official events)
 * - Artists: Full calendar = applied events (from applications) + custom personal events.
 *   Replaces old "My Calendar": same data, summary cards, add/edit/delete custom events.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchMyEvents, fetchCustomEvents, createCustomEvent, updateCustomEvent, deleteCustomEvent, checkDuplicateEvents, appendArtistToClaim } from '../../../lib/events';
import { fetchMyApplications } from '../../../lib/applications';

// Convert ISO or YYYY-MM-DD to date input value
function toDateInputValue(dateString) {
  if (!dateString) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function CustomEventModal({ onSave, onCancel, initialData = null }) {
  const getInitialFormData = () => {
    if (!initialData) {
      return {
        event_name: '',
        event_start_date: '',
        event_end_date: '',
        venue_name: '',
        city: '',
        state: '',
        website: '',
        promoter_name: '',
        promoter_email: '',
        notify_promoter: true
      };
    }
    return {
      ...initialData,
      event_start_date: toDateInputValue(initialData.event_start_date),
      event_end_date: toDateInputValue(initialData.event_end_date)
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [step, setStep] = useState('form'); // 'form' | 'checking' | 'matches' | 'saving'
  const [matches, setMatches] = useState([]);
  const [appendStatus, setAppendStatus] = useState(null); // null | 'appending' | 'done' | 'error'

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (initialData) {
      onSave(formData);
      return;
    }

    setStep('checking');
    try {
      const found = await checkDuplicateEvents(formData);
      if (found && found.length > 0) {
        setMatches(found);
        setStep('matches');
      } else {
        setStep('saving');
        onSave(formData);
      }
    } catch (err) {
      console.error('Dedup check failed, proceeding with creation:', err);
      setStep('saving');
      onSave(formData);
    }
  };

  const handleAppendToClaim = async (match) => {
    setAppendStatus('appending');
    try {
      await appendArtistToClaim(match.custom_event_id);
      setAppendStatus('done');
    } catch (err) {
      console.error('Failed to append to claim:', err);
      setAppendStatus('error');
    }
  };

  const handleCreateAnyway = () => {
    setStep('saving');
    onSave(formData);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  if (step === 'checking') {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p>Checking for similar events...</p>
        </div>
      </div>
    );
  }

  if (step === 'matches') {
    if (appendStatus === 'done') {
      return (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <i className="fas fa-check-circle" style={{ color: '#28a745', fontSize: '48px', marginBottom: '16px' }}></i>
              <h3 style={{ margin: '0 0 12px' }}>You've been added!</h3>
              <p style={{ color: '#666' }}>You've been added to the event claim. The promoter will be notified.</p>
              <button onClick={onCancel} className="btn btn-primary" style={{ marginTop: '20px' }}>Close</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '550px' }}>
          <h3 className="modal-title">We found similar events</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Is one of these the same event you're trying to add?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
            {matches.map((match, idx) => (
              <div key={idx} style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px',
                background: '#fafafa'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{match.title}</div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  {match.start_date && <span>{formatDate(match.start_date)}</span>}
                  {match.venue_city && <span> &middot; {match.venue_city}{match.venue_state ? `, ${match.venue_state}` : ''}</span>}
                  {match.venue_name && <span> &middot; {match.venue_name}</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                  {Math.round(match.similarity * 100)}% match
                  {match.type === 'official' && ' — Official Event'}
                  {match.type === 'custom_claim' && match.creator_name && ` — Added by ${match.creator_name}`}
                </div>
                {match.type === 'official' ? (
                  <a
                    href={`/events/${match.event_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                  >
                    <i className="fas fa-external-link-alt"></i> View Event
                  </a>
                ) : match.type === 'custom_claim' ? (
                  <button
                    onClick={() => handleAppendToClaim(match)}
                    disabled={appendStatus === 'appending'}
                    className="btn btn-primary"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                  >
                    {appendStatus === 'appending' ? 'Joining...' : "Yes, this is my event too"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {appendStatus === 'error' && (
            <p style={{ color: '#dc3545', fontSize: '14px', marginBottom: '12px' }}>Failed to join. Please try again.</p>
          )}
          <div className="modal-actions" style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
            <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
            <button onClick={handleCreateAnyway} className="btn btn-primary">
              No match — Create New Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">{initialData ? 'Edit Custom Event' : 'Add Custom Event'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-group">
            <label>Event Name *</label>
            <input type="text" name="event_name" value={formData.event_name} onChange={handleChange} className="form-input" required />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Start Date *</label>
              <input type="date" name="event_start_date" value={formData.event_start_date} onChange={handleChange} className="form-input" required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>End Date *</label>
              <input type="date" name="event_end_date" value={formData.event_end_date} onChange={handleChange} className="form-input" required />
            </div>
          </div>
          <div className="form-group">
            <label>Venue Name</label>
            <input type="text" name="venue_name" value={formData.venue_name} onChange={handleChange} className="form-input" />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>State</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label>Website</label>
            <input type="text" name="website" value={formData.website} onChange={handleChange} className="form-input" placeholder="example.com or https://example.com" />
          </div>
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600' }}>Promoter Information (Optional)</h4>
            <div className="form-group">
              <label>Promoter Name</label>
              <input type="text" name="promoter_name" value={formData.promoter_name} onChange={handleChange} className="form-input" placeholder="Name of the event organizer" />
            </div>
            <div className="form-group">
              <label>Promoter Email</label>
              <input type="email" name="promoter_email" value={formData.promoter_email} onChange={handleChange} className="form-input" placeholder="promoter@example.com" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" name="notify_promoter" id="notify_promoter" checked={formData.notify_promoter} onChange={handleChange} style={{ width: 'auto', margin: 0 }} />
              <label htmlFor="notify_promoter" style={{ margin: 0, cursor: 'pointer', fontWeight: 'normal' }}>Notify promoter to add this event to Brakebee</label>
            </div>
          </div>
          <div className="modal-actions" style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={step === 'saving'}>
              {step === 'saving' ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyEvents({ userData }) {
  const [events, setEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddCustomEvent, setShowAddCustomEvent] = useState(false);
  const [editingCustomEvent, setEditingCustomEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isPromoter = userData?.permissions?.includes?.('events') || userData?.user_type === 'promoter' || userData?.user_type === 'admin';
  const isArtist = userData?.user_type === 'artist' || userData?.user_type === 'admin';

  useEffect(() => {
    async function load() {
      try {
        if (isPromoter) {
          const data = await fetchMyEvents();
          setEvents(data || []);
          setApplications([]);
          setCustomEvents([]);
        } else if (isArtist) {
          const [apps, custom] = await Promise.all([
            fetchMyApplications().catch(() => []),
            fetchCustomEvents().catch(() => [])
          ]);
          const relevant = (apps || []).filter(a => !['rejected', 'declined'].includes(a.status));
          setApplications(relevant);
          setCustomEvents(Array.isArray(custom) ? custom : []);
          setEvents([]);
        } else {
          setEvents([]);
          setApplications([]);
          setCustomEvents([]);
        }
      } catch (err) {
        console.error('Error loading events:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isPromoter, isArtist]);

  const addCustomEventHandler = async (eventData) => {
    try {
      await createCustomEvent(eventData);
      const custom = await fetchCustomEvents();
      setCustomEvents(Array.isArray(custom) ? custom : []);
      setShowAddCustomEvent(false);
    } catch (err) {
      alert(err.message || 'Failed to add custom event');
    }
  };

  const updateCustomEventHandler = async (eventData) => {
    if (!editingCustomEvent) return;
    try {
      await updateCustomEvent(editingCustomEvent.id, eventData);
      const custom = await fetchCustomEvents();
      setCustomEvents(Array.isArray(custom) ? custom : []);
      setShowEditModal(false);
      setEditingCustomEvent(null);
    } catch (err) {
      alert(err.message || 'Failed to update custom event');
    }
  };

  const handleDeleteCustomEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this custom event?')) return;
    try {
      await deleteCustomEvent(eventId);
      setCustomEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      alert(err.message || 'Failed to delete custom event');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  const getApplicationStatusLabel = (status) => {
    switch (status) {
      case 'submitted': return 'Applied';
      case 'under_review': return 'Under Review';
      case 'accepted': return 'Accepted';
      case 'confirmed': return 'Exhibiting';
      case 'waitlisted': return 'Waitlisted';
      default: return 'Applied';
    }
  };

  const getApplicationStatusClass = (status) => {
    switch (status) {
      case 'submitted': case 'under_review': case 'accepted': return 'status-badge status-info';
      case 'confirmed': return 'status-badge status-success';
      case 'waitlisted': return 'status-badge status-warning';
      default: return 'status-badge';
    }
  };

  const getPromoterStatusClass = (status) => {
    switch (status) {
      case 'active': return 'status-badge status-success';
      case 'draft': return 'status-badge status-warning';
      case 'archived': return 'status-badge status-muted';
      default: return 'status-badge';
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary-color)' }}></i>
        <span>Loading events...</span>
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

  // ——— Promoter: events they created ———
  if (isPromoter) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Link href="/dashboard/events/new" className="btn btn-primary">
            <i className="fas fa-plus"></i> Create Event
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-alt" style={{ fontSize: '48px', color: '#ccc', marginBottom: '1rem' }}></i>
            <h3>No Events Yet</h3>
            <p>You haven&apos;t created any events yet.</p>
            <Link href="/dashboard/events/new" className="btn btn-primary">Create Your First Event</Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Dates</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{event.title}</div>
                      {event.event_type_name && <div style={{ fontSize: '12px', color: '#666' }}>{event.event_type_name}</div>}
                    </td>
                    <td>
                      <div>{formatDate(event.start_date)}</div>
                      {event.end_date !== event.start_date && <div style={{ fontSize: '12px', color: '#666' }}>to {formatDate(event.end_date)}</div>}
                    </td>
                    <td>
                      {event.venue_city && event.venue_state ? <span>{event.venue_city}, {event.venue_state}</span> : <span style={{ color: '#999' }}>—</span>}
                    </td>
                    <td>
                      <span className={getPromoterStatusClass(event.event_status)}>{event.event_status || 'Draft'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link href={`/events/${event.id}`} className="btn btn-sm btn-secondary" title="View"><i className="fas fa-eye"></i></Link>
                        <Link href={`/dashboard/events/${event.id}/edit`} className="btn btn-sm btn-secondary" title="Edit"><i className="fas fa-edit"></i></Link>
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

  // ——— Artist: calendar = applied + custom ———
  const appCount = applications.length;
  const customCount = customEvents.length;
  const exhibitingCount = applications.filter(a => a.status === 'confirmed').length;
  const appliedCount = applications.filter(a => ['submitted', 'under_review', 'accepted'].includes(a.status)).length;
  const waitlistedCount = applications.filter(a => a.status === 'waitlisted').length;

  const appLocation = (a) => {
    const parts = [a.event_venue_city, a.event_venue_state].filter(Boolean);
    return parts.length ? parts.join(', ') : (a.event_venue_name || '—');
  };

  return (
    <div className="section-box">
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '24px' }}>
        <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745', marginBottom: '5px' }}>{exhibitingCount}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Exhibiting</div>
        </div>
        <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>{appliedCount}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Applied</div>
        </div>
        <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107', marginBottom: '5px' }}>{waitlistedCount}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Waitlisted</div>
        </div>
        <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1', marginBottom: '5px' }}>{customCount}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Custom Events</div>
        </div>
      </div>

      <h3 style={{ marginBottom: '16px' }}>Upcoming Events</h3>

      {appCount === 0 && customCount === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h4>No Events in Your Calendar</h4>
          <p style={{ marginBottom: '20px' }}>Start by applying to events or adding your own custom events.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/events/find" className="btn btn-primary">Find New Events</Link>
            <button type="button" onClick={() => setShowAddCustomEvent(true)} className="btn btn-secondary">Add Custom Event</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {applications.map((app) => (
            <div key={`app-${app.id}`} className="form-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#007bff', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>{app.event_title}</h4>
                  <span className={getApplicationStatusClass(app.status)}>{getApplicationStatusLabel(app.status)}</span>
                </div>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  {formatDate(app.event_start_date)} – {formatDate(app.event_end_date)}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>{appLocation(app)}</p>
              </div>
              <div>
                <Link href={`/events/${app.event_id}`} className="btn btn-sm btn-secondary">View Event</Link>
              </div>
            </div>
          ))}
          {customEvents.map((event) => (
            <div key={`custom-${event.id}`} className="form-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#6f42c1', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>{event.event_name}</h4>
                  <span className="status-badge status-muted">Personal Event</span>
                </div>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  {formatDate(event.event_start_date)} – {formatDate(event.event_end_date)}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  {[event.venue_name, event.city, event.state].filter(Boolean).join(', ') || '—'}
                </p>
                {event.website && (
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <a href={event.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>Event Website</a>
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button type="button" onClick={() => { setEditingCustomEvent(event); setShowEditModal(true); }} className="btn btn-sm btn-secondary">Edit</button>
                <button type="button" onClick={() => handleDeleteCustomEvent(event.id)} className="btn btn-sm btn-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(appCount > 0 || customCount > 0) && (
        <div style={{ marginTop: '20px' }}>
          <button type="button" onClick={() => setShowAddCustomEvent(true)} className="btn btn-secondary">
            <i className="fas fa-plus"></i> Add Custom Event
          </button>
        </div>
      )}

      {showAddCustomEvent && (
        <CustomEventModal onSave={addCustomEventHandler} onCancel={() => setShowAddCustomEvent(false)} />
      )}
      {showEditModal && editingCustomEvent && (
        <CustomEventModal
          initialData={editingCustomEvent}
          onSave={updateCustomEventHandler}
          onCancel={() => { setShowEditModal(false); setEditingCustomEvent(null); }}
        />
      )}
    </div>
  );
}
