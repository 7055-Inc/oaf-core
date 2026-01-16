'use client';
import Link from 'next/link';
import styles from './DashboardHeader.module.css';
import { clearAuthTokens } from '../../lib/csrf';

export default function DashboardHeader() {
  const handleLogout = () => {
    clearAuthTokens();
    window.location.href = '/logout';
  };

  return (
    <header className={styles.dashboardHeader}>
      <div className={styles.headerContainer}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logoLink}>
            <img
              src="/static_media/brakebee-logo.png"
              alt="Brakebee Logo"
              className={styles.logoImage}
              onError={(e) => {
                // Fallback to existing logo if new one doesn't exist
                e.target.src = '/static_media/logo.png';
              }}
            />
          </Link>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionSection}>
          <Link href="/" className={styles.homeButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            Home
          </Link>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
