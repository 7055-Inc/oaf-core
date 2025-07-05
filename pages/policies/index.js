import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import PolicyEditor from '../../components/policies/PolicyEditor';
import PolicyHistory from '../../components/policies/PolicyHistory';
import { authenticatedApiRequest, handleCsrfError } from '../../lib/csrf';
import styles from '../../styles/Policies.module.css';

export default function VendorPolicies() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
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
  
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.split('token=')[1]?.split(';')[0];
    if (!token) {
      router.push('/');
      return;
    }

    setIsLoggedIn(true);
    
    // Get user data and check vendor permissions
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.permissions?.includes('vendor')) {
      router.push('/dashboard');
      return;
    }
    
    setUserData({ permissions: payload.permissions });
    loadPolicyData();
  }, [router]);

  const loadPolicyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load shipping policy
      const shippingResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/vendor/shipping-policy', {
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
      const returnResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/vendor/return-policy', {
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
      const shippingHistoryResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/vendor/shipping-policy/history', {
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
      const returnHistoryResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/vendor/return-policy/history', {
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/vendor/${endpoint}`, {
        method: 'POST',
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/vendor/${endpoint}`, {
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

  const currentPolicy = activeTab === 'shipping' ? shippingPolicy : returnPolicy;
  const currentHistory = activeTab === 'shipping' ? shippingHistory : returnHistory;
  const isEditing = activeTab === 'shipping' ? isEditingShipping : isEditingReturn;

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Manage Your Policies</h1>
          <p>Customize your shipping and return policies or use the site defaults</p>
        </div>

        {/* Policy Type Tabs */}
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tab} ${activeTab === 'shipping' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('shipping')}
          >
            Shipping Policy
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'return' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('return')}
          >
            Return Policy
          </button>
        </div>

        {/* Policy Editor */}
        <PolicyEditor
          policy={currentPolicy}
          policyType={activeTab}
          isEditing={isEditing}
          onSave={(policyText) => handleSavePolicy(policyText, activeTab)}
          onCancel={() => {
            if (activeTab === 'shipping') {
              setIsEditingShipping(false);
            } else {
              setIsEditingReturn(false);
            }
            setMessage('');
            setError(null);
          }}
          onEdit={() => {
            if (activeTab === 'shipping') {
              setIsEditingShipping(true);
            } else {
              setIsEditingReturn(true);
            }
            setMessage('');
            setError(null);
          }}
          onDelete={() => handleDeletePolicy(activeTab)}
          saving={saving}
          message={message}
          error={error}
        />

        {/* Policy History */}
        <PolicyHistory 
          history={currentHistory}
          policyType={activeTab}
        />

        {/* Navigation */}
        <div className={styles.navigation}>
          <a href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
} 