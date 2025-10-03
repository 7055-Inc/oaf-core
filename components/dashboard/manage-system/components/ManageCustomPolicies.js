import { useState, useEffect } from 'react';
import PolicyEditor from './policies/PolicyEditor';
import { handleCsrfError } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import styles from '../../SlideIn.module.css';

export default function ManageCustomPolicies({ userData }) {
  const [activeTab, setActiveTab] = useState('default-policies');
  const [loading, setLoading] = useState(true);
  
  // Default policy states
  const [defaultShippingPolicy, setDefaultShippingPolicy] = useState(null);
  const [defaultReturnPolicy, setDefaultReturnPolicy] = useState(null);
  
  // Editing states
  const [isEditingShippingDefault, setIsEditingShippingDefault] = useState(false);
  const [isEditingReturnDefault, setIsEditingReturnDefault] = useState(false);
  
  // Vendor policy states
  const [vendorShippingPolicies, setVendorShippingPolicies] = useState([]);
  const [vendorReturnPolicies, setVendorReturnPolicies] = useState([]);
  
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

      // Load default return policy
      const defaultReturnResponse = await authApiRequest('admin/default-return-policies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (defaultReturnResponse.ok) {
        const defaultReturnData = await defaultReturnResponse.json();
        setDefaultReturnPolicy(defaultReturnData.policy);
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

      // Load vendor return policies
      const vendorReturnResponse = await authApiRequest('admin/vendor-return-policies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (vendorReturnResponse.ok) {
        const vendorReturnData = await vendorReturnResponse.json();
        setVendorReturnPolicies(vendorReturnData.vendors || []);
      }
      
    } catch (err) {
      console.error('Error loading policy data:', err.message);
      handleCsrfError(err);
      setError('Failed to load policy data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaultPolicy = async (policyText, policyType) => {
    if (!policyText.trim()) {
      setError('Policy text cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const endpoint = policyType === 'return' ? 'default-return-policies' : 'default-policies';
      const response = await authApiRequest(`admin/${endpoint}`, {
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
      
      if (policyType === 'shipping') {
        setIsEditingShippingDefault(false);
      } else {
        setIsEditingReturnDefault(false);
      }
      
      setMessage(`Default ${policyType} policy updated successfully!`);
      
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

  const handleDeleteVendorPolicy = async (userId, policyType) => {
    const policyName = policyType === 'shipping' ? 'shipping' : 'return';
    
    if (!confirm(`Are you sure you want to delete this vendor's custom ${policyName} policy?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const endpoint = policyType === 'return' ? 'vendor-return-policies' : 'vendor-policies';
      const response = await authApiRequest(`admin/${endpoint}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vendor policy');
      }
      
      setMessage(`Vendor's custom ${policyName} policy deleted successfully.`);
      
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

  const handleEditVendorPolicy = (userId, policyType) => {
    const key = `${userId}-${policyType}`;
    const newEditingSet = new Set(editingVendorPolicies);
    newEditingSet.add(key);
    setEditingVendorPolicies(newEditingSet);
    setMessage('');
    setError(null);
  };

  const handleCancelVendorEdit = (userId, policyType) => {
    const key = `${userId}-${policyType}`;
    const newEditingSet = new Set(editingVendorPolicies);
    newEditingSet.delete(key);
    setEditingVendorPolicies(newEditingSet);
    setMessage('');
    setError(null);
  };

  const handleSaveVendorPolicy = async (userId, policyType, policyText) => {
    if (!policyText.trim()) {
      throw new Error('Policy text cannot be empty');
    }

    setSaving(true);

    try {
      const endpoint = policyType === 'return' ? 'vendor-return-policies' : 'vendor-policies';
      const response = await authApiRequest(`admin/${endpoint}/${userId}`, {
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

      const key = `${userId}-${policyType}`;
      const newEditingSet = new Set(editingVendorPolicies);
      newEditingSet.delete(key);
      setEditingVendorPolicies(newEditingSet);
      
      // Reload policy data
      await loadPolicyData();
      
    } catch (err) {
      console.error('Error updating vendor policy:', err.message);
      handleCsrfError(err);
      throw err; // Re-throw so PolicyEditor can handle it
    } finally {
      setSaving(false);
    }
  };

  const handleApplyDefaultToVendor = async (userId, policyType) => {
    if (!confirm(`Are you sure you want to overwrite this vendor's custom policy with the current default ${policyType} policy?`)) {
      return;
    }

    try {
      const defaultPolicyText = policyType === 'shipping' 
        ? defaultShippingPolicy?.policy_text 
        : defaultReturnPolicy?.policy_text;

      if (!defaultPolicyText) {
        throw new Error(`No default ${policyType} policy found`);
      }

      // Use the same save handler but with the default policy text
      await handleSaveVendorPolicy(userId, policyType, defaultPolicyText);
      
    } catch (err) {
      console.error('Error applying default policy to vendor:', err.message);
      throw err; // Re-throw so PolicyEditor can handle it
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

  const renderDefaultPolicyTab = (policyType) => {
    const isShipping = policyType === 'shipping';
    const policy = isShipping ? defaultShippingPolicy : defaultReturnPolicy;
    const isEditing = isShipping ? isEditingShippingDefault : isEditingReturnDefault;

    return (
      <PolicyEditor
        policy={policy}
        policyType={policyType}
        isEditing={isEditing}
        onSave={(policyText) => handleSaveDefaultPolicy(policyText, policyType)}
        onCancel={() => {
          if (isShipping) {
            setIsEditingShippingDefault(false);
          } else {
            setIsEditingReturnDefault(false);
          }
          setMessage('');
          setError(null);
        }}
        onEdit={() => {
          if (isShipping) {
            setIsEditingShippingDefault(true);
          } else {
            setIsEditingReturnDefault(true);
          }
          setMessage('');
          setError(null);
        }}
        saving={saving}
        message={message}
        error={error}
        isAdmin={true}
      />
    );
  };

  const renderVendorPolicyTab = (policyType) => {
    const vendorPolicies = policyType === 'shipping' ? vendorShippingPolicies : vendorReturnPolicies;
    const policyName = policyType === 'shipping' ? 'Shipping' : 'Return';

    return (
      <div className="section-box">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px' 
        }}>
          <h3 style={{ margin: 0, color: '#495057' }}>Vendor {policyName} Policies</h3>
          <span className={`${styles.statusBadge} ${styles.statusDefault}`}>
            {vendorPolicies.length} vendors with custom policies
          </span>
        </div>
        
        {vendorPolicies.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: '#6c757d' 
          }}>
            <p>No vendors have custom {policyType} policies.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {vendorPolicies.map((vendorPolicy) => {
              const key = `${vendorPolicy.user_id}-${policyType}`;
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
                    policyType={policyType}
                    isEditing={isEditing}
                    onSave={(policyText) => handleSaveVendorPolicy(vendorPolicy.user_id, policyType, policyText)}
                    onCancel={() => handleCancelVendorEdit(vendorPolicy.user_id, policyType)}
                    onEdit={() => handleEditVendorPolicy(vendorPolicy.user_id, policyType)}
                    onApplyDefault={() => handleApplyDefaultToVendor(vendorPolicy.user_id, policyType)}
                    saving={saving}
                    message=""
                    error=""
                    isAdmin={true}
                    extraActions={
                      <button
                        className="danger"
                        onClick={() => handleDeleteVendorPolicy(vendorPolicy.user_id, policyType)}
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

  const renderDefaultPoliciesTab = () => {
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
            Site-wide default policies for all users
          </p>
        </div>
        
        {/* Default Shipping Policy Section */}
        <div className="form-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Default Shipping Policy</h3>
          {renderDefaultPolicyTab('shipping')}
        </div>
        
        {/* Default Return Policy Section */}
        <div className="form-card">
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Default Return Policy</h3>
          {renderDefaultPolicyTab('return')}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'default-policies':
        return renderDefaultPoliciesTab();
      case 'shipping-policies':
        return renderVendorPolicyTab('shipping');
      case 'return-policies':
        return renderVendorPolicyTab('return');
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
          className={activeTab === 'shipping-policies' ? 'primary' : 'secondary'}
          onClick={() => {
            setActiveTab('shipping-policies');
            setMessage('');
            setError(null);
          }}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Shipping Policies
        </button>
        <button
          className={activeTab === 'return-policies' ? 'primary' : 'secondary'}
          onClick={() => {
            setActiveTab('return-policies');
            setMessage('');
            setError(null);
          }}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Return Policies
        </button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
