'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import LoginModal from '../components/login/LoginModal';
import CookieConsentModal from '../components/CookieConsentModal';

export default function Login() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [canShowLoginForm, setCanShowLoginForm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    // Check if user has already consented
    if (!token) {
      const hasConsented = localStorage.getItem('cookieConsent');
      if (hasConsented === 'true') {
        setCanShowLoginForm(true);
      } else {
        setShowConsentModal(true);
      }
    }
  }, []);

  return (
    <>
      <Head>
        <title>Login | Brakebee</title>
        <meta name="description" content="Sign in to your Brakebee account to access your dashboard, manage your art collection, and connect with artists." />
      </Head>
      
      {/* Cookie Consent Modal - blocks everything until consent */}
      {showConsentModal && (
        <CookieConsentModal 
          onAccept={() => {
            setShowConsentModal(false);
            setCanShowLoginForm(true);
          }}
          onDecline={() => {
            // Keep modal open, don't allow login
          }}
        />
      )}
      
      <div style={{ padding: '2rem' }}>
        {isLoggedIn ? (
          <div>
            <h1>Welcome Back!</h1>
            <p>You are logged in. Visit your <a href="/dashboard">dashboard</a> to continue.</p>
          </div>
        ) : canShowLoginForm ? (
          <div>
            <LoginModal />
          </div>
        ) : !showConsentModal ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h2>Cookie Consent Required</h2>
            <p>Please accept cookies to access the login form.</p>
          </div>
        ) : null}
      </div>
    </>
  );
} 