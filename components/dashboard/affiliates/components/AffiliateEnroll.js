/**
 * Affiliate Enrollment Component
 * Allow non-enrolled users to join the affiliate program
 */
import React, { useState } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AffiliateEnroll({ userData, onEnroll }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [affiliateData, setAffiliateData] = useState(null);

  const handleEnroll = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApiRequest('api/affiliates/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAffiliateData(data);
        setSuccess(true);
        
        // Notify parent to refresh menu
        if (onEnroll) {
          onEnroll();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to enroll in affiliate program');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine payout method based on user type
  const getPayoutMethod = () => {
    if (userData.user_type === 'community') {
      // Check for professional_affiliate permission
      if (userData.permissions?.professional_affiliate) {
        return { method: 'stripe', label: 'Bank Transfer (Stripe)' };
      }
      return { method: 'site_credit', label: 'Site Credit' };
    }
    return { method: 'stripe', label: 'Bank Transfer (Stripe)' };
  };

  const payoutInfo = getPayoutMethod();

  if (success && affiliateData) {
    return (
      <div>
        <div className="success-alert" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Welcome to the Affiliate Program!</h3>
          <p>You're now enrolled and ready to start earning.</p>
        </div>
        
        <div className="section-box">
          <h2>Your Affiliate Code</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
            <code style={{ 
              fontSize: '1.5em', 
              padding: '10px 20px', 
              background: 'var(--bg-secondary)', 
              borderRadius: '6px',
              fontWeight: 'bold'
            }}>
              {affiliateData.affiliate_code}
            </code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(affiliateData.affiliate_code);
                alert('Code copied!');
              }}
              className="secondary"
            >
              Copy Code
            </button>
          </div>
        </div>

        <div className="section-box">
          <h2>Your Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <div className="form-card" style={{ padding: '15px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{affiliateData.commission_rate}%</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Commission Rate</div>
            </div>
            <div className="form-card" style={{ padding: '15px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold' }}>{payoutInfo.label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Payout Method</div>
            </div>
          </div>
        </div>

        <div className="section-box">
          <h2>What's Next?</h2>
          <ol style={{ marginTop: '10px', paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Visit "My Links" to get your shareable affiliate URLs</li>
            <li>Share these links on social media, in emails, or with friends</li>
            <li>Earn commission when people make purchases through your links</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="section-box" style={{ textAlign: 'center' }}>
        <h2>Join Our Affiliate Program</h2>
        <p>Earn commission by sharing products you love!</p>
      </div>

      {/* Benefits */}
      <div className="section-box">
        <h2>Why Join?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div className="form-card" style={{ padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>20% Commission</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9em' }}>
              Earn 20% of the platform commission on every sale you refer.
            </p>
          </div>
          <div className="form-card" style={{ padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Permanent Attribution</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9em' }}>
              When someone adds to cart via your link, you're credited forever for that item.
            </p>
          </div>
          <div className="form-card" style={{ padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>No Minimum Payout</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9em' }}>
              Earn $0.50? We'll pay it out. Every dollar counts!
            </p>
          </div>
          <div className="form-card" style={{ padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Self-Referral Allowed</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9em' }}>
              Use your own links and earn on your purchases too.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="section-box">
        <h2>How It Works</h2>
        <ol style={{ marginTop: '10px', paddingLeft: '20px', lineHeight: '2' }}>
          <li><strong>Share Your Links</strong> - Get unique affiliate links for products, the shop, or the homepage.</li>
          <li><strong>Users Make Purchases</strong> - When someone clicks your link and buys, you earn commission.</li>
          <li><strong>Get Paid</strong> - After a 30-day hold period, commissions are paid out automatically.</li>
        </ol>
      </div>

      {/* Payout Method Info */}
      <div className="section-box">
        <h2>Your Payout Method</h2>
        <p style={{ marginTop: '10px' }}>
          <strong>{payoutInfo.label}</strong>
        </p>
        {payoutInfo.method === 'site_credit' ? (
          <p style={{ color: 'var(--text-muted)' }}>
            As a community member, your earnings will be added to your site credit balance, 
            which you can use for purchases on Brakebee.
          </p>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>
            Your earnings will be transferred directly to your connected bank account via Stripe.
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-alert" style={{ marginBottom: '15px' }}>
          {error}
        </div>
      )}

      {/* Enroll Button */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          onClick={handleEnroll}
          disabled={loading}
        >
          {loading ? 'Enrolling...' : 'Join Affiliate Program'}
        </button>
      </div>

      {/* Terms Note */}
      <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
        By joining, you agree to our affiliate program terms. Commission rates and 
        policies may change. Self-referral is allowed. No spam or misleading promotion.
      </p>
    </div>
  );
}
