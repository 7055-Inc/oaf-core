import { useState, useEffect } from 'react';
import styles from './ApplicationForm.module.css';

export default function ApplicationForm({ event, user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    artist_statement: '',
    portfolio_url: '',
    booth_preferences: {
      booth_type: 'single',
      corner_booth: false,
      electricity: false,
      special_requests: ''
    },
    additional_info: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applicationStats, setApplicationStats] = useState(null);

  // Fetch application stats when component loads
  useEffect(() => {
    if (event?.id) {
      fetch(`https://api2.onlineartfestival.com/api/applications/events/${event.id}/stats`)
        .then(res => res.json())
        .then(data => setApplicationStats(data.stats))
        .catch(err => console.error('Error fetching application stats:', err));
    }
  }, [event?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBoothPreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      booth_preferences: {
        ...prev.booth_preferences,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to submit an application');
      }

      const response = await fetch(`https://api2.onlineartfestival.com/api/applications/events/${event.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      // Success - call parent callback
      if (onSubmit) {
        onSubmit(data.application);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalFees = () => {
    let total = 0;
    if (event?.application_fee) total += parseFloat(event.application_fee);
    if (event?.jury_fee) total += parseFloat(event.jury_fee);
    return total;
  };

  if (!event) {
    return <div className={styles.error}>Event information not available</div>;
  }

  return (
    <div className={styles.applicationForm}>
      <div className={styles.header}>
        <h2>Apply to {event.title}</h2>
        <p className={styles.subtitle}>
          Submit your application to participate in this event
        </p>
      </div>

      {/* Application Stats */}
      {applicationStats && (
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{applicationStats.total_applications}</span>
            <span className={styles.statLabel}>Total Applications</span>
          </div>
          {event.max_applications && (
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {event.max_applications - applicationStats.total_applications}
              </span>
              <span className={styles.statLabel}>Spots Remaining</span>
            </div>
          )}
        </div>
      )}

      {/* Fee Information */}
      {calculateTotalFees() > 0 && (
        <div className={styles.feeInfo}>
          <h3>Application Fees</h3>
          <div className={styles.feeBreakdown}>
            {event.application_fee > 0 && (
              <div className={styles.feeItem}>
                <span>Application Fee:</span>
                <span>${parseFloat(event.application_fee).toFixed(2)}</span>
              </div>
            )}
            {event.jury_fee > 0 && (
              <div className={styles.feeItem}>
                <span>Jury Fee:</span>
                <span>${parseFloat(event.jury_fee).toFixed(2)}</span>
              </div>
            )}
            <div className={styles.feeTotal}>
              <span>Total Due at Submission:</span>
              <span>${calculateTotalFees().toFixed(2)}</span>
            </div>
          </div>
          <p className={styles.feeNote}>
            <i className="fas fa-info-circle"></i>
            Application and jury fees are non-refundable
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Artist Statement */}
        <div className={styles.formGroup}>
          <label htmlFor="artist_statement" className={styles.label}>
            Artist Statement *
          </label>
          <textarea
            id="artist_statement"
            name="artist_statement"
            value={formData.artist_statement}
            onChange={handleInputChange}
            placeholder="Tell us about your art, your inspiration, and why you want to participate in this event..."
            rows={6}
            required
            className={styles.textarea}
          />
          <div className={styles.charCount}>
            {formData.artist_statement.length} characters
          </div>
        </div>

        {/* Portfolio URL */}
        <div className={styles.formGroup}>
          <label htmlFor="portfolio_url" className={styles.label}>
            Portfolio URL
          </label>
          <input
            type="url"
            id="portfolio_url"
            name="portfolio_url"
            value={formData.portfolio_url}
            onChange={handleInputChange}
            placeholder="https://yourportfolio.com"
            className={styles.input}
          />
          <div className={styles.fieldHelp}>
            Link to your online portfolio, website, or social media showcasing your work
          </div>
        </div>

        {/* Booth Preferences */}
        <div className={styles.formSection}>
          <h3>Booth Preferences</h3>
          
          <div className={styles.formGroup}>
            <label htmlFor="booth_type" className={styles.label}>
              Booth Type
            </label>
            <select
              id="booth_type"
              name="booth_type"
              value={formData.booth_preferences.booth_type}
              onChange={handleBoothPreferenceChange}
              className={styles.select}
            >
              <option value="single">Single Booth</option>
              <option value="double">Double Booth</option>
              <option value="premium">Premium Booth</option>
            </select>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="corner_booth"
                checked={formData.booth_preferences.corner_booth}
                onChange={handleBoothPreferenceChange}
                className={styles.checkbox}
              />
              <span>Corner booth preferred (if available)</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="electricity"
                checked={formData.booth_preferences.electricity}
                onChange={handleBoothPreferenceChange}
                className={styles.checkbox}
              />
              <span>Electricity required</span>
            </label>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="special_requests" className={styles.label}>
              Special Requests
            </label>
            <textarea
              id="special_requests"
              name="special_requests"
              value={formData.booth_preferences.special_requests}
              onChange={handleBoothPreferenceChange}
              placeholder="Any special booth requirements or requests..."
              rows={3}
              className={styles.textarea}
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className={styles.formGroup}>
          <label htmlFor="additional_info" className={styles.label}>
            Additional Information
          </label>
          <textarea
            id="additional_info"
            name="additional_info"
            value={formData.additional_info}
            onChange={handleInputChange}
            placeholder="Any additional information you'd like to share..."
            rows={4}
            className={styles.textarea}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.error}>
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {/* Form Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Submitting...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Submit Application
                {calculateTotalFees() > 0 && ` ($${calculateTotalFees().toFixed(2)})`}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 