import { useState, useEffect } from 'react';
import PolicyEditor from './policies/PolicyEditor';
import { handleCsrfError } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import styles from '../../SlideIn.module.css';

export default function ManageCustomPolicies({ userData }) {
  const [activeTab, setActiveTab] = useState('default-policies');
  const [loading, setLoading] = useState(true);
  
  // Policy states (shipping only - return policies are now per-product)
  const [defaultShippingPolicy, setDefaultShippingPolicy] = useState(null);
  
  // Editing states
  const [isEditingShippingDefault, setIsEditingShippingDefault] = useState(false);
  
  // Vendor policy states
  const [vendorShippingPolicies, setVendorShippingPolicies] = useState([]);
  
  // Vendor editing states
  const [editingVendorPolicies, setEditingVendorPolicies] = useState(new Set());
  
  // UI states
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicyData();
  }, []);

  const loadPolicyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load default shipping policy
      const defaultShippingResponse = await authApiRequest('admin/default-policies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (defaultShippingResponse.ok) {
        const defaultShippingData = await defaultShippingResponse.json();
        setDefaultShippingPolicy(defaultShippingData.policy);
      }

      // Load vendor shipping policies
      const vendorShippingResponse = await authApiRequest('admin/vendor-policies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (vendorShippingResponse.ok) {
        const vendorShippingData = await vendorShippingResponse.json();
        setVendorShippingPolicies(vendorShippingData.vendors || []);
      }
      
    } catch (err) {
      console.error('Error loading policy data:', err.message);
      handleCsrfError(err);
      setError('Failed to load policy data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaultPolicy = async (policyText) => {
    if (!policyText.trim()) {
      setError('Policy text cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const response = await authApiRequest('admin/default-policies', {
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
        throw new Error(errorData.error || 'Failed to update default policy');
      }
      
      setIsEditingShippingDefault(false);
      setMessage('Default shipping policy updated successfully!');
      
      // Reload policy data
      await loadPolicyData();
      
    } catch (err) {
      console.error('Error updating default policy:', err.message);
      handleCsrfError(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendorPolicy = async (userId) => {
    if (!confirm("Are you sure you want to delete this vendor's custom shipping policy?")) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const response = await authApiRequest(`admin/vendor-policies/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vendor policy');
      }
      
      setMessage("Vendor's custom shipping policy deleted successfully.");
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setMessage('');
      }, 3000);
      
      // Reload policy data
      await loadPolicyData();
      
    } catch (err) {
      console.error('Error deleting vendor policy:', err.message);
      handleCsrfError(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditVendorPolicy = (userId) => {
    const key = `${userId}-shipping`;
    const newEditingSet = new Set(editingVendorPolicies);
    newEditingSet.add(key);
    setEditingVendorPolicies(newEditingSet);
    setMessage('');
    setError(null);
  };

  const handleCancelVendorEdit = (userId) => {
    const key = `${userId}-shipping`;
    const newEditingSet = new Set(editingVendorPolicies);
    newEditingSet.delete(key);
    setEditingVendorPolicies(newEditingSet);
    setMessage('');
    setError(null);
  };

  const handleSaveVendorPolicy = async (userId, policyText) => {
    if (!policyText.trim()) {
      throw new Error('Policy text cannot be empty');
    }

    setSaving(true);

    try {
      const response = await authApiRequest(`admin/vendor-policies/${userId}`, {
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
        throw new Error(errorData.error || 'Failed to update vendor policy');
      }

      const key = `${userId}-shipping`;
      const newEditingSet = new Set(editingVendorPolicies);
      newEditingSet.delete(key);
      setEditingVendorPolicies(newEditingSet);
      
      // Reload policy data
      await loadPolicyData();
      
    } catch (err) {
      console.error('Error updating vendor policy:', err.message);
      handleCsrfError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleApplyDefaultToVendor = async (userId) => {
    if (!confirm("Are you sure you want to overwrite this vendor's custom policy with the current default shipping policy?")) {
      return;
    }

    try {
      const defaultPolicyText = defaultShippingPolicy?.policy_text;

      if (!defaultPolicyText) {
        throw new Error('No default shipping policy found');
      }

      await handleSaveVendorPolicy(userId, defaultPolicyText);
      
    } catch (err) {
      console.error('Error applying default policy to vendor:', err.message);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading policy data...</p>
      </div>
    );
  }

  const renderDefaultPoliciesTab = () => {
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
            Site-wide default shipping policy for all users
          </p>
        </div>

        {/* Info box about return policies */}
        <div style={{
          background: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: 0, color: '#1e40af', fontSize: '0.9rem' }}>
            <strong>Note:</strong> Return policies are now set per-product. The global return policy 
            is displayed on the <a href="/policies/returns" target="_blank" style={{ color: '#1e40af' }}>Returns Policy page</a> and 
            can be edited in the database directly if needed.
          </p>
        </div>
        
        {/* Default Shipping Policy Section */}
        <div className="form-card">
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Default Shipping Policy</h3>
          <PolicyEditor
            policy={defaultShippingPolicy}
            policyType="shipping"
            isEditing={isEditingShippingDefault}
            onSave={(policyText) => handleSaveDefaultPolicy(policyText)}
            onCancel={() => {
              setIsEditingShippingDefault(false);
              setMessage('');
              setError(null);
            }}
            onEdit={() => {
              setIsEditingShippingDefault(true);
              setMessage('');
              setError(null);
            }}
            saving={saving}
            message={message}
            error={error}
            isAdmin={true}
          />
        </div>
      </div>
    );
  };

  const renderVendorPoliciesTab = () => {
    return (
      <div className="section-box">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px' 
        }}>
          <h3 style={{ margin: 0, color: '#495057' }}>Vendor Shipping Policies</h3>
          <span className={`${styles.statusBadge} ${styles.statusDefault}`}>
            {vendorShippingPolicies.length} vendors with custom policies
          </span>
        </div>
        
        {vendorShippingPolicies.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: '#6c757d' 
          }}>
            <p>No vendors have custom shipping policies.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {vendorShippingPolicies.map((vendorPolicy) => {
              const key = `${vendorPolicy.user_id}-shipping`;
              const isEditing = editingVendorPolicies.has(key);
              
              return (
                <div key={vendorPolicy.user_id} className="form-card">
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '15px' 
                  }}>
                    <h4 style={{ margin: 0, color: '#495057' }}>
                      Vendor ID: {vendorPolicy.user_id} ({vendorPolicy.username || 'Unknown'})
                    </h4>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      Last updated: {new Date(vendorPolicy.policy_updated_at || vendorPolicy.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <PolicyEditor
                    policy={vendorPolicy.policy_text}
                    policyType="shipping"
                    isEditing={isEditing}
                    onSave={(policyText) => handleSaveVendorPolicy(vendorPolicy.user_id, policyText)}
                    onCancel={() => handleCancelVendorEdit(vendorPolicy.user_id)}
                    onEdit={() => handleEditVendorPolicy(vendorPolicy.user_id)}
                    onApplyDefault={() => handleApplyDefaultToVendor(vendorPolicy.user_id)}
                    saving={saving}
                    message=""
                    error=""
                    isAdmin={true}
                    extraActions={
                      <button
                        className="danger"
                        onClick={() => handleDeleteVendorPolicy(vendorPolicy.user_id)}
                        disabled={saving || isEditing}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Delete Policy
                      </button>
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'default-policies':
        return renderDefaultPoliciesTab();
      case 'vendor-policies':
        return renderVendorPoliciesTab();
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Global Messages */}
      {error && (
        <div className="error-alert" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}
      
      {message && (
        <div className="success-alert" style={{ marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '10px'
      }}>
        <button
          className={activeTab === 'default-policies' ? 'primary' : 'secondary'}
          onClick={() => {
            setActiveTab('default-policies');
            setMessage('');
            setError(null);
          }}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Default Policies
        </button>
        <button
          className={activeTab === 'vendor-policies' ? 'primary' : 'secondary'}
          onClick={() => {
            setActiveTab('vendor-policies');
            setMessage('');
            setError(null);
          }}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Vendor Shipping Policies
        </button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
