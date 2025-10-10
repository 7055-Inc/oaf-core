'use client';
import Link from 'next/link';
import styles from './DashboardHeader.module.css';

export default function DashboardHeader() {
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

        {/* Home Button */}
        <div className={styles.actionSection}>
          <Link href="/" className={styles.homeButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            Home
          </Link>
        </div>
      </div>
    </header>
  );
}
