'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { LoginModal } from '../modules/auth';

function getSafeRedirect() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const target = params.get('redirect') || params.get('returnTo');
  if (!target) return null;
  if (target.startsWith('/')) return target;
  try {
    const u = new URL(target);
    if (u.hostname === 'brakebee.com' || u.hostname.endsWith('.brakebee.com')) return target;
  } catch { /* invalid URL */ }
  return null;
}

export default function Login() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const redirect = getSafeRedirect();
      if (redirect) {
        window.location.href = redirect;
        return;
      }
    }
    setIsLoggedIn(!!token);
  }, []);

  return (
    <>
      <Head>
        <title>Login | Brakebee</title>
        <meta name="description" content="Sign in to your Brakebee account to access your dashboard, manage your art collection, and connect with artists." />
        <meta name="robots" content="noindex, nofollow" />
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
