import { useState } from 'react';
import { getAuthToken } from '../../../../../lib/csrf';

export default function GenerateAPIKey({ userData, onKeyGenerated }) {
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for your API key');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to generate API keys');
      }

      const response = await fetch('https://api2.onlineartfestival.com/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newKeyName.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to generate API key');
      }

      const data = await response.json();
      
      if (data.public_key && data.private_key) {
        setGeneratedKey(data);
        setNewKeyName('');
        onKeyGenerated(); // Notify parent to refresh the view tab
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${type} copied to clipboard!`);
    }).catch(() => {
      alert('Failed to copy to clipboard. Please copy manually.');
    });
  };

  const handleStartOver = () => {
    setGeneratedKey(null);
    setNewKeyName('');
    setError(null);
  };

  return (
    <div>
      {!generatedKey ? (
        // Generation Form
        <div>
          <div className="form-card">
            <h3 style={{ margin: '0 0 20px 0' }}>Generate New API Key</h3>
            
            <div className="form-group">
              <label>API Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="form-input"
                placeholder="e.g., Mobile App, Website Integration, Analytics Tool"
                maxLength={100}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Choose a descriptive name to help you identify this key later
              </small>
            </div>

            {error && (
              <div className="error-alert" style={{ marginBottom: '20px' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateKey}
              disabled={isGenerating || !newKeyName.trim()}
              className="primary"
              style={{ width: '100%', padding: '12px' }}
            >
              {isGenerating ? 'Generating...' : 'Generate API Key'}
            </button>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>Important Security Notes</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#856404' }}>
              <li><strong>Private Key Security:</strong> Your private key will only be shown once. Store it securely.</li>
              <li><strong>Public Key Usage:</strong> Use your public key for API identification.</li>
              <li><strong>Never Share:</strong> Don't expose your private key in client-side code or public repositories.</li>
              <li><strong>Immediate Storage:</strong> Copy and save your keys immediately after generation.</li>
            </ul>
          </div>
        </div>
      ) : (
        // Generated Key Display
        <div>
          <div className="success-alert" style={{ marginBottom: '20px' }}>
            <strong>API Key Generated Successfully!</strong> Please copy and store these keys securely. The private key will not be shown again.
          </div>

          <div className="form-card">
            <h3 style={{ margin: '0 0 20px 0' }}>Your New API Key</h3>
            
            <div className="form-group">
              <label>Key Name</label>
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {generatedKey.name}
              </div>
            </div>

            <div className="form-group">
              <label>Public Key</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <code style={{ 
                  flex: 1,
                  padding: '10px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {generatedKey.public_key}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedKey.public_key, 'Public key')}
                  className="secondary"
                  style={{ fontSize: '12px', padding: '8px 12px', whiteSpace: 'nowrap' }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: '#dc3545' }}>Private Key (Store Securely - Will Not Be Shown Again)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <code style={{ 
                  flex: 1,
                  padding: '10px', 
                  backgroundColor: '#fff5f5', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  border: '1px solid #fecaca'
                }}>
                  {generatedKey.private_key}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedKey.private_key, 'Private key')}
                  className="danger"
                  style={{ fontSize: '12px', padding: '8px 12px', whiteSpace: 'nowrap' }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleStartOver}
                className="primary"
                style={{ flex: 1 }}
              >
                Generate Another Key
              </button>
              <button
                onClick={() => onKeyGenerated()}
                className="secondary"
                style={{ flex: 1 }}
              >
                View All Keys
              </button>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8d7da', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#721c24' }}>⚠️ Critical Security Warning</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#721c24' }}>
              <strong>This is the only time your private key will be displayed.</strong> Make sure to copy and store it in a secure location immediately. 
              If you lose this private key, you will need to generate a new API key pair.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
