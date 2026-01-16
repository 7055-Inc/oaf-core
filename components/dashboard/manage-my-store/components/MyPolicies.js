import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, handleCsrfError } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import slideInStyles from '../../SlideIn.module.css';

export default function MyPolicies({ userData }) {
  const [loading, setLoading] = useState(true);
  
  // Policy states (shipping only - return policies are now per-product)
  const [shippingPolicy, setShippingPolicy] = useState(null);
  const [shippingHistory, setShippingHistory] = useState([]);
  
  // UI states
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Editor states
  const [editText, setEditText] = useState('');

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
      
    } catch (err) {
      console.error('Error loading policy data:', err.message);
      handleCsrfError(err);
      setError('Failed to load policy data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (policyText) => {
    if (!policyText.trim()) {
      setError('Policy text cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const response = await authApiRequest('vendor/shipping-policy', {
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
      setShippingPolicy(result.policy);
      setIsEditing(false);
      setMessage('Shipping policy saved successfully!');
      
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

  const handleDeletePolicy = async () => {
    if (!confirm('Are you sure you want to delete your custom shipping policy? This will revert to the site default policy.')) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const response = await authApiRequest('vendor/shipping-policy', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete policy');
      }
      
      setMessage('Custom shipping policy deleted successfully. Using default policy.');
      
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

  const policyText = typeof shippingPolicy === 'string' ? shippingPolicy : shippingPolicy?.policy_text || '';
  const policySource = typeof shippingPolicy === 'string' ? 'custom' : shippingPolicy?.policy_source || 'default';

  const handleEdit = () => {
    setEditText(policyText);
    setMessage('');
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditText('');
    setMessage('');
    setError(null);
    setIsEditing(false);
  };

  return (
    <div>
      {/* Info box about return policies */}
      <div style={{
        background: '#dbeafe',
        border: '1px solid #93c5fd',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <p style={{ margin: 0, color: '#1e40af', fontSize: '0.9rem' }}>
          <strong>Note:</strong> Return policies are now set per-product when creating or editing products. 
          This page manages your shipping policy only.
        </p>
      </div>

      {/* Shipping Policy Editor */}
      <div className="section-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Shipping Policy</h2>
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

        {message && (
          <div className="success-alert">
            {message}
          </div>
        )}

        {error && (
          <div className="error-alert">
            {error}
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
                placeholder="Enter your shipping policy..."
                rows={8}
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => handleSavePolicy(editText)} 
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
              <div 
                style={{
                  color: '#374151',
                  lineHeight: '1.6',
                  fontSize: '0.95rem',
                  marginBottom: '1rem'
                }}
                className="policy-content"
                dangerouslySetInnerHTML={{ 
                  __html: policyText || 'No shipping policy found' 
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <button onClick={handleEdit}>
                  {policySource === 'custom' ? 'Edit Policy' : 'Create Custom Shipping Policy'}
                </button>
                {policySource === 'custom' && (
                  <button 
                    onClick={handleDeletePolicy}
                    disabled={saving}
                    style={{
                      background: '#dc2626',
                      opacity: saving ? '0.6' : '1',
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? 'Deleting...' : 'Delete Custom Policy'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shipping Policy History */}
      {shippingHistory && shippingHistory.length > 0 && (
        <div className="section-box">
          <h2>Shipping Policy Update History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {shippingHistory.map((policy) => (
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
                  {/* Strip HTML tags for preview */}
                  {policy.policy_text.replace(/<[^>]*>/g, '').substring(0, 200)}
                  {policy.policy_text.replace(/<[^>]*>/g, '').length > 200 && '...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
