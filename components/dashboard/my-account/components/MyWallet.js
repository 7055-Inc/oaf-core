import { useState, useEffect } from 'react';
import { authApiRequest, handleApiResponse } from '../../../../lib/apiUtils';
import slideInStyles from '../../SlideIn.module.css';
import StripeCardSetup from '../../../stripe/StripeCardSetup';

const CARD_BRANDS = {
  visa: { name: 'Visa', color: '#1a1f71' },
  mastercard: { name: 'Mastercard', color: '#eb001b' },
  amex: { name: 'Amex', color: '#006fcf' },
  discover: { name: 'Discover', color: '#ff6600' },
  diners: { name: 'Diners', color: '#0079be' },
  jcb: { name: 'JCB', color: '#0b4ea2' },
  unionpay: { name: 'UnionPay', color: '#e21836' },
  default: { name: 'Card', color: '#6c757d' }
};

const TRANSACTION_TYPES = {
  gift_card_load: { label: 'Gift Card Redemption', icon: '🎁', class: 'positive' },
  admin_adjustment: { label: 'Admin Credit', icon: '✨', class: 'positive' },
  affiliate_payout: { label: 'Affiliate Payout', icon: '💰', class: 'positive' },
  checkout_applied: { label: 'Applied to Order', icon: '🛒', class: 'negative' },
  checkout_refund: { label: 'Order Refund', icon: '↩️', class: 'positive' },
  manual_adjustment: { label: 'Adjustment', icon: '📝', class: 'neutral' }
};

