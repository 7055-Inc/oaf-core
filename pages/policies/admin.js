import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import PolicyEditor from '../../components/policies/PolicyEditor';
import PolicyTabs from '../../components/policies/PolicyTabs';
import { authenticatedApiRequest, handleCsrfError } from '../../lib/csrf';
import styles from '../../styles/Policies.module.css';

export default function AdminPolicies() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('default-policies');
  
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
  
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.split('token=')[1]?.split(';')[0];
    if (!token) {
      router.push('/');
      return;
    }

    setIsLoggedIn(true);
    
    // Get user data and check admin permissions
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Fetch user data to check user_type
    fetch('https://api2.onlineartfestival.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }
      return res.json();
    })
    .then(data => {
      // Check if user is admin
      if (data.user_type !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      setUserData({ 
        ...data, 
        permissions: payload.permissions || [] 
      });
      loadPolicyData();
    })
    .catch(err => {
      console.error('Error fetching user data:', err.message);
      router.push('/dashboard');
    });
  }, [router]);

  const loadPolicyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load default shipping policy
      const defaultShippingResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/default-policies', {
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
      const defaultReturnResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/default-return-policies', {
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
      const vendorShippingResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/vendor-policies', {
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
      const vendorReturnResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/vendor-return-policies', {
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/admin/${endpoint}`, {
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/admin/${endpoint}/${userId}`, {
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
    // Clear global messages when starting to edit
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/admin/${endpoint}/${userId}`, {
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

  if (!isLoggedIn || loading) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1>Error</h1>
          <p>{error}</p>
        </div>
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
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Vendor {policyName} Policies</h2>
          <span className={styles.defaultBadge}>
            {vendorPolicies.length} vendors with custom policies
          </span>
        </div>
        
        {vendorPolicies.length === 0 ? (
          <p>No vendors have custom {policyType} policies.</p>
        ) : (
          <div className={styles.vendorsList}>
            {vendorPolicies.map((vendorPolicy) => {
              const key = `${vendorPolicy.user_id}-${policyType}`;
              const isEditing = editingVendorPolicies.has(key);
              
              return (
                <div key={vendorPolicy.user_id} className={styles.vendorCard}>
                  <div className={styles.vendorHeader}>
                    <h3>Vendor ID: {vendorPolicy.user_id} ({vendorPolicy.username || 'Unknown'})</h3>
                    <div className={styles.historyDate}>
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
                        className={styles.deleteButton}
                        onClick={() => handleDeleteVendorPolicy(vendorPolicy.user_id, policyType)}
                        disabled={saving || isEditing}
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
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Default Policies</h2>
          <span className={styles.defaultBadge}>
            Site-wide default policies for all users
          </span>
        </div>
        
        {/* Default Shipping Policy Section */}
        <div className={styles.policySection}>
          <h3>Default Shipping Policy</h3>
          {renderDefaultPolicyTab('shipping')}
        </div>
        
        {/* Default Return Policy Section */}
        <div className={styles.policySection}>
          <h3>Default Return Policy</h3>
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
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Policy Management</h1>
          <p>Manage default policies and vendor policy overrides</p>
        </div>

        {/* Policy Management Tabs */}
        <PolicyTabs 
          activeTab={activeTab} 
          onTabChange={(newTab) => {
            setActiveTab(newTab);
            // Clear global messages when switching tabs
            setMessage('');
            setError(null);
          }} 
        />

        {/* Tab Content */}
        {renderTabContent()}

        {/* Navigation */}
        <div className={styles.navigation}>
          <a href="/admin" className={styles.backLink}>
            ← Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
} 