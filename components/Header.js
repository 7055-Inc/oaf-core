'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      // Fetch userId from /users/me
      fetch('https://api2.onlineartfestival.com/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user profile');
          }
          return res.json();
        })
        .then(data => {
          setUserId(data.id);
          localStorage.setItem('userId', data.id); // Store userId for future use
        })
        .catch(err => {
          console.error('Error fetching user ID:', err.message);
          setIsLoggedIn(false);
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
        });
    } else {
      setIsLoggedIn(false);
      setUserId(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setUserId(null);
    window.location.href = '/';
  };

  return (
    <header style={{
      backgroundColor: '#FFFFFF',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src="/static_media/logo.png"
          alt="Online Art Festival Logo"
          style={{ width: '120px', height: 'auto' }}
        />
      </div>
      <nav>
        <Link href="/" style={{ marginRight: '1rem', color: '#055474', textDecoration: 'none' }}>
          Home
        </Link>
        {isLoggedIn && userId ? (
          <>
            <Link href="/profile/[id]" as={`/profile/${userId}`} style={{ marginRight: '1rem', color: '#055474', textDecoration: 'none' }}>
              Profile
            </Link>
            <button onClick={handleLogout} style={{ color: '#055474', background: 'none', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </>
        ) : (
          <Link href="#" onClick={() => document.getElementById('loginModal').style.display = 'block'} style={{ color: '#055474', textDecoration: 'none' }}>
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}