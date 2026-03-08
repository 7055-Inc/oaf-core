/**
 * Marketplace Dashboard
 * 
 * Shown after user passes all checklist gates (terms, card, application approved).
 * Uses global styles.
 */

import { useRouter } from 'next/router';

export default function MarketplaceDashboard({ subscriptionData, userData, onUpdate }) {
  const router = useRouter();
  const approvedSince = subscriptionData?.subscription?.created_at;

  const navigateTo = (path) => {
    router.push(path);
  };

  return (
    <div className="marketplace-dashboard">
      {/* Approval Badge */}
      <div className="card card-success">
        <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏪✓</div>
          <h2 className="text-success" style={{ marginBottom: '0.5rem' }}>
            Marketplace Seller Approved!
          </h2>
          <p className="text-muted">
            You can now sell on the marketplace. Your work is verified as handmade!
          </p>
          {approvedSince && (
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Approved: {new Date(approvedSince).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3>Get Started</h3>
        </div>
        <div className="card-body">
          <div className="button-group button-group-vertical">
            <button
              type="button"
              className="btn primary btn-large"
              onClick={() => navigateTo('/dashboard/catalog/products')}
            >
              <i className="fas fa-box"></i>
              Manage Your Products
            </button>
            <button
              type="button"
              className="btn secondary btn-large"
              onClick={() => navigateTo('/dashboard/commerce/sales')}
            >
              <i className="fas fa-shopping-cart"></i>
              View Your Sales
            </button>
            <button
              type="button"
              className="btn secondary btn-large"
              onClick={() => navigateTo('/dashboard/commerce/finances')}
            >
              <i className="fas fa-chart-line"></i>
              Payouts & Earnings
            </button>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="card">
        <div className="card-header">
          <h3>Your Marketplace Benefits</h3>
        </div>
        <div className="card-body">
          <ul className="feature-list">
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span><strong>Verified Artist Badge</strong> - Included for free!</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>Sell your handmade work to thousands of buyers</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>No monthly fees - just commission on sales</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>Integrated store management tools</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>Access to marketplace analytics</span>
            </li>
            <li>
              <i className="fas fa-check-circle text-success"></i>
              <span>Buyer trust through verification</span>
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
                  {subscriptionData.subscription.tier || 'Marketplace Seller'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className={`status-badge ${subscriptionData.subscription.status === 'active' ? 'success' : 'muted'}`}>
                  {subscriptionData.subscription.status || 'Active'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Monthly Fee</span>
                <span className="info-value text-success" style={{ fontWeight: 'bold' }}>
                  FREE
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Revenue Model</span>
                <span className="info-value">Commission on sales</span>
              </div>
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

      {/* Info Note */}
      <div className="alert alert-info">
        <i className="fas fa-lightbulb"></i>
        <span>
          <strong>Tip:</strong> Your verified badge is automatically included with your marketplace seller status. 
          Buyers will see that your work has been reviewed and certified as handmade.
        </span>
      </div>
    </div>
  );
}
