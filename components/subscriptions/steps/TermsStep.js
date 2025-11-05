// Reusable Terms Step Component
// Fetches and displays terms, handles acceptance

import React, { useState, useEffect } from 'react';
import { authApiRequest, handleApiResponse } from '../../../lib/apiUtils';

export default function TermsStep({ 
  subscriptionType,  // 'shipping_labels', 'sites', 'marketplace', etc
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

  // Fetch terms on mount
  useEffect(() => {
    fetchTerms();
  }, [subscriptionType]);

  const fetchTerms = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get tier context from config (tells backend which page user is on)
      const tierContext = config?.tiers?.[0]?.name || '';
      const url = tierContext 
        ? `api/subscriptions/${subscriptionType}/terms-check?tier_context=${encodeURIComponent(tierContext)}`
        : `api/subscriptions/${subscriptionType}/terms-check`;
      
      const response = await authApiRequest(url);
      const data = await response.json();
      
      if (data.success) {
        // Handle both single term (old format) and multiple terms (new format)
        if (data.terms && Array.isArray(data.terms)) {
          // New format: array of terms
          setTerms(data.terms);
        } else if (data.latestTerms) {
          // Old format: single term
          setTerms([data.latestTerms]);
        }
        
        setUserAccepted(data.termsAccepted);
        
        // If already accepted, auto-advance
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
      // Accept all terms (could be one or multiple)
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
      
      // All terms accepted successfully
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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6c757d' }}>
          Loading terms and conditions...
        </div>
      </div>
    );
  }

  // Error state
  if (error && !terms) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          background: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '20px',
          color: '#721c24',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  // Already accepted - showing transition
  if (userAccepted && !submitting) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          background: '#d4edda', 
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ color: '#155724', marginBottom: '10px' }}>
            Terms Already Accepted
          </h2>
          <p style={{ color: '#155724' }}>
            Moving to next step...
          </p>
        </div>
      </div>
    );
  }

  // Show terms for acceptance
  const termsArray = Array.isArray(terms) ? terms : [terms];
  
  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          Terms and Conditions
        </h2>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Please review and accept {termsArray.length > 1 ? 'all terms' : 'the terms'} to continue
        </p>
      </div>

      {/* Display all terms */}
      {termsArray.map((term, index) => (
        <div key={term.id || index} style={{ 
          background: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '30px',
          marginBottom: '20px',
          maxHeight: '500px',
          overflowY: 'auto',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          {/* Terms Header */}
          <div style={{ 
            borderBottom: '2px solid #3e1c56',
            paddingBottom: '15px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>
              {term.title || 'Terms and Conditions'}
            </h3>
            <p style={{ 
              margin: '5px 0 0 0', 
              fontSize: '14px', 
              color: '#6c757d' 
            }}>
              Version {term.version} • {new Date(term.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Terms Content */}
          <div style={{ 
            fontSize: '14px',
            lineHeight: '1.8',
            color: '#495057',
            whiteSpace: 'pre-wrap'
          }}>
            {term.content}
          </div>
        </div>
      ))}

      {/* Error Message */}
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb', 
          borderRadius: '4px',
          color: '#721c24',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Acceptance Checkbox */}
      <div style={{ 
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          cursor: 'pointer',
          fontSize: '15px'
        }}>
          <input 
            type="checkbox"
            checked={accepted}
            onChange={(e) => {
              setAccepted(e.target.checked);
              setError('');
            }}
            style={{ 
              marginRight: '12px',
              marginTop: '3px',
              width: '18px',
              height: '18px',
              cursor: 'pointer'
            }}
          />
          <span style={{ color: '#495057' }}>
            I have read and agree to {termsArray.length > 1 ? 'all' : 'the'} <strong>{config.displayName}</strong> terms and conditions
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
            background: (!accepted || submitting) ? '#ccc' : '#3e1c56',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: (!accepted || submitting) ? 'not-allowed' : 'pointer',
            minWidth: '200px',
            transition: 'all 0.2s'
          }}
        >
          {submitting ? 'Processing...' : 'Accept and Continue'}
        </button>
      </div>
    </div>
  );
}

