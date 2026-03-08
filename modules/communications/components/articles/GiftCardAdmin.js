/**
 * GiftCardAdmin Component
 * Admin panel for managing gift cards and site credits
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

export default function GiftCardAdmin({ userData }) {
  // View state
  const [activeTab, setActiveTab] = useState('gift-cards'); // 'gift-cards', 'issue', 'user-lookup'
  
  // Gift cards list state
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Issue form state
  const [issueForm, setIssueForm] = useState({
    amount: '',
    issued_to_email: '',
    issued_to_user_id: '',
    recipient_name: '',
    sender_name: '',
    personal_message: '',
    issue_reason: '',
    admin_notes: '',
    expires_at: ''
  });
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState(null);
  
  // User lookup state
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userLookupResult, setUserLookupResult] = useState(null);
  const [userLookupLoading, setUserLookupLoading] = useState(false);
  
  // Selected gift card for detail view
  const [selectedGiftCard, setSelectedGiftCard] = useState(null);
  
  // Messages
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch gift cards list
  const fetchGiftCards = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(getApiUrl(`api/credits/admin/gift-cards?${params}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch gift cards');
      }
      
      const data = await response.json();
      setGiftCards(data.gift_cards || []);
      setTotalPages(data.pagination?.pages || 1);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchTerm]);

  // Initial data load
  useEffect(() => {
    if (activeTab === 'gift-cards') {
      fetchGiftCards();
    }
  }, [activeTab, fetchGiftCards]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'gift-cards') {
        setPage(1);
        fetchGiftCards();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Issue gift card/credit
  const handleIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.amount || parseFloat(issueForm.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    
    try {
      setIssuing(true);
      setError(null);
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl('api/credits/admin/issue'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(issueForm.amount),
          issued_to_email: issueForm.issued_to_email || undefined,
          issued_to_user_id: issueForm.issued_to_user_id ? parseInt(issueForm.issued_to_user_id) : undefined,
          recipient_name: issueForm.recipient_name || undefined,
          sender_name: issueForm.sender_name || undefined,
          personal_message: issueForm.personal_message || undefined,
          issue_reason: issueForm.issue_reason || undefined,
          admin_notes: issueForm.admin_notes || undefined,
          expires_at: issueForm.expires_at || undefined
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to issue credit/gift card');
      }
      
      setIssueResult(data);
      setSuccessMessage('Credit/Gift Card issued successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Reset form
      setIssueForm({
        amount: '',
        issued_to_email: '',
        issued_to_user_id: '',
        recipient_name: '',
        sender_name: '',
        personal_message: '',
        issue_reason: '',
        admin_notes: '',
        expires_at: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIssuing(false);
    }
  };

  // User lookup
  const handleUserLookup = async () => {
    if (!userSearchTerm.trim()) return;
    
    try {
      setUserLookupLoading(true);
      setError(null);
      const token = getAuthToken();
      
      // First find the user
      const userResponse = await fetch(getApiUrl(`api/users/search?q=${encodeURIComponent(userSearchTerm)}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('User not found');
      }
      
      const userData = await userResponse.json();
      if (!userData.users || userData.users.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userData.users[0];
      
      // Get their credit summary
      const creditResponse = await fetch(getApiUrl(`api/credits/admin/user/${user.id}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (creditResponse.ok) {
        const creditData = await creditResponse.json();
        setUserLookupResult({ ...user, ...creditData });
      } else {
        setUserLookupResult({ ...user, balance: 0, lifetime_earned: 0, lifetime_spent: 0, transactions: [] });
      }
    } catch (err) {
      setError(err.message);
      setUserLookupResult(null);
    } finally {
      setUserLookupLoading(false);
    }
  };

  // Cancel gift card
  const handleCancel = async (giftCardId) => {
    if (!confirm('Are you sure you want to cancel this gift card?')) return;
    
    try {
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl(`api/credits/admin/gift-cards/${giftCardId}/cancel`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel gift card');
      }
      
      setSuccessMessage('Gift card cancelled');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchGiftCards();
    } catch (err) {
      setError(err.message);
    }
  };

  // Resend gift card email
  const handleResend = async (giftCardId) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl(`api/credits/admin/gift-cards/${giftCardId}/resend`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend email');
      }
      
      setSuccessMessage('Gift card email resent!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return styles.statusCompleted;
      case 'redeemed': return styles.statusProcessing;
      case 'expired': return styles.statusFailed;
      case 'cancelled': return styles.statusFailed;
      default: return styles.statusDefault;
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="tab-container" style={{ marginBottom: '24px' }}>
        <button
          className={`tab ${activeTab === 'gift-cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('gift-cards')}
        >
          Gift Cards
        </button>
        <button
          className={`tab ${activeTab === 'issue' ? 'active' : ''}`}
          onClick={() => setActiveTab('issue')}
        >
          Issue Credit
        </button>
        <button
          className={`tab ${activeTab === 'user-lookup' ? 'active' : ''}`}
          onClick={() => setActiveTab('user-lookup')}
        >
          User Lookup
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="error-alert" style={{ marginBottom: '16px' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '8px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Gift Cards Tab */}
      {activeTab === 'gift-cards' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by code, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="redeemed">Redeemed</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Gift Cards List */}
          {loading ? (
            <div className={styles.loading}>Loading gift cards...</div>
          ) : giftCards.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: '#6c757d',
              background: '#f8f9fa',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎁</div>
              <div style={{ fontWeight: '500' }}>No gift cards found</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Code</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Amount</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Recipient</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCards.map((gc) => (
                      <tr key={gc.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                          {gc.code || '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div>{formatCurrency(gc.original_amount)}</div>
                          {gc.current_balance !== gc.original_amount && (
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              Balance: {formatCurrency(gc.current_balance)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div>{gc.recipient_name || gc.issued_to_email || '-'}</div>
                          {gc.issued_to_username && (
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              @{gc.issued_to_username}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`${styles.statusBadge} ${getStatusBadgeClass(gc.status)}`}>
                            {gc.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {formatDate(gc.created_at)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {gc.status === 'active' && gc.issued_to_email && (
                              <button
                                className="secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleResend(gc.id)}
                              >
                                Resend
                              </button>
                            )}
                            {gc.status === 'active' && (
                              <button
                                className="secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', color: '#dc3545' }}
                                onClick={() => handleCancel(gc.id)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      )}

      {/* Issue Credit Tab */}
      {activeTab === 'issue' && (
        <div>
          <div style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px' }}>
              Issue Gift Card or Site Credit
            </h3>

            {issueResult && (
              <div style={{
                background: '#d4edda',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>✅ Issued Successfully!</div>
                {issueResult.code && (
                  <div>
                    <strong>Code:</strong>{' '}
                    <code style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>
                      {issueResult.code}
                    </code>
                  </div>
                )}
                <div><strong>Gift Card ID:</strong> {issueResult.gift_card_id}</div>
                {issueResult.issued_to_user_id && (
                  <div><strong>Credited to User ID:</strong> {issueResult.issued_to_user_id}</div>
                )}
              </div>
            )}

            <form onSubmit={handleIssue}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Amount */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={issueForm.amount}
                    onChange={(e) => setIssueForm({ ...issueForm, amount: e.target.value })}
                    placeholder="25.00"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}
                  />
                </div>

                {/* Recipient Options */}
                <div style={{
                  background: '#e7f3ff',
                  padding: '16px',
                  borderRadius: '8px',
                  marginTop: '8px'
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '12px' }}>
                    Recipient (choose one method)
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                      Email (creates gift card code)
                    </label>
                    <input
                      type="email"
                      value={issueForm.issued_to_email}
                      onChange={(e) => setIssueForm({ 
                        ...issueForm, 
                        issued_to_email: e.target.value,
                        issued_to_user_id: e.target.value ? '' : issueForm.issued_to_user_id 
                      })}
                      placeholder="recipient@example.com"
                      disabled={!!issueForm.issued_to_user_id}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'center', color: '#6c757d', margin: '8px 0' }}>— OR —</div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                      User ID (direct credit to account)
                    </label>
                    <input
                      type="number"
                      value={issueForm.issued_to_user_id}
                      onChange={(e) => setIssueForm({ 
                        ...issueForm, 
                        issued_to_user_id: e.target.value,
                        issued_to_email: e.target.value ? '' : issueForm.issued_to_email 
                      })}
                      placeholder="12345"
                      disabled={!!issueForm.issued_to_email}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}
                    />
                  </div>
                </div>

                {/* Additional Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={issueForm.recipient_name}
                      onChange={(e) => setIssueForm({ ...issueForm, recipient_name: e.target.value })}
                      placeholder="John Doe"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={issueForm.sender_name}
                      onChange={(e) => setIssueForm({ ...issueForm, sender_name: e.target.value })}
                      placeholder="Brakebee Admin"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Personal Message (for recipient)
                  </label>
                  <textarea
                    value={issueForm.personal_message}
                    onChange={(e) => setIssueForm({ ...issueForm, personal_message: e.target.value })}
                    placeholder="Enjoy your gift!"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      Issue Reason (internal)
                    </label>
                    <input
                      type="text"
                      value={issueForm.issue_reason}
                      onChange={(e) => setIssueForm({ ...issueForm, issue_reason: e.target.value })}
                      placeholder="Return dispute, loyalty reward, etc."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      Expiration Date (optional)
                    </label>
                    <input
                      type="date"
                      value={issueForm.expires_at}
                      onChange={(e) => setIssueForm({ ...issueForm, expires_at: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Admin Notes (internal only)
                  </label>
                  <textarea
                    value={issueForm.admin_notes}
                    onChange={(e) => setIssueForm({ ...issueForm, admin_notes: e.target.value })}
                    placeholder="Internal notes about this issuance..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={issuing || !issueForm.amount}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#667eea',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: issuing || !issueForm.amount ? 'not-allowed' : 'pointer',
                    opacity: issuing || !issueForm.amount ? 0.6 : 1
                  }}
                >
                  {issuing ? 'Issuing...' : 'Issue Credit / Gift Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Lookup Tab */}
      {activeTab === 'user-lookup' && (
        <div>
          <div style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
              Look Up User Credit Balance
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Enter email or user ID..."
                onKeyDown={(e) => e.key === 'Enter' && handleUserLookup()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}
              />
              <button
                onClick={handleUserLookup}
                disabled={userLookupLoading || !userSearchTerm.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#667eea',
                  color: 'white',
                  fontWeight: '500',
                  cursor: userLookupLoading || !userSearchTerm.trim() ? 'not-allowed' : 'pointer',
                  opacity: userLookupLoading || !userSearchTerm.trim() ? 0.6 : 1
                }}
              >
                {userLookupLoading ? 'Searching...' : 'Look Up'}
              </button>
            </div>
          </div>

          {userLookupResult && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              padding: '24px'
            }}>
              {/* User Info */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '24px'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0' }}>
                    {userLookupResult.display_name || userLookupResult.username}
                  </h4>
                  <div style={{ color: '#6c757d', fontSize: '14px' }}>
                    ID: {userLookupResult.id} • {userLookupResult.username}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIssueForm({ ...issueForm, issued_to_user_id: userLookupResult.id.toString(), issued_to_email: '' });
                    setActiveTab('issue');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#28a745',
                    color: 'white',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Issue Credit to User
                </button>
              </div>

              {/* Balance Card */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '24px',
                color: 'white',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                  Current Balance
                </div>
                <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px' }}>
                  {formatCurrency(userLookupResult.balance)}
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
                  <div>
                    <span style={{ opacity: 0.8 }}>Lifetime Earned:</span>{' '}
                    {formatCurrency(userLookupResult.lifetime_earned)}
                  </div>
                  <div>
                    <span style={{ opacity: 0.8 }}>Lifetime Spent:</span>{' '}
                    {formatCurrency(userLookupResult.lifetime_spent)}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              {userLookupResult.transactions && userLookupResult.transactions.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Recent Transactions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {userLookupResult.transactions.slice(0, 10).map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          background: '#f8f9fa',
                          borderRadius: '8px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                            {tx.transaction_type}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {formatDate(tx.created_at)}
                          </div>
                        </div>
                        <div style={{
                          fontWeight: '600',
                          color: tx.amount > 0 ? '#28a745' : '#dc3545'
                        }}>
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
