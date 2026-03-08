/**
 * Affiliate Overview Component
 * Dashboard overview showing affiliate statistics and earnings summary
 */
import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AffiliateOverview({ userData, affiliateData: initialData }) {
  const [stats, setStats] = useState(null);
  const [affiliateData, setAffiliateData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await authApiRequest('api/affiliates/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError('Failed to load statistics');
      }
    } catch (err) {
      setError('Error loading statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount) || 0);
  };

  if (loading) {
    return (
      <div className="loading-state">Loading your affiliate stats...</div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        {error}
        <button onClick={loadStats} className="secondary" style={{ marginLeft: '10px' }}>
          Try Again
        </button>
      </div>
    );
  }

  const conversionRate = stats?.unique_visitors > 0 
    ? ((parseFloat(stats.conversions) / parseFloat(stats.unique_visitors)) * 100).toFixed(1)
    : '0.0';

  return (
    <div>
      {/* Affiliate Code */}
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
            {affiliateData?.affiliate_code || 'N/A'}
          </code>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(affiliateData?.affiliate_code || '');
              alert('Code copied!');
            }}
            className="secondary"
          >
            Copy Code
          </button>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="section-box">
        <h2>Earnings Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginTop: '15px' }}>
          <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--success-color)' }}>
              {formatCurrency(affiliateData?.total_earnings)}
            </div>
            <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '5px' }}>Total Earned</div>
          </div>
          
          <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--warning-color)' }}>
              {formatCurrency(affiliateData?.pending_balance)}
            </div>
            <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '5px' }}>Pending Payout</div>
          </div>
          
          <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>
              {formatCurrency(affiliateData?.paid_balance)}
            </div>
            <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '5px' }}>Paid Out</div>
          </div>
          
          <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>
              {parseFloat(affiliateData?.commission_rate || 20).toFixed(0)}%
            </div>
            <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '5px' }}>Commission Rate</div>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="section-box">
        <h2>Performance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{stats?.total_clicks || 0}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Total Clicks</div>
          </div>
          
          <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{stats?.unique_visitors || 0}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Unique Visitors</div>
          </div>
          
          <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{stats?.conversions || 0}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Conversions</div>
          </div>
          
          <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{conversionRate}%</div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Conversion Rate</div>
          </div>
        </div>
      </div>

      {/* Commission Stats */}
      <div className="section-box">
        <h2>Commissions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{stats?.total_commissions || 0}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Total</div>
          </div>
          
          <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{stats?.pending_count || 0}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Pending</div>
          </div>
          
          <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{stats?.paid_count || 0}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Paid</div>
          </div>
        </div>
      </div>

      {/* Payout Method Info */}
      <div className="section-box">
        <h2>Payout Method</h2>
        <p style={{ marginTop: '10px' }}>
          {affiliateData?.payout_method === 'stripe' ? (
            <>
              <strong>Bank Transfer (Stripe)</strong>
              <br />
              <span style={{ color: 'var(--text-muted)' }}>Payouts are sent directly to your connected bank account.</span>
            </>
          ) : (
            <>
              <strong>Site Credit</strong>
              <br />
              <span style={{ color: 'var(--text-muted)' }}>Earnings are added to your site credit balance for use on purchases.</span>
            </>
          )}
        </p>
      </div>

      {/* How It Works */}
      <div className="section-box">
        <h2>How It Works</h2>
        <ol style={{ marginTop: '10px', paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Share your affiliate links with friends and followers</li>
          <li>When someone makes a purchase using your link, you earn a commission</li>
          <li>Commissions are held for 30 days to account for returns</li>
          <li>After 30 days, if the order is shipped, your earnings are paid out</li>
        </ol>
      </div>
    </div>
  );
}
