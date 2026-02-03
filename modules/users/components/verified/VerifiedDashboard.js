/**
 * Verified Artist Dashboard
 * 
 * Shown after user passes all checklist gates (terms, payment, application approved).
 * Uses global styles.
 */

import { useRouter } from 'next/router';

export default function VerifiedDashboard({ subscriptionData, userData, onUpdate }) {
  const router = useRouter();
  const verifiedSince = subscriptionData?.subscription?.created_at;
  const nextRenewal = verifiedSince 
    ? new Date(new Date(verifiedSince).setFullYear(new Date(verifiedSince).getFullYear() + 1)) 
    : null;

  return (
    <div className="verified-dashboard">
      {/* Verified Badge */}
      <div className="card card-success">
        <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
          <h2 className="text-success" style={{ marginBottom: '0.5rem' }}>
            You're Verified!
          </h2>
          <p className="text-muted">
            Your work has been manually reviewed and certified as handmade by you.
          </p>
          {verifiedSince && (
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Verified since: {new Date(verifiedSince).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Benefits */}
      <div className="card">
        <div className="card-header">
          <h3>Your Verified Benefits</h3>
        </div>
        <div className="card-body">
          <ul className="feature-list">
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span><strong>Verified Badge</strong> - Displayed on your profile</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>Increased buyer trust and credibility</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>Proof of authenticity for your handmade work</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>Access to verified-only features</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>Annual renewal prevents fraud</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Subscription Info */}
      {subscriptionData?.subscription && (
        <div className="card card-muted">
          <div className="card-header">
            <h4>Subscription Details</h4>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Plan</span>
                <span className="info-value">
                  {subscriptionData.subscription.tier || 'Verified Artist'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className={`status-badge ${subscriptionData.subscription.status === 'active' ? 'success' : 'muted'}`}>
                  {subscriptionData.subscription.status || 'Active'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Annual Fee</span>
                <span className="info-value">
                  ${subscriptionData.subscription.tierPrice || '50.00'}/year
                </span>
              </div>
              {nextRenewal && (
                <div className="info-item">
                  <span className="info-label">Next Renewal</span>
                  <span className="info-value">{nextRenewal.toLocaleDateString()}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Payment Method</span>
                <span className="info-value">
                  {subscriptionData.subscription.cardLast4 
                    ? `•••• •••• •••• ${subscriptionData.subscription.cardLast4}`
                    : 'Card on file'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade to Marketplace */}
      <div className="card">
        <div className="card-header">
          <h4>Want to Sell Your Work?</h4>
        </div>
        <div className="card-body">
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Upgrade to a Marketplace Seller account to sell your handmade work on Brakebee.
            It's FREE - you'll just pay a commission on sales.
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => router.push('/dashboard/commerce/marketplace')}
          >
            Join the Marketplace
          </button>
        </div>
      </div>

      {/* Renewal Note */}
      <div className="alert alert-warning">
        <i className="fas fa-info-circle"></i>
        <span>
          <strong>Note:</strong> Your verified status is valid for one year. 
          We'll send you a renewal reminder before it expires.
        </span>
      </div>
    </div>
  );
}
