/**
 * Subscription Card Component
 * 
 * Displays a single subscription/addon row in the table.
 * Uses global styles from modules/styles/.
 */

import React, { useState } from 'react';

export default function SubscriptionCard({ item, onSubscribe, onCancel }) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      if (action === 'subscribe') {
        await onSubscribe();
      } else {
        await onCancel();
      }
    } finally {
      setLoading(false);
    }
  };

  const formatFee = () => {
    if (item.isPayAsYouGo) {
      return (
        <>
          <span>Free</span>
          <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 'normal' }}>
            (Pay-as-you-go)
          </div>
        </>
      );
    }
    if (item.isAnnual && item.annualFee) {
      return `$${item.annualFee.toFixed(2)}/year`;
    }
    if (item.monthlyFee > 0) {
      return `$${item.monthlyFee.toFixed(2)}/mo`;
    }
    return 'Free';
  };

  return (
    <tr style={{ backgroundColor: item.isActive ? '#f0fff0' : 'white' }}>
      {/* Name & Description */}
      <td>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {item.name}
          {item.isActive && (
            <span className="badge badge-success" style={{ marginLeft: '8px' }}>
              ACTIVE
            </span>
          )}
          {item.tier && item.isActive && (
            <span className="badge badge-primary" style={{ marginLeft: '8px', backgroundColor: 'var(--primary-color)' }}>
              {item.tier}
            </span>
          )}
          {item.badge && !item.isActive && (
            <span className="badge badge-warning" style={{ marginLeft: '8px' }}>
              {item.badge}
            </span>
          )}
          {item.type === 'addon' && (
            <span className="badge badge-secondary" style={{ marginLeft: '8px' }}>
              ADD-ON
            </span>
          )}
        </div>
        <div style={{ fontSize: '13px', color: '#6c757d' }}>
          {item.description}
        </div>
      </td>

      {/* Fee */}
      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary-color)' }}>
        {formatFee()}
      </td>

      {/* Action Button */}
      <td style={{ textAlign: 'center' }}>
        {item.isActive ? (
          <button
            onClick={() => handleAction('cancel')}
            disabled={loading}
            className="btn-danger"
            style={{ 
              opacity: loading ? 0.6 : 1,
              minWidth: '100px'
            }}
          >
            {loading ? 'Processing...' : 'Cancel'}
          </button>
        ) : item.badge === 'PENDING' ? (
          <button
            disabled
            className="secondary"
            style={{ minWidth: '100px', opacity: 0.6 }}
          >
            Pending...
          </button>
        ) : (
          <button
            className="secondary"
            onClick={() => handleAction('subscribe')}
            disabled={loading}
            style={{ 
              opacity: loading ? 0.6 : 1,
              minWidth: '100px'
            }}
          >
            {loading ? 'Processing...' : 'Subscribe Now'}
          </button>
        )}
      </td>
    </tr>
  );
}
