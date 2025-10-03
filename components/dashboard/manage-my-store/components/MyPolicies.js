import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, handleCsrfError } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import slideInStyles from '../../SlideIn.module.css';

export default function MyPolicies({ userData }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shipping');
  
  // Policy states
  const [shippingPolicy, setShippingPolicy] = useState(null);
  const [returnPolicy, setReturnPolicy] = useState(null);
  const [shippingHistory, setShippingHistory] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  
  // UI states
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isEditingReturn, setIsEditingReturn] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // PolicyEditor states (moved to top level)
  const [editText, setEditText] = useState('');
  const [localMessage, setLocalMessage] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    loadPolicyData();
  }, []);

  const loadPolicyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load shipping policy
      const shippingResponse = await authApiRequest('vendor/shipping-policy', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (shippingResponse.ok) {
        const shippingData = await shippingResponse.json();
        setShippingPolicy(shippingData.policy);
      }

      // Load return policy
      const returnResponse = await authApiRequest('vendor/return-policy', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (returnResponse.ok) {
        const returnData = await returnResponse.json();
        setReturnPolicy(returnData.policy);
      }

      // Load shipping policy history
      const shippingHistoryResponse = await authApiRequest('vendor/shipping-policy/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (shippingHistoryResponse.ok) {
        const shippingHistoryData = await shippingHistoryResponse.json();
        setShippingHistory(shippingHistoryData.history);
      }

      // Load return policy history
      const returnHistoryResponse = await authApiRequest('vendor/return-policy/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (returnHistoryResponse.ok) {
        const returnHistoryData = await returnHistoryResponse.json();
        setReturnHistory(returnHistoryData.history);
      }
      
    } catch (err) {
      console.error('Error loading policy data:', err.message);
      handleCsrfError(err);
      setError('Failed to load policy data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (policyText, policyType) => {
    if (!policyText.trim()) {
      setError('Policy text cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const endpoint = policyType === 'return' ? 'return-policy' : 'shipping-policy';
      const response = await authApiRequest(`vendor/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          policy_text: policyText.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save policy');
      }

      const result = await response.json();
      
      if (policyType === 'shipping') {
        setShippingPolicy(result.policy);
        setIsEditingShipping(false);
      } else {
        setReturnPolicy(result.policy);
        setIsEditingReturn(false);
      }
      
      setMessage(`${policyType === 'shipping' ? 'Shipping' : 'Return'} policy saved successfully!`);
      
      // Reload policy data to get updated history
      await loadPolicyData();
      
    } catch (err) {
      console.error('Error saving policy:', err.message);
      handleCsrfError(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolicy = async (policyType) => {
    const policyName = policyType === 'shipping' ? 'shipping' : 'return';
    
    if (!confirm(`Are you sure you want to delete your custom ${policyName} policy? This will revert to the site default policy.`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const endpoint = policyType === 'return' ? 'return-policy' : 'shipping-policy';
      const response = await authApiRequest(`vendor/${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete policy');
      }
      
      setMessage(`Custom ${policyName} policy deleted successfully. Using default policy.`);
      
      // Reload policy data
      await loadPolicyData();
      
    } catch (err) {
      console.error('Error deleting policy:', err.message);
      handleCsrfError(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading policies...</div>;
  }

  const currentPolicy = activeTab === 'shipping' ? shippingPolicy : returnPolicy;
  const currentHistory = activeTab === 'shipping' ? shippingHistory : returnHistory;
  const isEditing = activeTab === 'shipping' ? isEditingShipping : isEditingReturn;

  return (
    <div>
        {/* Policy Type Tabs */}
        <div className="tab-container">
          <button 
            className={`tab ${activeTab === 'shipping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipping')}
          >
            Shipping Policy
          </button>
          <button 
            className={`tab ${activeTab === 'return' ? 'active' : ''}`}
            onClick={() => setActiveTab('return')}
          >
            Return Policy
          </button>
        </div>

        {/* Policy Editor - Inline Component */}
        {(() => {
          // PolicyEditor inline logic
          const handleEdit = () => {
            const policyText = typeof currentPolicy === 'string' ? currentPolicy : currentPolicy?.policy_text || '';
            setEditText(policyText);
            setLocalMessage('');
            setLocalError('');
            if (activeTab === 'shipping') {
              setIsEditingShipping(true);
            } else {
              setIsEditingReturn(true);
            }
            setMessage('');
            setError(null);
          };

          const handleSave = async () => {
            try {
              setLocalMessage('');
              setLocalError('');
              await handleSavePolicy(editText.trim(), activeTab);
              setLocalMessage('Policy updated successfully!');
            } catch (err) {
              setLocalError(err.message || 'Failed to update policy');
            }
          };

          const handleCancel = () => {
            setEditText('');
            setLocalMessage('');
            setLocalError('');
            if (activeTab === 'shipping') {
              setIsEditingShipping(false);
            } else {
              setIsEditingReturn(false);
            }
            setMessage('');
            setError(null);
          };

          const policyTypeLabel = activeTab === 'return' ? 'Return' : 'Shipping';
          const policyTypeLower = activeTab.toLowerCase();
          const policyText = typeof currentPolicy === 'string' ? currentPolicy : currentPolicy?.policy_text || '';
          const policySource = typeof currentPolicy === 'string' ? 'custom' : currentPolicy?.policy_source || 'default';

          return (
            <div className="section-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Current {policyTypeLabel} Policy</h2>
                <div>
                  {policySource === 'custom' ? (
                    <span style={{ 
                      background: '#059669', 
                      color: 'white', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '0.25rem', 
                      fontSize: '0.75rem', 
                      fontWeight: '500' 
                    }}>
                      Custom Policy
                    </span>
                  ) : (
                    <span style={{ 
                      background: '#6b7280', 
                      color: 'white', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '0.25rem', 
                      fontSize: '0.75rem', 
                      fontWeight: '500' 
                    }}>
                      Default Policy
                    </span>
                  )}
                </div>
              </div>

              {(localMessage || message) && (
                <div className="success-alert">
                  {localMessage || message}
                </div>
              )}

              {(localError || error) && (
                <div className="error-alert">
                  {localError || error}
                </div>
              )}

              <div style={{ 
                background: '#f9fafb', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem', 
                padding: '1.5rem' 
              }}>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder={`Enter your ${policyTypeLower} policy...`}
                      rows={8}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={handleSave} 
                        disabled={saving || !editText.trim()}
                        style={{
                          opacity: (saving || !editText.trim()) ? '0.6' : '1',
                          cursor: (saving || !editText.trim()) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {saving ? 'Saving...' : 'Save Policy'}
                      </button>
                      <button 
                        onClick={handleCancel}
                        className="secondary"
                        disabled={saving}
                        style={{
                          opacity: saving ? '0.6' : '1',
                          cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                      color: '#374151',
                      lineHeight: '1.6',
                      fontSize: '0.95rem',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '1rem'
                    }}>
                      {policyText || `No ${policyTypeLower} policy found`}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                      <button onClick={handleEdit}>
                        {policySource === 'custom' ? 'Edit Policy' : `Create Custom ${policyTypeLabel} Policy`}
                      </button>
                      {policySource === 'custom' && (
                        <button 
                          onClick={() => handleDeletePolicy(activeTab)}
                          disabled={saving}
                          style={{
                            background: '#dc2626',
                            opacity: saving ? '0.6' : '1',
                            cursor: saving ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {saving ? 'Deleting...' : `Delete Custom ${policyTypeLabel} Policy`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Policy History - Inline Component */}
        {(() => {
          if (!currentHistory || currentHistory.length === 0) {
            return null;
          }

          const policyTypeLabel = activeTab === 'return' ? 'Return' : 'Shipping';
          const displayTitle = `${policyTypeLabel} Policy Update History`;

          return (
            <div className="section-box">
              <h2>{displayTitle}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentHistory.map((policy) => (
                  <div 
                    key={policy.id} 
                    style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '0.5rem' 
                    }}>
                      <span style={{
                        background: '#6b7280',
                        color: 'white',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {policy.status === 'active' ? 'Active' : 'Archived'}
                      </span>
                      <span style={{
                        color: '#6b7280',
                        fontSize: '0.75rem'
                      }}>
                        {new Date(policy.created_at).toLocaleDateString()} 
                        {policy.created_by_username && ` by ${policy.created_by_username}`}
                      </span>
                    </div>
                    <div style={{
                      color: '#374151',
                      fontSize: '0.875rem',
                      lineHeight: '1.5'
                    }}>
                      {policy.policy_text.substring(0, 200)}
                      {policy.policy_text.length > 200 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
