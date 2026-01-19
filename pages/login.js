'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { LoginModal } from '../modules/auth';

export default function Login() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <>
      <Head>
        <title>Login | Brakebee</title>
        <meta name="description" content="Sign in to your Brakebee account to access your dashboard, manage your art collection, and connect with artists." />
      </Head>
      
      <div style={{ padding: '2rem', paddingTop: '6rem' }}>
        {isLoggedIn ? (
          <div>
            <h1>Welcome Back!</h1>
            <p>You are logged in. Visit your <a href="/dashboard">dashboard</a> to continue.</p>
          </div>
        ) : (
          <div>
            <LoginModal />
          </div>
        )}
      </div>
    </>
  );
}
