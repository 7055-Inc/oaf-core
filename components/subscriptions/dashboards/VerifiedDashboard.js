// Verified Dashboard - Shown after all checklist gates passed
// For users with "Verified Artist" tier ($50/year)

import React from 'react';

export default function VerifiedDashboard({ subscriptionData, userData, onUpdate }) {
  const verifiedSince = subscriptionData?.subscription?.created_at;
  const nextRenewal = verifiedSince ? new Date(new Date(verifiedSince).setFullYear(new Date(verifiedSince).getFullYear() + 1)) : null;

  return (
    <div style={{ padding: '20px' }}>
      {/* Verified Badge Section */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '30px', 
        borderRadius: '2px', 
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '20px' }}>
          ✓
        </div>
        <h2 style={{ color: '#28a745', marginBottom: '10px' }}>
          You're Verified!
        </h2>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Your work has been manually reviewed and certified as handmade by you.
        </p>
        {verifiedSince && (
          <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '10px' }}>
            Verified since: {new Date(verifiedSince).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Benefits Section */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '2px',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Your Verified Benefits</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6c757d' }}>
          <li>Verified badge displayed on your profile</li>
          <li>Increased buyer trust and credibility</li>
          <li>Access to verified-only features</li>
          <li>Proof of authenticity for your handmade work</li>
        </ul>
      </div>

      {/* Subscription Info */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '2px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Subscription Details</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr', 
          gap: '10px 20px',
          fontSize: '14px'
        }}>
          <div style={{ color: '#6c757d' }}>Plan:</div>
          <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>
            {subscriptionData?.subscription?.tier || 'Verified Artist'}
          </div>
          
          <div style={{ color: '#6c757d' }}>Status:</div>
          <div style={{ color: subscriptionData?.subscription?.status === 'active' ? '#28a745' : '#6c757d' }}>
            {subscriptionData?.subscription?.status || 'Unknown'}
          </div>
          
          <div style={{ color: '#6c757d' }}>Annual Fee:</div>
          <div style={{ color: '#2c3e50' }}>
            ${subscriptionData?.subscription?.tierPrice || '50.00'}/year
          </div>

          {nextRenewal && (
            <>
              <div style={{ color: '#6c757d' }}>Next Renewal:</div>
              <div style={{ color: '#2c3e50' }}>
                {nextRenewal.toLocaleDateString()}
              </div>
            </>
          )}
          
          <div style={{ color: '#6c757d' }}>Payment Method:</div>
          <div style={{ color: '#2c3e50' }}>
            •••• •••• •••• {subscriptionData?.subscription?.cardLast4 || 'None on file'}
          </div>
        </div>
      </div>

      {/* Future: Add verification renewal, update media, etc */}
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffeeba',
        padding: '15px', 
        borderRadius: '2px',
        color: '#856404'
      }}>
        <strong>Note:</strong> Your verified status is valid for one year. We'll send you a renewal reminder before it expires.
      </div>
    </div>
  );
}

