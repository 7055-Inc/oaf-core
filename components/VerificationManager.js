import { useState, useEffect } from 'react';
import styles from './VerificationManager.module.css';
import { getApiUrl } from '../lib/config';

export default function VerificationManager() {
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [applications, setApplications] = useState([]);
  const [canApply, setCanApply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [formData, setFormData] = useState({
    verification_level: 'basic',
    business_name: '',
    years_experience: '',
    art_education: '',
    professional_achievements: '',
    business_documentation: '',
    portfolio_description: '',
    portfolio_images: [],
    exhibition_history: '',
    client_testimonials: '',
    professional_website: '',
    social_media_links: {
      instagram: '',
      facebook: '',
      linkedin: '',
      twitter: ''
    },
    business_address: '',
    professional_phone: ''
  });

  useEffect(() => {
    fetchVerificationData();
  }, []);

  const fetchVerificationData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch verification status from subscriptions endpoint
      const statusResponse = await fetch(getApiUrl('api/subscriptions/verified/my'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setVerificationStatus(statusData.verification_status || null);
        setPendingApplications(statusData.pending_applications || []);
        setCanApply(statusData.can_apply !== false);
      }

      // Fetch all applications history from marketplace applications
      const appsResponse = await fetch(getApiUrl('api/subscriptions/verified/marketplace-applications'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        setApplications(appsData);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (name.startsWith('social_media_links.')) {
      const platform = name.replace('social_media_links.', '');
      setFormData(prev => ({
        ...prev,
        social_media_links: {
          ...prev.social_media_links,
          [platform]: value
        }
      }));
    } else if (type === 'file') {
      // Handle portfolio images
      const fileArray = Array.from(files);
      setFormData(prev => ({
        ...prev,
        portfolio_images: fileArray
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Create the application
      const response = await fetch(getApiUrl('api/subscriptions/verified/marketplace-applications/submit'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create verification application');
      }

      const result = await response.json();

      // Submit the application immediately (simplified for demo - in production, would handle payment first)
      const submitResponse = await fetch(getApiUrl(`api/subscriptions/verified/marketplace-applications/${result.id}/submit`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!submitResponse.ok) {
        throw new Error('Failed to submit application');
      }

      setShowApplicationForm(false);
      await fetchVerificationData();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelApplication = () => {
    setShowApplicationForm(false);
    setFormData({
      verification_level: 'basic',
      business_name: '',
      years_experience: '',
      art_education: '',
      professional_achievements: '',
      business_documentation: '',
      portfolio_description: '',
      portfolio_images: [],
      exhibition_history: '',
      client_testimonials: '',
      professional_website: '',
      social_media_links: {
        instagram: '',
        facebook: '',
        linkedin: '',
        twitter: ''
      },
      business_address: '',
      professional_phone: ''
    });
    setError(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Draft', className: styles.statusDraft },
      submitted: { label: 'Under Review', className: styles.statusSubmitted },
      under_review: { label: 'In Review', className: styles.statusUnderReview },
      approved: { label: 'Approved', className: styles.statusApproved },
      rejected: { label: 'Rejected', className: styles.statusRejected },
      revision_requested: { label: 'Revision Requested', className: styles.statusRevision }
    };

    const config = statusConfig[status] || { label: status, className: styles.statusDefault };
    return <span className={`${styles.statusBadge} ${config.className}`}>{config.label}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && !verificationStatus && applications.length === 0) {
    return <div className={styles.loading}>Loading verification status...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Artist Verification</h2>
        <p className={styles.description}>
          Get verified to access premium features and skip certain application requirements.
        </p>
      </div>

      {error && (
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Current Verification Status */}
      {verificationStatus && (
        <div className={styles.currentStatus}>
          <div className={styles.statusCard}>
            <div className={styles.statusHeader}>
              <div className={styles.statusIcon}>
                <i className={verificationStatus.is_verified ? "fas fa-check-circle" : "fas fa-clock"}></i>
              </div>
              <div className={styles.statusInfo}>
                <h3>{verificationStatus.is_verified ? 'Verified Artist' : 'Not Verified'}</h3>
                {verificationStatus.is_verified ? (
                  <>
                    <p>Verification Level: <strong>{verificationStatus.verification_level}</strong></p>
                    <p>Expires: <strong>{formatDate(verificationStatus.expiry_date)}</strong></p>
                  </>
                ) : (
                  <p>Apply for verification to unlock premium features</p>
                )}
              </div>
              {verificationStatus.is_verified && (
                <div className={styles.verifiedBadge}>
                  <i className="fas fa-certificate"></i>
                  Verified
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div className={styles.pendingApplications}>
          <h3>Pending Applications</h3>
          {pendingApplications.map(app => (
            <div key={app.id} className={styles.pendingCard}>
              <div className={styles.pendingHeader}>
                <div>
                  <strong>{app.verification_level} Verification</strong>
                  <p>Applied: {formatDate(app.created_at)}</p>
                </div>
                {getStatusBadge(app.status)}
              </div>
              {app.status === 'revision_requested' && (
                <div className={styles.revisionNote}>
                  <p><strong>Revision Requested:</strong> Please review and resubmit your application.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Application Form */}
      {showApplicationForm && (
        <div className={styles.applicationForm}>
          <div className={styles.formHeader}>
            <h3>Apply for Verification</h3>
            <button className={styles.closeButton} onClick={handleCancelApplication}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={handleSubmitApplication} className={styles.form}>
            {/* Verification Level */}
            <div className={styles.formGroup}>
              <label htmlFor="verification_level">Verification Level</label>
              <select
                id="verification_level"
                name="verification_level"
                value={formData.verification_level}
                onChange={handleInputChange}
                className={styles.select}
                required
              >
                <option value="basic">Basic Verification ($25) - Skip basic fields</option>
                <option value="premium">Premium Verification ($75) - Skip all optional fields</option>
              </select>
            </div>

            {/* Business Information */}
            <div className={styles.formSection}>
              <h4>Professional Information</h4>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="business_name">Business/Professional Name *</label>
                  <input
                    type="text"
                    id="business_name"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleInputChange}
                    placeholder="Your professional art business name"
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="years_experience">Years of Experience *</label>
                  <input
                    type="number"
                    id="years_experience"
                    name="years_experience"
                    value={formData.years_experience}
                    onChange={handleInputChange}
                    min="0"
                    max="50"
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="professional_website">Professional Website</label>
                <input
                  type="url"
                  id="professional_website"
                  name="professional_website"
                  value={formData.professional_website}
                  onChange={handleInputChange}
                  placeholder="https://yourwebsite.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="professional_phone">Professional Phone</label>
                  <input
                    type="tel"
                    id="professional_phone"
                    name="professional_phone"
                    value={formData.professional_phone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="business_address">Business Address</label>
                  <input
                    type="text"
                    id="business_address"
                    name="business_address"
                    value={formData.business_address}
                    onChange={handleInputChange}
                    placeholder="Your business/studio address"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* Background Information */}
            <div className={styles.formSection}>
              <h4>Background & Credentials</h4>
              
              <div className={styles.formGroup}>
                <label htmlFor="art_education">Art Education & Training</label>
                <textarea
                  id="art_education"
                  name="art_education"
                  value={formData.art_education}
                  onChange={handleInputChange}
                  placeholder="Describe your formal art education, training, workshops, etc."
                  rows={3}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="professional_achievements">Professional Achievements *</label>
                <textarea
                  id="professional_achievements"
                  name="professional_achievements"
                  value={formData.professional_achievements}
                  onChange={handleInputChange}
                  placeholder="Awards, recognitions, notable exhibitions, publications, etc."
                  rows={4}
                  className={styles.textarea}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="exhibition_history">Exhibition History</label>
                <textarea
                  id="exhibition_history"
                  name="exhibition_history"
                  value={formData.exhibition_history}
                  onChange={handleInputChange}
                  placeholder="List your past exhibitions, shows, and gallery representations"
                  rows={4}
                  className={styles.textarea}
                />
              </div>
            </div>

            {/* Portfolio Information */}
            <div className={styles.formSection}>
              <h4>Portfolio & Work</h4>
              
              <div className={styles.formGroup}>
                <label htmlFor="portfolio_description">Portfolio Description *</label>
                <textarea
                  id="portfolio_description"
                  name="portfolio_description"
                  value={formData.portfolio_description}
                  onChange={handleInputChange}
                  placeholder="Describe your artistic practice, style, and body of work"
                  rows={5}
                  className={styles.textarea}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="client_testimonials">Client Testimonials & References</label>
                <textarea
                  id="client_testimonials"
                  name="client_testimonials"
                  value={formData.client_testimonials}
                  onChange={handleInputChange}
                  placeholder="Testimonials from clients, galleries, or other professionals"
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>

            {/* Social Media */}
            <div className={styles.formSection}>
              <h4>Professional Social Media</h4>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="social_media_links.instagram">Instagram</label>
                  <input
                    type="text"
                    id="social_media_links.instagram"
                    name="social_media_links.instagram"
                    value={formData.social_media_links.instagram}
                    onChange={handleInputChange}
                    placeholder="@yourusername"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="social_media_links.facebook">Facebook</label>
                  <input
                    type="url"
                    id="social_media_links.facebook"
                    name="social_media_links.facebook"
                    value={formData.social_media_links.facebook}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/yourpage"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* Business Documentation */}
            <div className={styles.formSection}>
              <h4>Business Documentation</h4>
              <div className={styles.formGroup}>
                <label htmlFor="business_documentation">Business License & Documentation</label>
                <textarea
                  id="business_documentation"
                  name="business_documentation"
                  value={formData.business_documentation}
                  onChange={handleInputChange}
                  placeholder="Describe your business registration, tax ID, licenses, etc."
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={handleCancelApplication}>
                Cancel
              </button>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Apply Button */}
      {!showApplicationForm && canApply && (
        <div className={styles.applySection}>
          <div className={styles.applyCard}>
            <div className={styles.applyContent}>
              <h3>Ready to Get Verified?</h3>
              <p>Join our community of verified professional artists and unlock premium features.</p>
              <ul className={styles.benefitsList}>
                <li><i className="fas fa-check"></i> Skip repetitive application fields</li>
                <li><i className="fas fa-check"></i> Priority customer support</li>
                <li><i className="fas fa-check"></i> Verified badge on your profile</li>
                <li><i className="fas fa-check"></i> Access to exclusive opportunities</li>
              </ul>
              <button
                className={styles.applyButton}
                onClick={() => setShowApplicationForm(true)}
              >
                Apply for Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application History */}
      {applications.length > 0 && (
        <div className={styles.applicationHistory}>
          <h3>Application History</h3>
          <div className={styles.historyList}>
            {applications.map(app => (
              <div key={app.id} className={styles.historyCard}>
                <div className={styles.historyHeader}>
                  <div>
                    <strong>{app.verification_level} Verification</strong>
                    <p>Applied: {formatDate(app.created_at)}</p>
                    {app.submitted_at && <p>Submitted: {formatDate(app.submitted_at)}</p>}
                  </div>
                  {getStatusBadge(app.status)}
                </div>

                {app.reviewer_notes && (
                  <div className={styles.reviewerNotes}>
                    <p><strong>Reviewer Notes:</strong> {app.reviewer_notes}</p>
                  </div>
                )}

                {app.revision_requested_notes && (
                  <div className={styles.revisionNotes}>
                    <p><strong>Revision Requested:</strong> {app.revision_requested_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 