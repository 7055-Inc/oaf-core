'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';

export default function ApiKeys() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    } else {
      setIsLoggedIn(true);
      fetchApiKeys(token);
    }
  }, [router]);

  const fetchApiKeys = async (token) => {
    try {
      const res = await fetch('https://api2.onlineartfestival.com/api-keys', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      setApiKeys(data);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    }
  };

  const handleGenerateKey = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://api2.onlineartfestival.com/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newKeyName || 'Default API Key' })
      });
      const data = await res.json();
      if (data.public_key && data.private_key) {
        setGeneratedKey(data);
        fetchApiKeys(token); // Refresh the list
      } else {
        throw new Error('Failed to generate API key');
      }
    } catch (err) {
      console.error('Failed to generate API key:', err);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div>
      <Header />
      <div style={{ padding: '2rem' }}>
        <h1>API Keys</h1>
        <div>
          <h2>Generate New API Key</h2>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="API Key Name"
          />
          <button onClick={handleGenerateKey}>Generate Key</button>
          {generatedKey && (
            <div>
              <p>New API Key Generated:</p>
              <p>Public Key: {generatedKey.public_key}</p>
              <p>Private Key: {generatedKey.private_key}</p>
              <p>Name: {generatedKey.name}</p>
            </div>
          )}
        </div>
        <div>
          <h2>Your API Keys</h2>
          {apiKeys.length > 0 ? (
            <ul>
              {apiKeys.map((key) => (
                <li key={key.public_key}>
                  {key.name} - {key.public_key} (Created: {new Date(key.created_at).toLocaleString()}) - {key.is_active ? 'Active' : 'Inactive'}
                </li>
              ))}
            </ul>
          ) : (
            <p>No API keys found.</p>
          )}
        </div>
      </div>
    </div>
  );
}