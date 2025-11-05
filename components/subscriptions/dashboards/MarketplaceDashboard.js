// Marketplace Dashboard - Shown after all checklist gates passed
// For users with "Marketplace Seller" tier (Free + Verified badge)

import React from 'react';

export default function MarketplaceDashboard({ subscriptionData, userData, onUpdate }) {
  const verifiedSince = subscriptionData?.subscription?.created_at;

  return (
    <div style={{ padding: '20px' }}>
      {/* Marketplace Seller Badge Section */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '30px', 
        borderRadius: '2px', 
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '20px' }}>
          🏪✓
        </div>
        <h2 style={{ color: '#28a745', marginBottom: '10px' }}>
          Marketplace Seller Approved!
        </h2>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          You can now sell on our marketplace + you're automatically verified!
        </p>
        {verifiedSince && (
          <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '10px' }}>
            Approved since: {new Date(verifiedSince).toLocaleDateString()}
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
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Your Marketplace Benefits</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6c757d' }}>
          <li><strong>Verified Artist Badge</strong> - Included for free!</li>
          <li>Sell your handmade work to thousands of buyers</li>
          <li>Integrated store management</li>
          <li>No monthly fees - just commission on sales</li>
          <li>Access to marketplace analytics</li>
          <li>Buyer trust through verification</li>
        </ul>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '2px',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Get Started</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          <button
            onClick={() => {
              // TODO: Navigate to product management
              alert('Product management integration coming soon!');
            }}
            style={{
              padding: '12px 20px',
              background: '#055474',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'left'
            }}
          >
            📦 Manage Your Products
          </button>
          <button
            onClick={() => {
              // TODO: Navigate to orders
              alert('Orders management integration coming soon!');
            }}
            style={{
              padding: '12px 20px',
              background: '#3e1c56',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'left'
            }}
          >
            🛒 View Orders
          </button>
          <button
            onClick={() => {
              // TODO: Navigate to analytics
              alert('Analytics integration coming soon!');
            }}
            style={{
              padding: '12px 20px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'left'
            }}
          >
            📊 View Analytics
          </button>
        </div>
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
            {subscriptionData?.subscription?.tier || 'Marketplace Seller'}
          </div>
          
          <div style={{ color: '#6c757d' }}>Status:</div>
          <div style={{ color: subscriptionData?.subscription?.status === 'active' ? '#28a745' : '#6c757d' }}>
            {subscriptionData?.subscription?.status || 'Unknown'}
          </div>
          
          <div style={{ color: '#6c757d' }}>Monthly Fee:</div>
          <div style={{ color: '#28a745', fontWeight: 'bold' }}>
            FREE
          </div>

          <div style={{ color: '#6c757d' }}>Commission:</div>
          <div style={{ color: '#2c3e50' }}>
            Per sale (view pricing details)
          </div>
          
          <div style={{ color: '#6c757d' }}>Payment Method:</div>
          <div style={{ color: '#2c3e50' }}>
            •••• •••• •••• {subscriptionData?.subscription?.cardLast4 || 'None on file'}
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div style={{ 
        background: '#d1ecf1', 
        border: '1px solid #bee5eb',
        padding: '15px', 
        borderRadius: '2px',
        color: '#0c5460'
      }}>
        <strong>💡 Tip:</strong> Your verified badge is automatically included with your marketplace seller status. 
        Buyers will see that your work has been manually reviewed and certified as handmade.
      </div>
    </div>
  );
}

