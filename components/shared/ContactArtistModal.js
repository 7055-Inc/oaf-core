import { useState } from 'react';
import styles from './ContactArtistModal.module.css';
import { getApiUrl } from '../../lib/config';

export default function ContactArtistModal({ isOpen, onClose, artistId, artistName }) {
  const [formData, setFormData] = useState({
    sender_name: '',
    sender_email: '',
    sender_phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      const response = await fetch(getApiUrl('api/artist-contact'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          artist_id: artistId,
          ...formData
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          sender_name: '',
          sender_email: '',
          sender_phone: '',
          subject: '',
          message: ''
        });
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          setSubmitStatus(null);
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.error || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalOverlay} 
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-artist-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="contact-artist-title">Contact {artistName}</h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {submitStatus === 'success' ? (
          <div className={styles.successMessage}>
            <svg className={styles.successIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3>Message Sent!</h3>
            <p>Your message has been sent to {artistName}. They'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.contactForm}>
            {submitStatus === 'error' && (
              <div className={styles.errorMessage}>
                {errorMessage}
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="sender_name">Your Name *</label>
              <input
                type="text"
                id="sender_name"
                name="sender_name"
                value={formData.sender_name}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="sender_email">Your Email *</label>
              <input
                type="email"
                id="sender_email"
                name="sender_email"
                value={formData.sender_email}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="sender_phone">Your Phone (optional)</label>
              <input
                type="tel"
                id="sender_phone"
                name="sender_phone"
                value={formData.sender_phone}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="subject">Subject (optional)</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="6"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

