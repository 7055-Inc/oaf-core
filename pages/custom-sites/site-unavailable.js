import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/SiteUnavailable.module.css';

const SiteUnavailable = () => {
  const router = useRouter();
  const { 
    subdomain, 
    status = 'inactive', 
    siteName = 'Artist Site',
    reason = 'This site is currently unavailable.'
  } = router.query;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'draft':
        return {
          title: 'Site Coming Soon',
          message: 'This artist site is currently being set up and will be available soon.',
          icon: '🚧',
          color: '#f59e0b',
          showContact: true
        };
      case 'inactive':
        return {
          title: 'Site Temporarily Unavailable',
          message: 'This artist site is temporarily unavailable. Please check back later.',
          icon: '⏸️',
          color: '#6b7280',
          showContact: true
        };
      case 'suspended':
        return {
          title: 'Site Suspended',
          message: 'This site has been temporarily suspended.',
          icon: '🚫',
          color: '#dc2626',
          showContact: false
        };
      case 'suspended_violation':
        return {
          title: 'Site Suspended',
          message: 'This site has been suspended due to policy violations.',
          icon: '⚠️',
          color: '#dc2626',
          showContact: false
        };
      case 'suspended_finance':
        return {
          title: 'Site Suspended',
          message: 'This site has been suspended due to payment issues.',
          icon: '💳',
          color: '#dc2626',
          showContact: false
        };
      case 'deleted':
        return {
          title: 'Site Not Found',
          message: 'This site no longer exists or has been removed.',
          icon: '❌',
          color: '#dc2626',
          showContact: false
        };
      default:
        return {
          title: 'Site Unavailable',
          message: 'This site is currently unavailable.',
          icon: '🔒',
          color: '#6b7280',
          showContact: true
        };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <>
      <Head>
        <title>{statusInfo.title} - {siteName}</title>
        <meta name="description" content={statusInfo.message} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className={styles.container}>
        <div className={styles.backgroundPattern}>
          <div className={styles.artElement1}>🎨</div>
          <div className={styles.artElement2}>🖼️</div>
          <div className={styles.artElement3}>✨</div>
        </div>

        <main className={styles.mainContent}>
          <div className={styles.statusCard}>
            <div 
              className={styles.statusIcon}
              style={{ color: statusInfo.color }}
            >
              {statusInfo.icon}
            </div>
            
            <h1 className={styles.title}>{statusInfo.title}</h1>
            
            <div className={styles.siteInfo}>
              <h2 className={styles.siteName}>{siteName}</h2>
              {subdomain && (
                <p className={styles.subdomain}>
                  {subdomain}.beemeeart.com
                </p>
              )}
            </div>
            
            <p className={styles.message}>
              {reason || statusInfo.message}
            </p>

            {status === 'draft' && (
              <div className={styles.draftInfo}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '65%' }}></div>
                </div>
                <p className={styles.progressText}>Site setup in progress...</p>
              </div>
            )}

            <div className={styles.actionButtons}>
              <Link href="/" className={styles.button}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                Visit Main Site
              </Link>
              
              <button 
                onClick={() => window.history.back()}
                className={`${styles.button} ${styles.secondaryButton}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Go Back
              </button>
            </div>

            {statusInfo.showContact && (
              <div className={styles.contactSection}>
                <p className={styles.contactText}>
                  Need help? Contact us at{' '}
                  <a href="mailto:support@beemeeart.com" className={styles.contactLink}>
                    support@beemeeart.com
                  </a>
                </p>
              </div>
            )}

            {status === 'draft' && (
              <div className={styles.ownerInfo}>
                <p className={styles.ownerText}>
                  <strong>Site Owner:</strong> You can continue setting up your site in the{' '}
                  <Link href="/dashboard" className={styles.dashboardLink}>
                    dashboard
                  </Link>
                </p>
              </div>
            )}
          </div>

          <div className={styles.suggestedActions}>
            <h3 className={styles.suggestionsTitle}>Explore Other Artists</h3>
            <div className={styles.suggestions}>
              <Link href="/category/1" className={styles.suggestionCard}>
                <div className={styles.suggestionIcon}>🎨</div>
                <div className={styles.suggestionContent}>
                  <h4>Browse Paintings</h4>
                  <p>Discover amazing artwork from our featured artists</p>
                </div>
              </Link>
              
              <Link href="/events" className={styles.suggestionCard}>
                <div className={styles.suggestionIcon}>📅</div>
                <div className={styles.suggestionContent}>
                  <h4>Art Events</h4>
                  <p>Find upcoming art festivals and exhibitions</p>
                </div>
              </Link>
              
              <Link href="/articles" className={styles.suggestionCard}>
                <div className={styles.suggestionIcon}>📖</div>
                <div className={styles.suggestionContent}>
                  <h4>Art Articles</h4>
                  <p>Read inspiring stories and art techniques</p>
                </div>
              </Link>
            </div>
          </div>
        </main>

        <footer className={styles.footer}>
          <p>&copy; 2024 Online Art Festival. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};

export default SiteUnavailable;
