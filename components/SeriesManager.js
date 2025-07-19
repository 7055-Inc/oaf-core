import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from './SeriesManager.module.css';

export default function SeriesManager() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);

  // Form data for creating new series
  const [formData, setFormData] = useState({
    series_name: '',
    series_description: '',
    recurrence_pattern: 'yearly',
    recurrence_interval: 1,
    series_start_date: '',
    series_end_date: '',
    auto_generate: true,
    generate_months_ahead: 12
  });

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/series');
      
      if (response.ok) {
        const data = await response.json();
        setSeries(data.series || []);
      } else {
        setError('Failed to fetch series');
      }
    } catch (err) {
      setError('Error loading series');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeries = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({
          series_name: '',
          series_description: '',
          recurrence_pattern: 'yearly',
          recurrence_interval: 1,
          series_start_date: '',
          series_end_date: '',
          auto_generate: true,
          generate_months_ahead: 12
        });
        await fetchSeries();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create series');
      }
    } catch (err) {
      setError('Error creating series');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNextEvent = async (seriesId) => {
    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/series/${seriesId}/generate`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Next event generated successfully! Event ID: ${data.event_id}`);
        await fetchSeries();
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.error}`);
      }
    } catch (err) {
      alert('❌ Error generating event');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      active: '#28a745',
      paused: '#ffc107',
      completed: '#6c757d',
      cancelled: '#dc3545'
    };

    return (
      <span 
        className={styles.statusBadge}
        style={{ backgroundColor: statusColors[status] || '#6c757d' }}
      >
        {status}
      </span>
    );
  };

  const getRecurrenceText = (pattern, interval) => {
    if (interval === 1) {
      return pattern.charAt(0).toUpperCase() + pattern.slice(1);
    }
    return `Every ${interval} ${pattern.slice(0, -2)}${interval > 1 ? 's' : ''}`;
  };

  if (loading && series.length === 0) {
    return <div className={styles.loading}>Loading series...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🔄 Event Series Management</h2>
        <p>Create and manage recurring event series with automated generation</p>
        <button 
          className={styles.createButton}
          onClick={() => setShowCreateForm(true)}
        >
          <i className="fas fa-plus"></i>
          Create New Series
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Create New Event Series</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowCreateForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateSeries} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Series Name *</label>
                <input
                  type="text"
                  value={formData.series_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, series_name: e.target.value }))}
                  required
                  className={styles.input}
                  placeholder="e.g., Annual Spring Art Festival"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.series_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, series_description: e.target.value }))}
                  className={styles.textarea}
                  rows="3"
                  placeholder="Brief description of the series..."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Recurrence Pattern *</label>
                  <select
                    value={formData.recurrence_pattern}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrence_pattern: e.target.value }))}
                    className={styles.select}
                  >
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Interval</label>
                  <select
                    value={formData.recurrence_interval}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrence_interval: parseInt(e.target.value) }))}
                    className={styles.select}
                  >
                    <option value={1}>Every</option>
                    <option value={2}>Every 2</option>
                    <option value={3}>Every 3</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Series Start Date *</label>
                  <input
                    type="date"
                    value={formData.series_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, series_start_date: e.target.value }))}
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Series End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.series_end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, series_end_date: e.target.value }))}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.auto_generate}
                      onChange={(e) => setFormData(prev => ({ ...prev, auto_generate: e.target.checked }))}
                    />
                    Auto-generate events
                  </label>
                  <small>Automatically create future events based on the schedule</small>
                </div>

                <div className={styles.formGroup}>
                  <label>Generate Months Ahead</label>
                  <input
                    type="number"
                    value={formData.generate_months_ahead}
                    onChange={(e) => setFormData(prev => ({ ...prev, generate_months_ahead: parseInt(e.target.value) }))}
                    min="1"
                    max="36"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowCreateForm(false)} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Series'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Series List */}
      <div className={styles.seriesList}>
        {series.length === 0 ? (
          <div className={styles.emptySeries}>
            <h3>No Event Series Yet</h3>
            <p>Create your first recurring event series to automate your event management!</p>
          </div>
        ) : (
          series.map(seriesItem => (
            <div key={seriesItem.id} className={styles.seriesCard}>
              <div className={styles.seriesHeader}>
                <div className={styles.seriesInfo}>
                  <h3>{seriesItem.series_name}</h3>
                  <p>{seriesItem.series_description}</p>
                </div>
                <div className={styles.seriesStatus}>
                  {getStatusBadge(seriesItem.series_status)}
                </div>
              </div>

              <div className={styles.seriesDetails}>
                <div className={styles.seriesStats}>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Recurrence:</span>
                    <span className={styles.statValue}>
                      {getRecurrenceText(seriesItem.recurrence_pattern, seriesItem.recurrence_interval)}
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Events Created:</span>
                    <span className={styles.statValue}>{seriesItem.events_count || 0}</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Auto-Generate:</span>
                    <span className={styles.statValue}>
                      {seriesItem.auto_generate ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                </div>

                <div className={styles.seriesActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleGenerateNextEvent(seriesItem.id)}
                    disabled={loading}
                  >
                    <i className="fas fa-plus"></i>
                    Generate Next Event
                  </button>
                  <button className={styles.actionButton}>
                    <i className="fas fa-cog"></i>
                    Manage Series
                  </button>
                </div>
              </div>

              {seriesItem.latest_event_date && (
                <div className={styles.seriesFooter}>
                  <small>
                    Latest event: {new Date(seriesItem.latest_event_date).toLocaleDateString()}
                  </small>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 