export default function MyWallet({ userData }) {
  const [balance, setBalance] = useState(0);
  const [lifetimeEarned, setLifetimeEarned] = useState(0);
  const [lifetimeSpent, setLifetimeSpent] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState(null);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [setupIntent, setSetupIntent] = useState(null);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [deletingCard, setDeletingCard] = useState(null);
  const [settingDefault, setSettingDefault] = useState(null);

  useEffect(() => {
    fetchCredits();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const fetchCredits = async () => {
    try {
      const response = await authApiRequest('api/credits');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
        setLifetimeEarned(data.lifetime_earned || 0);
        setLifetimeSpent(data.lifetime_spent || 0);
      } else {
        throw new Error('Failed to fetch credit balance');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await authApiRequest(`api/credits/transactions?page=${page}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const fetchPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const response = await authApiRequest('api/users/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleAddCard = async () => {
    setCardError(null);
    setShowAddCard(true);
    
    try {
      const response = await authApiRequest('api/payment-methods/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_type: 'wallet' })
      });
      
      const data = await handleApiResponse(response);
      
      if (data.success && data.setupIntent) {
        setSetupIntent(data.setupIntent);
      } else {
        setCardError(data.error || 'Failed to initialize card setup');
        setShowAddCard(false);
      }
    } catch (err) {
      setCardError(err.message || 'Failed to initialize card setup');
      setShowAddCard(false);
    }
  };

  const handleCardSetupSuccess = async (confirmedSetupIntent) => {
    try {
      const response = await authApiRequest('api/payment-methods/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup_intent_id: confirmedSetupIntent.id,
          subscription_type: 'wallet'
        })
      });
      
      const data = await handleApiResponse(response);
      
      if (data.success) {
        setShowAddCard(false);
        setSetupIntent(null);
        fetchPaymentMethods();
      } else {
        setCardError(data.error || 'Failed to save card');
      }
    } catch (err) {
      setCardError(err.message || 'Failed to save card');
    } finally {
      setCardProcessing(false);
    }
  };

  const handleDeleteCard = async (paymentMethodId) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    
    setDeletingCard(paymentMethodId);
    try {
      const response = await authApiRequest(`api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to remove payment method');
      }
    } catch (err) {
      alert('Failed to remove payment method');
    } finally {
      setDeletingCard(null);
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    setSettingDefault(paymentMethodId);
    try {
      const response = await authApiRequest(`api/payment-methods/${paymentMethodId}/default`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Update local state to reflect new default
        setPaymentMethods(prev => prev.map((pm, idx) => ({
          ...pm,
          is_default: pm.id === paymentMethodId
        })));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to set default');
      }
    } catch (err) {
      alert('Failed to set default payment method');
    } finally {
      setSettingDefault(null);
    }
  };

  const getCardBrand = (brand) => {
    return CARD_BRANDS[brand?.toLowerCase()] || CARD_BRANDS.default;
  };

  const handleRedeem = async (e) => {
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
        setRedeemMessage({ type: 'success', text: data.message });
        setRedeemCode('');
        setBalance(data.new_balance);
        fetchTransactions();
        fetchCredits();
      } else {
        setRedeemMessage({ type: 'error', text: data.error || 'Failed to redeem gift card' });
      }
    } catch (err) {
      setRedeemMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const getTransactionInfo = (type) => {
    return TRANSACTION_TYPES[type] || { label: type, icon: '💵', class: 'neutral' };
  };

  if (loading) {
    return <div className={slideInStyles.loading}>Loading wallet...</div>;
  }

  if (error) {
    return <div className="error-alert">{error}</div>;
  }

  return (
    <div>
      {/* Balance Card */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: 'white',
        marginBottom: '24px',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>
          Available Balance
        </div>
        <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '24px', letterSpacing: '-1px' }}>
          {formatCurrency(balance)}
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Lifetime Earned</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatCurrency(lifetimeEarned)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Lifetime Spent</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatCurrency(lifetimeSpent)}</div>
          </div>
        </div>
      </div>

      {/* Redeem Gift Card */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
          🎁 Redeem Gift Card
        </h3>
        <form onSubmit={handleRedeem} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            placeholder="Enter gift card code (e.g., XXXX-XXXX-XXXX-XXXX)"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              fontSize: '14px',
              fontFamily: 'monospace',
              letterSpacing: '1px'
            }}
            maxLength={19}
          />
          <button
            type="submit"
            disabled={!redeemCode.trim() || redeeming}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#667eea',
              color: 'white',
              fontWeight: '600',
              cursor: redeemCode.trim() && !redeeming ? 'pointer' : 'not-allowed',
              opacity: redeemCode.trim() && !redeeming ? 1 : 0.6
            }}
          >
            {redeeming ? 'Redeeming...' : 'Redeem'}
          </button>
        </form>
        {redeemMessage && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            borderRadius: '8px',
            background: redeemMessage.type === 'success' ? '#d4edda' : '#f8d7da',
            color: redeemMessage.type === 'success' ? '#155724' : '#721c24',
            fontSize: '14px'
          }}>
            {redeemMessage.text}
          </div>
        )}
      </div>

      {/* Payment Methods Section */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            💳 Payment Methods
          </h3>
          {!showAddCard && (
            <button
              onClick={handleAddCard}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#667eea',
                color: 'white',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              + Add Card
            </button>
          )}
        </div>

        {cardError && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: '#f8d7da',
            color: '#721c24',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {cardError}
          </div>
        )}

        {/* Add Card Form */}
        {showAddCard && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid #dee2e6'
          }}>
            {setupIntent ? (
              <StripeCardSetup
                setupIntent={setupIntent}
                onSuccess={handleCardSetupSuccess}
                onError={(msg) => setCardError(msg)}
                processing={cardProcessing}
                setProcessing={setCardProcessing}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                Initializing secure card form...
              </div>
            )}
            <button
              onClick={() => {
                setShowAddCard(false);
                setSetupIntent(null);
                setCardError(null);
              }}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#6c757d'
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Saved Cards List */}
        {loadingPaymentMethods ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
            Loading payment methods...
          </div>
        ) : paymentMethods.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 24px',
            color: '#6c757d',
            background: 'white',
            borderRadius: '8px',
            border: '1px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💳</div>
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>No saved payment methods</div>
            <div style={{ fontSize: '14px' }}>Add a card to make checkout faster</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {paymentMethods.map((pm) => {
              const brand = getCardBrand(pm.brand);
              return (
                <div
                  key={pm.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: 'white',
                    borderRadius: '8px',
                    border: pm.is_default ? '2px solid #667eea' : '1px solid #dee2e6'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '32px',
                      background: brand.color,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {brand.name}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        •••• •••• •••• {pm.last4}
                        {pm.is_default && (
                          <span style={{
                            fontSize: '10px',
                            background: '#667eea',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        Expires {String(pm.exp_month).padStart(2, '0')}/{pm.exp_year}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!pm.is_default && (
                      <button
                        onClick={() => handleSetDefault(pm.id)}
                        disabled={settingDefault === pm.id}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #dee2e6',
                          background: 'white',
                          cursor: settingDefault === pm.id ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          color: '#6c757d',
                          opacity: settingDefault === pm.id ? 0.6 : 1
                        }}
                      >
                        {settingDefault === pm.id ? '...' : 'Set Default'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCard(pm.id)}
                      disabled={deletingCard === pm.id}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #dc3545',
                        background: 'transparent',
                        cursor: deletingCard === pm.id ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        color: '#dc3545',
                        opacity: deletingCard === pm.id ? 0.6 : 1
                      }}
                    >
                      {deletingCard === pm.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#6c757d',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          🔒 Your payment info is securely stored with Stripe
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
          📜 Transaction History
        </h3>

        {transactions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#6c757d',
            background: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
            <div style={{ fontWeight: '500', marginBottom: '8px' }}>No transactions yet</div>
            <div style={{ fontSize: '14px' }}>
              Redeem a gift card or earn credits to see your transaction history.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {transactions.map((tx) => {
                const info = getTransactionInfo(tx.transaction_type);
                const isPositive = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{info.icon}</span>
                      <div>
                        <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                          {info.label}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {tx.description || formatDate(tx.created_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '16px',
                        color: isPositive ? '#28a745' : '#dc3545'
                      }}>
                        {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        Balance: {formatCurrency(tx.balance_after)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '24px'
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Previous
                </button>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  color: '#6c757d'
                }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Note */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#e7f3ff',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#0066cc'
      }}>
        <strong>💡 Tip:</strong> Your site credit can be applied at checkout to reduce your order total. 
        Any remaining balance stays in your wallet for future purchases.
      </div>
    </div>
  );
}
