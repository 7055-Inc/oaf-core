import { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Terms.module.css';

export default function TermsOfService() {
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCurrentTerms();
  }, []);

  const fetchCurrentTerms = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api2.onlineartfestival.com/api/terms/current', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load terms: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTerms(data);
    } catch (err) {
      console.error('Error fetching terms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Terms of Service - Online Art Festival</title>
          <meta name="description" content="Terms of Service for Online Art Festival" />
        </Head>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading terms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Terms of Service - Online Art Festival</title>
          <meta name="description" content="Terms of Service for Online Art Festival" />
        </Head>
        <div className={styles.errorContainer}>
          <h1>Error Loading Terms</h1>
          <p>{error}</p>
          <button onClick={fetchCurrentTerms} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!terms) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Terms of Service - Online Art Festival</title>
          <meta name="description" content="Terms of Service for Online Art Festival" />
        </Head>
        <div className={styles.errorContainer}>
          <h1>No Terms Available</h1>
          <p>No terms of service are currently available. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{terms.title} - Online Art Festival</title>
        <meta name="description" content={`${terms.title} for Online Art Festival`} />
      </Head>
      
      <div className={styles.termsContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>{terms.title}</h1>
          <div className={styles.metadata}>
            <span className={styles.version}>Version {terms.version}</span>
            <span className={styles.date}>
              Effective Date: {new Date(terms.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>

        <div className={styles.content}>
          <div 
            className={styles.termsContent}
            dangerouslySetInnerHTML={{ __html: terms.content }}
          />
        </div>

        <div className={styles.footer}>
          <p className={styles.lastUpdated}>
            Last updated: {new Date(terms.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className={styles.contact}>
            If you have any questions about these terms, please contact us at{' '}
            <a href="mailto:support@onlineartfestival.com" className={styles.contactLink}>
              support@onlineartfestival.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 