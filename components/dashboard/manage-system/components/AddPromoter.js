import React, { useState } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import styles from '../../SlideIn.module.css';

const AddPromoter = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Promoter Info
    promoter_email: '',
    promoter_first_name: '',
    promoter_last_name: '',
    promoter_business_name: '',
    
    // Event Info
    event_title: '',
    event_start_date: '',
    event_end_date: '',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    venue_state: '',
    venue_zip: '',
    event_description: ''
  });

  // Check if email already exists
  const checkEmailExists = async (email) => {
    if (!email || email.length < 3) {
      setDuplicateCheck(null);
      return;
    }

    try {
      setCheckingEmail(true);
      const response = await authApiRequest(`admin/promoters/check-email?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error('Failed to check email');
      }

      const data = await response.json();
      setDuplicateCheck(data.exists ? {
        exists: true,
        message: `⚠️ This promoter already exists in the system. User ID: ${data.user_id}`,
        user: data
      } : null);
    } catch (err) {
      console.error('Error checking email:', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check email on change (debounced)
    if (name === 'promoter_email') {
      clearTimeout(window.emailCheckTimeout);
      window.emailCheckTimeout = setTimeout(() => {
        checkEmailExists(value);
      }, 500);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Don't allow submission if duplicate exists
    if (duplicateCheck?.exists) {
      setError('Cannot create promoter - email already exists in system');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authApiRequest('admin/promoters/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create promoter');
      }

      const data = await response.json();
      
      setSuccess(`✅ Promoter created successfully! Claim email sent to ${formData.promoter_email}`);
      
      // Reset form
      setFormData({
        promoter_email: '',
        promoter_first_name: '',
        promoter_last_name: '',
        promoter_business_name: '',
        event_title: '',
        event_start_date: '',
        event_end_date: '',
        venue_name: '',
        venue_address: '',
        venue_city: '',
        venue_state: '',
        venue_zip: '',
        event_description: ''
      });
      setDuplicateCheck(null);

    } catch (err) {
      setError(err.message);
      console.error('Error creating promoter:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.slideInContent}>
      <div className={styles.contentArea}>
        <h2 className={styles.sectionTitle}>Add Promoter</h2>
        <p className={styles.sectionDescription}>
          Create a draft promoter account and event. An email will be sent to the promoter 
          with a claim link to activate their account and claim the event.
        </p>

        {error && (
          <div className={styles.errorMessage} style={{ 
            padding: '12px', 
            background: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '4px',
            marginBottom: '20px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div className={styles.successMessage} style={{ 
            padding: '12px', 
            background: '#efe', 
            border: '1px solid #cfc', 
            borderRadius: '4px',
            marginBottom: '20px',
            color: '#060'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Promoter Information Section */}
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Promoter Information</h3>
            
            <div className={styles.formGroup}>
              <label htmlFor="promoter_email" className={styles.label}>
                Email Address <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="email"
                id="promoter_email"
                name="promoter_email"
                value={formData.promoter_email}
                onChange={handleInputChange}
                required
                className={styles.input}
                placeholder="promoter@example.com"
              />
              {checkingEmail && (
                <small style={{ color: '#666', fontStyle: 'italic' }}>Checking...</small>
              )}
              {duplicateCheck?.exists && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#fff3cd', 
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  {duplicateCheck.message}
                </div>
              )}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="promoter_first_name" className={styles.label}>
                  First Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  id="promoter_first_name"
                  name="promoter_first_name"
                  value={formData.promoter_first_name}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="promoter_last_name" className={styles.label}>
                  Last Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  id="promoter_last_name"
                  name="promoter_last_name"
                  value={formData.promoter_last_name}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="promoter_business_name" className={styles.label}>
                Business Name
              </label>
              <input
                type="text"
                id="promoter_business_name"
                name="promoter_business_name"
                value={formData.promoter_business_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Optional: Company or organization name"
              />
            </div>
          </div>

          {/* Event Information Section */}
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Event Information</h3>
            
            <div className={styles.formGroup}>
              <label htmlFor="event_title" className={styles.label}>
                Event Title <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="event_title"
                name="event_title"
                value={formData.event_title}
                onChange={handleInputChange}
                required
                className={styles.input}
                placeholder="e.g., Annual Art Fair 2025"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="event_start_date" className={styles.label}>
                  Start Date <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  id="event_start_date"
                  name="event_start_date"
                  value={formData.event_start_date}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="event_end_date" className={styles.label}>
                  End Date <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  id="event_end_date"
                  name="event_end_date"
                  value={formData.event_end_date}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="venue_name" className={styles.label}>
                Venue Name
              </label>
              <input
                type="text"
                id="venue_name"
                name="venue_name"
                value={formData.venue_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="e.g., City Convention Center"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="venue_address" className={styles.label}>
                Venue Address
              </label>
              <input
                type="text"
                id="venue_address"
                name="venue_address"
                value={formData.venue_address}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Street address"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="venue_city" className={styles.label}>
                  City
                </label>
                <input
                  type="text"
                  id="venue_city"
                  name="venue_city"
                  value={formData.venue_city}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="venue_state" className={styles.label}>
                  State
                </label>
                <input
                  type="text"
                  id="venue_state"
                  name="venue_state"
                  value={formData.venue_state}
                  onChange={handleInputChange}
                  className={styles.input}
                  maxLength="2"
                  placeholder="e.g., CA"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="venue_zip" className={styles.label}>
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="venue_zip"
                  name="venue_zip"
                  value={formData.venue_zip}
                  onChange={handleInputChange}
                  className={styles.input}
                  maxLength="10"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="event_description" className={styles.label}>
                Event Description
              </label>
              <textarea
                id="event_description"
                name="event_description"
                value={formData.event_description}
                onChange={handleInputChange}
                className={styles.textarea}
                rows="4"
                placeholder="Brief description of the event"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={loading || duplicateCheck?.exists}
              className={styles.primaryButton}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: (loading || duplicateCheck?.exists) ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (loading || duplicateCheck?.exists) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create Promoter & Send Claim Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPromoter;

