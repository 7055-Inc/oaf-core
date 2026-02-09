/**
 * Email Collection Form Component
 * Reusable React component for email signup forms on artist sites.
 * 
 * Usage:
 * import { EmailCollectionForm } from '@/components/sites-modules/EmailCollectionForm';
 * <EmailCollectionForm formId={123} inline={true} />
 */

import { useState } from 'react';

export default function EmailCollectionForm({ formId, inline = false }) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/v2/email-marketing/public/subscribe/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setFormData({ email: '', first_name: '', last_name: '' });
        
        // If redirect URL is provided, redirect after 2 seconds
        if (data.redirect_url) {
          setTimeout(() => {
            window.location.href = data.redirect_url;
          }, 2000);
        }
      } else {
        setError(data.message || 'Subscription failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error submitting form:', err);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = inline ? {
    display: 'inline-block',
    width: '100%',
    maxWidth: '400px'
  } : {
    padding: '30px',
    background: '#f8f9fa',
    borderRadius: '8px',
    maxWidth: '500px',
    margin: '0 auto'
  };

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
          <h3 style={{ color: '#28a745', marginBottom: '10px' }}>Thank You!</h3>
          <p style={{ color: '#666' }}>Please check your email to confirm your subscription.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSubmit}>
        {/* Email Field */}
        <div style={{ marginBottom: '15px' }}>
          <input
            type="email"
            placeholder="Your email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* First Name Field (optional based on form config) */}
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="First name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Last Name Field (optional based on form config) */}
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Last name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '10px',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
            fontSize: '13px',
            marginBottom: '15px'
          }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#6c757d' : '#055474',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s'
          }}
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
    </div>
  );
}
