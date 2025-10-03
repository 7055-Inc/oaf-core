import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function MaintenanceControl() {
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    active: false,
    method: null,
    bypassUsers: [],
    loading: true
  });
  
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    title: "We'll Be Right Back!",
    message: "We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly.",
    estimatedTime: '',
    contactEmail: 'support@beemeeart.com',
    showProgress: false,
    bypassUsers: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      const response = await authApiRequest('admin/maintenance/status');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceStatus({
          ...data,
          loading: false
        });
        
        // Update config with current settings
        if (data.config) {
          setMaintenanceConfig(prev => ({
            ...prev,
            ...data.config,
            bypassUsers: data.bypassUsers?.join(', ') || ''
          }));
        }
      } else {
        throw new Error('Failed to fetch maintenance status');
      }
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
      setError('Failed to load maintenance status');
      setMaintenanceStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const toggleMaintenance = async (enable) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = enable ? 'admin/maintenance/enable' : 'admin/maintenance/disable';
      const response = await authApiRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(enable ? maintenanceConfig : {})
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || `Maintenance mode ${enable ? 'enabled' : 'disabled'} successfully`);
        await fetchMaintenanceStatus();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle maintenance mode');
      }
    } catch (err) {
      console.error('Error toggling maintenance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setMaintenanceConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testMaintenancePage = () => {
    window.open('/maintenance', '_blank');
  };

  if (maintenanceStatus.loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-block', 
          width: '20px', 
          height: '20px', 
          border: '2px solid #f3f3f3',
          borderTop: '2px solid #055474',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '10px', color: '#6c757d' }}>Loading maintenance status...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '2px solid #dee2e6'
      }}>
        <div>
          <h2 style={{ margin: '0', color: '#2d3748', fontSize: '24px' }}>
            System Maintenance Control
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
            Manage site-wide maintenance mode and lock-out settings
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: maintenanceStatus.active ? '#fee2e2' : '#f0fdf4',
            border: `1px solid ${maintenanceStatus.active ? '#fecaca' : '#bbf7d0'}`
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: maintenanceStatus.active ? '#ef4444' : '#22c55e'
            }}></div>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '600',
              color: maintenanceStatus.active ? '#dc2626' : '#16a34a'
            }}>
              {maintenanceStatus.active ? 'MAINTENANCE ACTIVE' : 'SYSTEM ONLINE'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: '#fee2e2', 
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={{ 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0',
          color: '#16a34a',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>Success:</strong> {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Current Status Panel */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '18px' }}>
            Current Status
          </h3>
          
          <div style={{ marginBottom: '15px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ fontWeight: '600', color: '#4a5568' }}>Status:</span>
              <span style={{ 
                color: maintenanceStatus.active ? '#dc2626' : '#16a34a',
                fontWeight: '600'
              }}>
                {maintenanceStatus.active ? 'Maintenance Mode' : 'Online'}
              </span>
            </div>
            
            {maintenanceStatus.method && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: '600', color: '#4a5568' }}>Method:</span>
                <span style={{ color: '#6c757d', textTransform: 'capitalize' }}>
                  {maintenanceStatus.method}
                </span>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ fontWeight: '600', color: '#4a5568' }}>Bypass Users:</span>
              <span style={{ color: '#6c757d' }}>
                {maintenanceStatus.bypassUsers?.length || 0} configured
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={testMaintenancePage}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Preview Page
            </button>
            
            <button
              onClick={fetchMaintenanceStatus}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#055474',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1
              }}
            >
              Refresh Status
            </button>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '18px' }}>
            Quick Actions
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!maintenanceStatus.active ? (
              <button
                onClick={() => toggleMaintenance(true)}
                disabled={loading}
                style={{
                  padding: '12px 20px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Enabling...' : 'Enable Maintenance Mode'}
              </button>
            ) : (
              <button
                onClick={() => toggleMaintenance(false)}
                disabled={loading}
                style={{
                  padding: '12px 20px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Disabling...' : 'Disable Maintenance Mode'}
              </button>
            )}
            
            <div style={{ 
              fontSize: '12px', 
              color: '#6c757d',
              textAlign: 'center',
              padding: '8px',
              background: '#e9ecef',
              borderRadius: '4px'
            }}>
              <strong>Note:</strong> Admins can always access the site during maintenance
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div style={{ 
        marginTop: '30px',
        background: '#ffffff', 
        padding: '25px', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#2d3748', fontSize: '18px' }}>
          Maintenance Page Configuration
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '600',
              color: '#4a5568',
              fontSize: '14px'
            }}>
              Page Title
            </label>
            <input
              type="text"
              value={maintenanceConfig.title}
              onChange={(e) => handleConfigChange('title', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="We'll Be Right Back!"
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '600',
              color: '#4a5568',
              fontSize: '14px'
            }}>
              Contact Email
            </label>
            <input
              type="email"
              value={maintenanceConfig.contactEmail}
              onChange={(e) => handleConfigChange('contactEmail', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="support@beemeeart.com"
            />
          </div>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '600',
              color: '#4a5568',
              fontSize: '14px'
            }}>
              Message
            </label>
            <textarea
              value={maintenanceConfig.message}
              onChange={(e) => handleConfigChange('message', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="We're currently performing scheduled maintenance..."
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '600',
              color: '#4a5568',
              fontSize: '14px'
            }}>
              Estimated Completion Time
            </label>
            <input
              type="datetime-local"
              value={maintenanceConfig.estimatedTime}
              onChange={(e) => handleConfigChange('estimatedTime', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '600',
              color: '#4a5568',
              fontSize: '14px'
            }}>
              Bypass Users (usernames, comma-separated)
            </label>
            <input
              type="text"
              value={maintenanceConfig.bypassUsers}
              onChange={(e) => handleConfigChange('bypassUsers', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="admin, developer, tester"
            />
          </div>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#4a5568'
            }}>
              <input
                type="checkbox"
                checked={maintenanceConfig.showProgress}
                onChange={(e) => handleConfigChange('showProgress', e.target.checked)}
                style={{ margin: '0' }}
              />
              Show Progress Bar
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
