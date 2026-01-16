// Reusable Terms Step Component
// Fetches and displays terms, handles acceptance

import React, { useState, useEffect } from 'react';
import { authApiRequest, handleApiResponse } from '../../../lib/apiUtils';

export default function TermsStep({ 
  subscriptionType,
  config,
  onComplete 
}) {
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userAccepted, setUserAccepted] = useState(false);

  // Map frontend subscription types to backend DB types
  const getDbSubscriptionType = (type) => {
    const mapping = {
      'shipping_labels': 'shipping_labels',
      'websites': 'sites',
      'marketplace': 'marketplace',
      'verified': 'verified',
      'wholesale': 'wholesale'
    };
    return mapping[type] || type;
  };

  const dbType = getDbSubscriptionType(subscriptionType);

  useEffect(() => {
    fetchTerms();
  }, [subscriptionType]);

  const fetchTerms = async () => {
    setLoading(true);
    setError('');
    
    try {
      const tierContext = config?.tiers?.[0]?.name || '';
      const url = tierContext 
        ? `api/subscriptions/${subscriptionType}/terms-check?tier_context=${encodeURIComponent(tierContext)}`
        : `api/subscriptions/${subscriptionType}/terms-check`;
      
      const response = await authApiRequest(url);
      const data = await response.json();
      
      if (data.success) {
        if (data.terms && Array.isArray(data.terms)) {
          setTerms(data.terms);
        } else if (data.latestTerms) {
          setTerms([data.latestTerms]);
        }
        
        setUserAccepted(data.termsAccepted);
        
        if (data.termsAccepted) {
          setTimeout(() => {
            onComplete();
          }, 500);
        }
      } else {
        setError(data.error || 'Failed to load terms');
      }
    } catch (err) {
      console.error('Error fetching terms:', err);
      setError('Failed to load terms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!accepted) {
      setError('Please check the box to accept the terms and conditions');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const termsArray = Array.isArray(terms) ? terms : [terms];
      
      for (const term of termsArray) {
        const response = await authApiRequest(`api/subscriptions/${subscriptionType}/terms-accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            terms_version_id: term.id,
            ip_address: null,
            user_agent: navigator.userAgent
          })
        });
        
        const data = await handleApiResponse(response);
        
        if (!data.success) {
          setError(data.error || `Failed to accept ${term.title}`);
          setSubmitting(false);
          return;
        }
      }
      
      setUserAccepted(true);
      setTimeout(() => {
        onComplete();
      }, 500);
      
    } catch (err) {
      console.error('Error accepting terms:', err);
      setError(err.message || 'Failed to accept terms. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
        <span>Loading terms and conditions...</span>
      </div>
    );
  }

  // Error state (no terms loaded)
  if (error && !terms) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="error-alert" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  // Already accepted - showing transition
  if (userAccepted && !submitting) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="success-alert" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ marginBottom: '10px' }}>Terms Already Accepted</h2>
          <p>Moving to next step...</p>
        </div>
      </div>
    );
  }

  // Show terms for acceptance
  const termsArray = Array.isArray(terms) ? terms : [terms];
  
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2>Terms and Conditions</h2>
        <p style={{ color: '#6c757d' }}>
          Please review and accept {termsArray.length > 1 ? 'all terms' : 'the terms'} to continue
        </p>
      </div>

      {/* Display all terms */}
      {termsArray.map((term, index) => (
        <div 
          key={term.id || index} 
          className="form-card"
          style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '20px' }}
        >
          {/* Terms Header */}
          <div style={{ borderBottom: '2px solid var(--secondary-color)', paddingBottom: '15px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>{term.title || 'Terms and Conditions'}</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
              Version {term.version} • {new Date(term.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Terms Content */}
          <div 
            style={{ fontSize: '14px', lineHeight: '1.8', color: '#495057' }}
            dangerouslySetInnerHTML={{ __html: term.content }}
          />
        </div>
      ))}

      {/* Error Message */}
      {error && <div className="error-alert">{error}</div>}

      {/* Acceptance Checkbox */}
      <div className="form-card">
        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', fontSize: '15px' }}>
          <input 
            type="checkbox"
            checked={accepted}
            onChange={(e) => {
              setAccepted(e.target.checked);
              setError('');
            }}
            style={{ marginRight: '12px', marginTop: '3px', width: 'auto' }}
          />
          <span>
            I have read and agree to {termsArray.length > 1 ? 'all' : 'the'} <strong>{config.displayName || 'subscription'}</strong> terms and conditions
          </span>
        </label>
      </div>

      {/* Accept Button */}
      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={handleAccept}
          disabled={submitting || !accepted}
          style={{
            padding: '15px 40px',
            fontSize: '16px',
            opacity: (!accepted || submitting) ? 0.6 : 1,
            cursor: (!accepted || submitting) ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? 'Processing...' : 'Accept and Continue'}
        </button>
      </div>
    </div>
  );
}
