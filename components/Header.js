'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState([]);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Header: Token from localStorage:', token);
    if (token) {
      setIsLoggedIn(true);
      // Fetch user roles
      fetch('https://api2.onlineartfestival.com/auth/exchange', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider: 'validate', token })
      })
        .then(res => {
          console.log('Header: /auth/exchange response status:', res.status);
          if (!res.ok) {
            throw new Error(`Request failed with status ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('Header: /auth/exchange response data:', data);
          setRoles(data.roles || []);
          if (data.roles && data.roles.includes('admin')) {
            console.log('Header: User is admin');
            setIsAdmin(true);
          } else {
            console.log('Header: User is not admin, roles:', data.roles);
          }
          // Check profile status
          fetchUserProfile(token);
        })
        .catch(err => {
          console.error('Header: Error checking admin status:', err.message);
          setIsAdmin(false);
        });
    } else {
      console.log('Header: No token found in localStorage');
      setIsLoggedIn(false);
    }
  }, [router]);

  const fetchUserProfile = async (token) => {
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
      const profileIncomplete = !data.first_name || !data.last_name || data.email_verified !== 'yes';
      setNeedsProfileSetup(profileIncomplete);
      if (profileIncomplete && router.pathname !== '/profile/setup') {
        router.push('/profile/setup');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setIsAdmin(false);
    setRoles([]);
    setNeedsProfileSetup(false);
    router.push('/');
  };

  return (
    <nav style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Online Art Festival</h1>
        <div>
          {isLoggedIn ? (
            <>
              <a href="/dashboard" style={{ marginRight: '1rem' }}>Dashboard</a>
              <a href="/api-keys" style={{ marginRight: '1rem' }}>API Keys</a>
              {isAdmin && (
                <a href="/dashboard/admin" style={{ marginRight: '1rem' }}>Admin</a>
              )}
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <a href="/">Login</a>
          )}
        </div>
      </div>
    </nav>
  );
}