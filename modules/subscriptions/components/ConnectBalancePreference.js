/**
 * Connect Balance Preference Component
 * 
 * Allows users with Stripe Connect to choose payment method preference.
 * Uses global styles from modules/styles/.
 */

import React, { useState, useEffect } from 'react';
import { getShippingSubscription, updateShippingPreferences } from '../../../lib/subscriptions';

export default function ConnectBalancePreference({ userData, onUpdate }) {
  const [preferConnectBalance, setPreferConnectBalance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCurrentPreference();
  }, []);

  const loadCurrentPreference = async () => {
    try {
      const data = await getShippingSubscription();
      setPreferConnectBalance(data.subscription?.preferConnectBalance || false);
    } catch (err) {
      console.error('Error loading Connect balance preference:', err);
    }
  };

  const handlePreferenceChange = async (checked) => {
    setLoading(true);
    setError(null);
    
    try {
      await updateShippingPreferences(checked);
      setPreferConnectBalance(checked);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message);
      console.error('Error updating Connect balance preference:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card" style={{ marginTop: '20px' }}>
      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <input
          type="checkbox"
          id="preferConnectBalance"
          checked={preferConnectBalance}
          onChange={(e) => handlePreferenceChange(e.target.checked)}
          disabled={loading}
          style={{ width: 'auto', margin: 0 }}
        />
        <label 
          htmlFor="preferConnectBalance" 
          style={{ 
            margin: 0,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontWeight: 'normal'
          }}
        >
          Use my Connect balance when available to pay subscription fees
        </label>
      </div>
      
      {error && <div className="form-error">{error}</div>}
      
      <div style={{ fontSize: '12px', color: '#6c757d' }}>
        When enabled, we'll use your Connect earnings balance before charging your card for subscription fees.
      </div>
    </div>
  );
}
