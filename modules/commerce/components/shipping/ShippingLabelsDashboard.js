/**
 * Shipping Labels Dashboard
 * 
 * Main dashboard shown after subscription gate passes.
 * Includes label creator and label library.
 * Uses global styles.
 */

import { useState } from 'react';
import StandaloneLabelCreator from './StandaloneLabelCreator';
import StandaloneLabelLibrary from './StandaloneLabelLibrary';

export default function ShippingLabelsDashboard({ subscriptionData, userData, onUpdate }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLabelCreated = () => {
    // Trigger library refresh
    setRefreshKey(k => k + 1);
    if (onUpdate) onUpdate();
  };

  return (
    <div className="shipping-labels-dashboard">
      {/* Create Label Section */}
      <div className="card">
        <div className="card-body">
          <StandaloneLabelCreator 
            userData={userData} 
            onLabelCreated={handleLabelCreated}
          />
        </div>
      </div>

      {/* Label Library Section */}
      <div className="card">
        <div className="card-header">
          <h3>Label History</h3>
        </div>
        <div className="card-body">
          <StandaloneLabelLibrary refreshTrigger={refreshKey} />
        </div>
      </div>

      {/* Subscription Info */}
      {subscriptionData?.subscription && (
        <div className="card card-muted">
          <div className="card-header">
            <h4>Subscription Status</h4>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Plan</span>
                <span className="info-value">{subscriptionData.subscription.tier || 'Pay-as-you-go'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className={`status-badge ${subscriptionData.subscription.status === 'active' ? 'success' : 'muted'}`}>
                  {subscriptionData.subscription.status || 'Active'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Billing</span>
                <span className="info-value">
                  {subscriptionData.subscription.cardLast4 
                    ? `•••• •••• •••• ${subscriptionData.subscription.cardLast4}`
                    : 'Connect Balance / Card on file'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
