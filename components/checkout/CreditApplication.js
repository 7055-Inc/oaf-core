/**
 * Credit Application Component
 * Allows users to apply site credits to their order at checkout
 */
import { useState, useEffect } from 'react';
import { authApiRequest } from '../../lib/apiUtils';
import styles from '../../styles/Checkout.module.css';

export default function CreditApplication({ 
  orderTotal, 
  onCreditApplied, 
  disabled = false 
}) {
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditToApply, setCreditToApply] = useState('');
  const [appliedCredit, setAppliedCredit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState(null);

  // Fetch user's credit balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await authApiRequest('api/credits');
        if (response.ok) {
          const data = await response.json();
          setCreditBalance(data.balance || 0);
        }
      } catch (err) {
        console.error('Failed to fetch credit balance:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBalance();
  }, []);

  const handleApplyCredit = () => {
    const amount = parseFloat(creditToApply);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (amount > creditBalance) {
      setError('Amount exceeds your available balance');
      return;
    }
    
    if (amount > orderTotal) {
      setError('Amount exceeds the order total');
      return;
    }
    
    setError(null);
    setAppliedCredit(amount);
    setCreditToApply('');
    
    // Notify parent component
    if (onCreditApplied) {
      onCreditApplied(amount);
    }
  };

  const handleApplyMax = () => {
    const maxApplicable = Math.min(creditBalance, orderTotal);
    setCreditToApply(maxApplicable.toFixed(2));
  };

  const handleRemoveCredit = () => {
    setAppliedCredit(0);
    setCreditToApply('');
    setError(null);
    
    if (onCreditApplied) {
      onCreditApplied(0);
    }
  };

  const handleRedeemCode = async (e) => {
    e.preventDefault();
    if (!redeemCode.trim() || redeeming) return;
    
    setRedeeming(true);
    setRedeemMessage(null);
    
    try {
      const response = await authApiRequest('api/credits/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRedeemMessage({ type: 'success', text: data.message || `Added $${data.amount_added?.toFixed(2)} to your balance!` });
        setCreditBalance(data.new_balance || creditBalance + (data.amount_added || 0));
        setRedeemCode('');
        setShowRedeemForm(false);
      } else {
        setRedeemMessage({ type: 'error', text: data.error || 'Failed to redeem code' });
      }
    } catch (err) {
      setRedeemMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setRedeeming(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  // Don't show if user has no credits and nothing applied
  if (loading) {
    return (
      <div className={styles.creditSection}>
        <div style={{ padding: '16px', textAlign: 'center', color: '#6c757d' }}>
          Loading wallet...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.creditSection} style={{
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          💳 Apply Site Credit or Gift Card
        </h3>
        <button
          type="button"
          onClick={() => setShowRedeemForm(!showRedeemForm)}
          style={{
            background: 'none',
            border: 'none',
            color: '#667eea',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {showRedeemForm ? 'Cancel' : '🎁 Have a code?'}
        </button>
      </div>

      {/* Redeem Code Form */}
      {showRedeemForm && (
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #dee2e6'
        }}>
          <form onSubmit={handleRedeemCode} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="Enter gift card code"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
                fontFamily: 'monospace',
                letterSpacing: '1px'
              }}
              maxLength={19}
              disabled={redeeming}
            />
            <button
              type="submit"
              disabled={!redeemCode.trim() || redeeming}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#28a745',
                color: 'white',
                fontWeight: '500',
                cursor: redeemCode.trim() && !redeeming ? 'pointer' : 'not-allowed',
                opacity: redeemCode.trim() && !redeeming ? 1 : 0.6
              }}
            >
              {redeeming ? '...' : 'Redeem'}
            </button>
          </form>
          {redeemMessage && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: redeemMessage.type === 'success' ? '#d4edda' : '#f8d7da',
              color: redeemMessage.type === 'success' ? '#155724' : '#721c24',
              fontSize: '14px'
            }}>
              {redeemMessage.text}
            </div>
          )}
        </div>
      )}

      {/* Balance Display */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '8px',
        color: 'white',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '14px', opacity: 0.9 }}>Available Balance</span>
        <span style={{ fontSize: '20px', fontWeight: '700' }}>{formatCurrency(creditBalance)}</span>
      </div>

      {/* Applied Credit Display */}
      {appliedCredit > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#d4edda',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div>
            <span style={{ color: '#155724', fontWeight: '500' }}>
              ✅ Credit Applied: {formatCurrency(appliedCredit)}
            </span>
            <div style={{ fontSize: '12px', color: '#155724', opacity: 0.8, marginTop: '2px' }}>
              Remaining balance: {formatCurrency(creditBalance - appliedCredit)}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveCredit}
            disabled={disabled}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc3545',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Remove
          </button>
        </div>
      )}

      {/* Apply Credit Form */}
      {creditBalance > 0 && appliedCredit === 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6c757d'
            }}>$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={Math.min(creditBalance, orderTotal)}
              value={creditToApply}
              onChange={(e) => setCreditToApply(e.target.value)}
              placeholder="0.00"
              disabled={disabled}
              style={{
                width: '100%',
                padding: '10px 14px 10px 24px',
                borderRadius: '6px',
                border: '1px solid #dee2e6'
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleApplyMax}
            disabled={disabled}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #667eea',
              background: 'white',
              color: '#667eea',
              fontWeight: '500',
              cursor: disabled ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Max
          </button>
          <button
            type="button"
            onClick={handleApplyCredit}
            disabled={disabled || !creditToApply}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#667eea',
              color: 'white',
              fontWeight: '500',
              cursor: disabled || !creditToApply ? 'not-allowed' : 'pointer',
              opacity: disabled || !creditToApply ? 0.6 : 1
            }}
          >
            Apply
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          borderRadius: '6px',
          background: '#f8d7da',
          color: '#721c24',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* No Balance Message */}
      {creditBalance === 0 && appliedCredit === 0 && (
        <div style={{
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '14px',
          padding: '8px'
        }}>
          No credit balance available.{' '}
          <button
            type="button"
            onClick={() => setShowRedeemForm(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Redeem a gift card
          </button>
        </div>
      )}
    </div>
  );
}
