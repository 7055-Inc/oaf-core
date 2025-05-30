'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Add this import
import Header from '../components/Header';

export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    } else {
      setIsLoggedIn(true);
      // Fetch user data to check roles
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
          console.log('Dashboard - Current User Data:', data);
          setUserData(data);
        })
        .catch(err => {
          console.error('Error fetching user data:', err.message);
          setError(err.message);
        });
    }
  }, [router]);

  if (!isLoggedIn) {
    return null;
  }

  if (error) {
    return (
      <div>
        <Header />
        <div style={{ padding: '2rem' }}>
          <h1>Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div>
        <Header />
        <div style={{ padding: '2rem' }}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  const isAdmin = userData.user_type === 'admin';
  console.log('Dashboard - isAdmin:', isAdmin);

  return (
    <div>
      <Header />
      <div style={{ padding: '2rem' }}>
        <h1>Dashboard</h1>
        <p>Welcome to your dashboard! Here you can manage your profile and API keys.</p>
        <a href="/api-keys">Generate API Keys</a>
        {isAdmin && (
          <div>
            <h2>User Management</h2>
            <p><Link href="/dashboard/admin">Edit Users</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}