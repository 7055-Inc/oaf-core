'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

/**
 * Simple cookie consent banner that slides up from the bottom
 * Two options: Accept All or Required Only
 * Stores preference in localStorage for conditional script loading
 */
export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const cookieChoice = localStorage.getItem('cookieConsent_v2');
    if (!cookieChoice) {
      // Small delay before showing for smoother page load
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent_v2', 'all');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    closeBanner();
    
    // Dispatch event so tracking scripts can initialize
    window.dispatchEvent(new CustomEvent('cookieConsent', { detail: { level: 'all' } }));
  };

  const handleRequiredOnly = () => {
    localStorage.setItem('cookieConsent_v2', 'required');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    closeBanner();
    
    // Dispatch event (trackers won't load with 'required')
    window.dispatchEvent(new CustomEvent('cookieConsent', { detail: { level: 'required' } }));
  };

  const closeBanner = () => {
    setIsAnimating(false);
    // Wait for slide-out animation before hiding
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`${styles.banner} ${isAnimating ? styles.visible : ''}`}>
      <div className={styles.content}>
        <p className={styles.text}>
          We use cookies to improve your experience. 
          <Link href="/policies/cookies" className={styles.link}>Learn more</Link>
        </p>
        <div className={styles.buttons}>
          <button 
            onClick={handleRequiredOnly}
            className={styles.secondaryBtn}
          >
            Required Only
          </button>
          <button 
            onClick={handleAcceptAll}
            className={styles.primaryBtn}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to check if user accepted all cookies
 * Use this before loading tracking scripts
 */
export function hasFullCookieConsent() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cookieConsent_v2') === 'all';
}

/**
 * Helper function to check if user has made any cookie choice
 */
export function hasCookieConsent() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cookieConsent_v2') !== null;
}
