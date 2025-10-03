import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Maintenance.module.css';

const MaintenancePage = ({ 
  maintenanceData = {
    title: "We'll Be Right Back!",
    message: "We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly.",
    estimatedTime: null,
    contactEmail: "support@beemeeart.com",
    showProgress: false,
    allowedUsers: []
  }
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (maintenanceData.showProgress) {
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 2;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 2000);

      return () => clearInterval(progressTimer);
    }
  }, [maintenanceData.showProgress]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEstimatedCompletion = () => {
    if (!maintenanceData.estimatedTime) return null;
    
    const estimated = new Date(maintenanceData.estimatedTime);
    const now = new Date();
    
    if (estimated <= now) return "Soon";
    
    const diff = estimated - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <>
      <Head>
        <title>Maintenance - Online Art Festival</title>
        <meta name="description" content="Online Art Festival is currently undergoing maintenance. We'll be back online shortly." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="refresh" content="30" />
      </Head>

      <div className={styles.container}>
        <div className={styles.backgroundPattern}>
          <div className={styles.artBrush}>🎨</div>
          <div className={styles.artPalette}>🎭</div>
          <div className={styles.artFrame}>🖼️</div>
        </div>

        <main className={styles.mainContent}>
          <div className={styles.logoSection}>
            <div className={styles.logo}>
              <span className={styles.logoText}>Online Art Festival</span>
            </div>
          </div>

          <div className={styles.messageSection}>
            <div className={styles.maintenanceIcon}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>

            <h1 className={styles.title}>{maintenanceData.title}</h1>
            
            <p className={styles.message}>
              {maintenanceData.message}
            </p>

            {maintenanceData.estimatedTime && (
              <div className={styles.estimatedTime}>
                <div className={styles.timeInfo}>
                  <span className={styles.timeLabel}>Estimated completion:</span>
                  <span className={styles.timeValue}>{getEstimatedCompletion()}</span>
                </div>
              </div>
            )}

            {maintenanceData.showProgress && (
              <div className={styles.progressSection}>
                <div className={styles.progressLabel}>Maintenance Progress</div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className={styles.progressText}>{Math.round(progress)}% Complete</div>
              </div>
            )}

            <div className={styles.statusInfo}>
              <div className={styles.statusItem}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                <span>Current time: {formatTime(currentTime)}</span>
              </div>
              
              <div className={styles.statusItem}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.21.45 4.55 1.24"/>
                </svg>
                <span>All data is safe and secure</span>
              </div>
            </div>

            <div className={styles.contactSection}>
              <p className={styles.contactText}>
                Need immediate assistance? Contact us at{' '}
                <a href={`mailto:${maintenanceData.contactEmail}`} className={styles.contactLink}>
                  {maintenanceData.contactEmail}
                </a>
              </p>
            </div>

            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="Follow us on Twitter">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                </svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="Follow us on Instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            </div>

            <button 
              className={styles.refreshButton}
              onClick={() => window.location.reload()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23,4 23,10 17,10"/>
                <polyline points="1,20 1,14 7,14"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Refresh Page
            </button>
          </div>
        </main>

        <footer className={styles.footer}>
          <p>&copy; 2024 Online Art Festival. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};

// This page can be statically generated or use getServerSideProps for dynamic data
export async function getServerSideProps(context) {
  // You can fetch maintenance configuration from your database or environment
  // For now, we'll use default values
  
  try {
    // Example: Fetch from API or database
    // const maintenanceConfig = await fetch('your-api/maintenance-config');
    
    return {
      props: {
        maintenanceData: {
          title: "We'll Be Right Back!",
          message: "We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly.",
          estimatedTime: null, // Set to ISO string for countdown
          contactEmail: "support@beemeeart.com",
          showProgress: false,
          allowedUsers: [] // Admin user IDs who can bypass maintenance
        }
      }
    };
  } catch (error) {
    return {
      props: {
        maintenanceData: {
          title: "We'll Be Right Back!",
          message: "We're currently performing scheduled maintenance to improve your experience.",
          estimatedTime: null,
          contactEmail: "support@beemeeart.com",
          showProgress: false,
          allowedUsers: []
        }
      }
    };
  }
}

export default MaintenancePage;
