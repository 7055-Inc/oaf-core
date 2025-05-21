'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';

export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div>
      <Header />
      <div style={{ padding: '2rem' }}>
        <h1>Dashboard</h1>
        <p>Welcome to your dashboard! Here you can manage your profile and API keys.</p>
        <a href="/api-keys">Generate API Keys</a>
      </div>
    </div>
  );
}