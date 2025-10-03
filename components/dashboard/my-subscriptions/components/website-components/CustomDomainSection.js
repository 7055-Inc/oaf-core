import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../../lib/csrf';
import { authApiRequest } from '../../../../../lib/apiUtils';

export default function CustomDomainSection({ site }) {
  const [domainStatus, setDomainStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [domainCheck, setDomainCheck] = useState({
    checking: false,
    available: null,
    error: null
  });

  useEffect(() => {
    // Always fetch domain status when component mounts to check for any validation in progress
    fetchDomainStatus();
  }, [site.id]);

  const fetchDomainStatus = async () => {
    try {
      setLoading(true);
      const response = await authApiRequest(
        `api/domains/status/${site.id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setDomainStatus(data);

      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch domain status');
        console.error('Domain status error:', errorData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkDomainAvailability = async (domain) => {
    // Only check domains that have a valid format (must contain a dot and TLD)
    if (!domain || domain.length < 4 || !domain.includes('.') || !domain.match(/\.[a-z]{2,}$/i)) {
      setDomainCheck({ checking: false, available: null, error: null });
      return;
    }

    setDomainCheck({ checking: true, available: null, error: null });

    try {
      const response = await authenticatedApiRequest(
        `api/domains/check-availability?domain=${encodeURIComponent(domain)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setDomainCheck({
          checking: false,
          available: data.available,
          error: data.available ? null : (data.error || data.reason)
        });
      } else {
        const errorData = await response.json();
        setDomainCheck({
          checking: false,
          available: false,
          error: errorData.error || 'Failed to check domain'
        });
      }
    } catch (err) {
      setDomainCheck({
        checking: false,
        available: false,
        error: err.message
      });
    }
  };

  const startDomainValidation = async () => {
    if (!newDomain) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedApiRequest(
        'api/domains/start-validation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            siteId: site.id,
            customDomain: newDomain
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuccess('Domain validation started successfully! Please set up your DNS records.');
        setShowAddDomain(false);
        setNewDomain('');
        setDomainCheck({ checking: false, available: null, error: null });
        
        // Refresh domain status to show DNS instructions
        setTimeout(() => {
          fetchDomainStatus();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start domain validation');

      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const retryValidation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedApiRequest(
        `api/domains/retry-validation/${site.id}`,
        {
          method: 'POST'
        }
      );

      if (response.ok) {
        setSuccess('Domain validation retry started!');
        
        // Refresh domain status
        setTimeout(() => {
          fetchDomainStatus();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to retry validation');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelValidation = async () => {
    if (!confirm('Are you sure you want to cancel the domain validation? You can restart it later if needed.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedApiRequest(
        `api/domains/cancel-validation/${site.id}`,
        {
          method: 'POST'
        }
      );

      if (response.ok) {
        setSuccess('Domain validation cancelled successfully!');
        setDomainStatus(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to cancel validation');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeDomain = async () => {
    if (!confirm('Are you sure you want to remove your custom domain? This will disconnect it from your site.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedApiRequest(
        `api/domains/remove/${site.id}`,
        {
          method: 'DELETE'
        }
      );

      if (response.ok) {
        setSuccess('Custom domain removed successfully!');
        setDomainStatus(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove domain');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      {error && (
        <div style={{ 
          padding: '10px', 
          background: '#f8d7da', 
          border: '1px solid #dc3545', 
          borderRadius: '2px', 
          marginBottom: '15px',
          color: '#721c24',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: '10px', 
          background: '#d4edda', 
          border: '1px solid #28a745', 
          borderRadius: '2px', 
          marginBottom: '15px',
          color: '#155724',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      {(site.custom_domain || domainStatus?.customDomain) ? (
        /* Existing Domain Management */
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'auto 1fr', 
            gap: '8px 15px',
            fontSize: '14px',
            marginBottom: '15px'
          }}>
            <div style={{ color: '#6c757d' }}>Custom Domain:</div>
            <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>{site.custom_domain || domainStatus?.customDomain}</div>
            
            <div style={{ color: '#6c757d' }}>Status:</div>
            <div style={{ 
              color: domainStatus?.validationStatus === 'verified' && domainStatus?.isActive ? '#28a745' : 
                    domainStatus?.validationStatus === 'failed' ? '#dc3545' : '#ffc107'
            }}>
              {domainStatus?.validationStatus === 'verified' && domainStatus?.isActive ? '✅ Active' :
               domainStatus?.validationStatus === 'failed' ? '❌ Failed' :
               domainStatus?.validationStatus === 'pending' ? '⏳ Pending Verification' : '🔄 Loading...'}
            </div>
          </div>

          {/* Domain Status Details */}
          {domainStatus && (
            <div>
              {domainStatus.validationStatus === 'pending' && (
                <div style={{ 
                  background: '#fff3cd', 
                  border: '1px solid #ffc107', 
                  borderRadius: '2px', 
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#856404' }}>📋 DNS Setup Required</h5>
                  <p style={{ margin: '0 0 15px 0', color: '#856404' }}>Add these DNS records to your domain's DNS settings:</p>
                  
                  <div style={{ 
                    background: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '2px', 
                    padding: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Record Type:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>TXT</code>
                      <button 
                        onClick={() => copyToClipboard('TXT')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Name/Host:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>_oaf-site-verification</code>
                      <button 
                        onClick={() => copyToClipboard('_oaf-site-verification')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div>
                      <strong>Value:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px',
                        wordBreak: 'break-all'
                      }}>{domainStatus.validationKey}</code>
                      <button 
                        onClick={() => copyToClipboard(domainStatus.validationKey)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  {/* A-Record Instructions */}
                  <div style={{ 
                    background: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '2px', 
                    padding: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Record Type:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>A</code>
                      <button 
                        onClick={() => copyToClipboard('A')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Name/Host:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>@</code>
                      <button 
                        onClick={() => copyToClipboard('@')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                      <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
                        (or leave blank for root domain)
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Value/Points to:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>34.59.133.38</code>
                      <button 
                        onClick={() => copyToClipboard('34.59.133.38')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  {/* Optional WWW CNAME Record */}
                  <div style={{ 
                    background: '#f0f8ff', 
                    border: '1px solid #b3d9ff', 
                    borderRadius: '2px', 
                    padding: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#0066cc' }}>
                      📌 Optional: Support www subdomain
                    </div>
                    <div style={{ fontSize: '12px', color: '#0066cc', marginBottom: '8px' }}>
                      Add this CNAME record to make www.{site.custom_domain || domainStatus?.customDomain} work too:
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Record Type:</strong> 
                      <code style={{ 
                        background: '#e6f3ff', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>CNAME</code>
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Name/Host:</strong> 
                      <code style={{ 
                        background: '#e6f3ff', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>www</code>
                    </div>
                    <div>
                      <strong>Value/Points to:</strong> 
                      <code style={{ 
                        background: '#e6f3ff', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>{site.custom_domain || domainStatus?.customDomain}</code>
                      <button 
                        onClick={() => copyToClipboard(site.custom_domain || domainStatus?.customDomain)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0066cc',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', color: '#856404' }}>
                    <p style={{ margin: '0 0 10px 0' }}><strong>💡 How to add these records:</strong></p>
                    <ol style={{ margin: '0', paddingLeft: '20px' }}>
                      <li>Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                      <li>Find the DNS settings for {site.custom_domain || domainStatus?.customDomain}</li>
                      <li><strong>Required:</strong> Add the TXT record above (for verification)</li>
                      <li><strong>Required:</strong> Add the A record above (to point your domain to our server)</li>
                      <li><strong>Optional:</strong> Add the CNAME record above (to support www subdomain)</li>
                      <li>Wait for DNS propagation (usually 5-30 minutes)</li>
                      <li>We'll automatically verify and activate your domain!</li>
                    </ol>
                  </div>

                  {domainStatus.expiresAt && (
                    <div style={{ 
                      marginTop: '10px', 
                      fontSize: '12px', 
                      color: '#856404' 
                    }}>
                      ⏰ Validation expires: {formatDate(domainStatus.expiresAt)}
                    </div>
                  )}
                </div>
              )}

              {domainStatus.validationStatus === 'failed' && (
                <div style={{ 
                  background: '#f8d7da', 
                  border: '1px solid #dc3545', 
                  borderRadius: '2px', 
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#721c24' }}>❌ Validation Failed</h5>
                  <p style={{ margin: '0 0 10px 0', color: '#721c24' }}>We couldn't verify your domain ownership.</p>
                  {domainStatus.error && (
                    <div style={{ 
                      background: '#f5c6cb', 
                      padding: '8px', 
                      borderRadius: '2px', 
                      marginBottom: '10px'
                    }}>
                      <strong>Error:</strong> {domainStatus.error}
                    </div>
                  )}
                  <p style={{ margin: '0', color: '#721c24' }}>Please check your DNS settings and try again.</p>
                </div>
              )}

              {domainStatus.validationStatus === 'verified' && domainStatus.isActive && (
                <div style={{ 
                  background: '#d4edda', 
                  border: '1px solid #28a745', 
                  borderRadius: '2px', 
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#155724' }}>✅ Domain Verified & Active</h5>
                  <p style={{ margin: '0 0 10px 0', color: '#155724' }}>Your custom domain is working perfectly! Visitors can now access your site at:</p>
                  <div style={{ textAlign: 'center' }}>
                    <a 
                      href={`https://${site.custom_domain || domainStatus?.customDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#28a745',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '2px',
                        fontWeight: 'bold'
                      }}
                    >
                      https://{site.custom_domain || domainStatus?.customDomain}
                    </a>
                  </div>
                </div>
              )}

              {domainStatus.lastAttempt && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6c757d',
                  marginBottom: '15px'
                }}>
                  Last checked: {formatDate(domainStatus.lastAttempt)}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={fetchDomainStatus}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: loading ? 0.6 : 1
              }}
            >
              🔄 Refresh Status
            </button>
            
            {domainStatus?.validationStatus === 'pending' && (
              <>
                <button 
                  onClick={retryValidation}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    background: '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  🔁 Verify Now
                </button>
                <button 
                  onClick={cancelValidation}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    background: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  ❌ Cancel Validation
                </button>
              </>
            )}

            {domainStatus?.validationStatus === 'failed' && (
              <button 
                onClick={retryValidation}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  background: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: loading ? 0.6 : 1
                }}
              >
                🔁 Retry Validation
              </button>
            )}
            
            <button 
              onClick={removeDomain}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: loading ? 0.6 : 1,
                marginLeft: 'auto'
              }}
            >
              🗑️ Delete Domain
            </button>
          </div>
        </div>
      ) : (
        /* Add Domain Section */
        <div>
          {!showAddDomain ? (
            <div>
              <div style={{ 
                background: '#f8f9fa', 
                border: '1px solid #dee2e6', 
                borderRadius: '2px', 
                padding: '15px',
                marginBottom: '15px'
              }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>🎯 Benefits of a Custom Domain:</h5>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#495057' }}>
                  <li>✨ <strong>Professional Branding:</strong> yourname.art instead of yourname.beemeeart.com</li>
                  <li>🔍 <strong>Better SEO:</strong> Your own domain ranks better in search results</li>
                  <li>💼 <strong>Business Credibility:</strong> Looks more professional to clients</li>
                  <li>🎨 <strong>Full Control:</strong> Your brand, your domain, your way</li>
                </ul>
              </div>
              
              <button
                onClick={() => setShowAddDomain(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                + Add Custom Domain
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '14px' }}>
                  Enter your custom domain:
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '');
                    setNewDomain(value);
                    
                    // Clear previous timeout
                    if (window.domainCheckTimeout) {
                      clearTimeout(window.domainCheckTimeout);
                    }
                    
                    // Debounce domain checking
                    if (value) {
                      window.domainCheckTimeout = setTimeout(() => {
                        checkDomainAvailability(value);
                      }, 500);
                    } else {
                      setDomainCheck({ checking: false, available: null, error: null });
                    }
                  }}
                  placeholder="e.g., yourname.art, mysite.com"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px'
                  }}
                />
                
                {domainCheck.checking && (
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                    Checking availability...
                  </div>
                )}
                {domainCheck.available === true && (
                  <div style={{ fontSize: '12px', color: '#28a745', marginTop: '5px' }}>
                    ✓ Domain is available for use!
                  </div>
                )}
                {domainCheck.available === false && (
                  <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '5px' }}>
                    ✗ {domainCheck.error}
                  </div>
                )}
                {newDomain && !domainCheck.checking && domainCheck.available === null && 
                 (!newDomain.includes('.') || !newDomain.match(/\.[a-z]{2,}$/i)) && (
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                    💡 Enter a complete domain (e.g., yourname.art, mysite.com)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowAddDomain(false);
                    setNewDomain('');
                    setDomainCheck({ checking: false, available: null, error: null });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={startDomainValidation}
                  disabled={!newDomain || domainCheck.available !== true || loading}
                  style={{
                    flex: 2,
                    padding: '8px 16px',
                    background: (!newDomain || domainCheck.available !== true || loading) ? '#ccc' : '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: (!newDomain || domainCheck.available !== true || loading) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'Adding...' : 'Add Domain'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
