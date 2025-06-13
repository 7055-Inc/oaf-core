'use client';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import LoginModal from '../components/LoginModal';

export default function Login() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div>
      <Header />
      <div style={{ padding: '2rem' }}>
        {isLoggedIn ? (
          <div>
            <h1>Welcome Back!</h1>
            <p>You are logged in. Visit your <a href="/dashboard">dashboard</a> to continue.</p>
          </div>
        ) : (
          <div>
            <h1>Welcome to Online Art Festival</h1>
            <p>Login to access your dashboard.</p>
            <LoginModal />
          </div>
        )}
      </div>
    </div>
  );
} 