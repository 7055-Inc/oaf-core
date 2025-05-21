'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

export default function ProfileSetup() {
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userType, setUserType] = useState('community');
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch('https://api2.onlineartfestival.com/users/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await res.json();
        setUser(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setUserType(data.user_type || 'community');
      } catch (err) {
        console.error(err.message);
        setError(err.message);
      }
    };

    fetchUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('https://api2.onlineartfestival.com/users/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          user_type: userType
        })
      });
      if (!res.ok) {
        throw new Error('Failed to update profile');
      }
      router.push('/dashboard');
    } catch (err) {
      console.error(err.message);
      setError(err.message);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Header />
      <div style={{ padding: '2rem' }}>
        <h1>Complete Your Profile</h1>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Email:</label>
            <input
              type="email"
              value={user.username}
              disabled
              style={{ marginLeft: '0.5rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>First Name:</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{ marginLeft: '0.5rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Last Name:</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{ marginLeft: '0.5rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>User Type:</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            >
              <option value="artist">Artist</option>
              <option value="community">Community</option>
              <option value="promoter">Promoter</option>
            </select>
          </div>
          <button type="submit">Save Profile</button>
        </form>
      </div>
    </div>
  );
}