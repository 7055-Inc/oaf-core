import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest, clearAuthTokens } from '../lib/csrf';
import styles from '../styles/TermsAcceptance.module.css';

export default function TermsAcceptance() {
  const [termsData, setTermsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const router = useRouter();
  const { redirect } = router.query;
  const termsContentRef = useRef(null);

  useEffect(() => {
    const fetchCurrentTerms = async () => {
      try {
        const response = await fetch('https://api2.onlineartfestival.com/api/terms/current');
        if (!response.ok) {
          throw new Error('Failed to fetch current terms');
        }
        const data = await response.json();
        setTermsData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentTerms();
  }, []);

  // Simplified scroll detection
  useEffect(() => {
    if (termsData && !hasScrolled && termsContentRef.current) {
      const checkScrollNeeded = () => {
        const termsContent = termsContentRef.current;
        if (termsContent) {
          const { scrollHeight, clientHeight } = termsContent;
          // If content doesn't need scrolling, auto-enable the button
          if (scrollHeight <= clientHeight + 5) {
            setHasScrolled(true);
          }
        }
      };
      
      // Single check after a short delay
      const checkTimeout = setTimeout(checkScrollNeeded, 1000);
      
      // Fallback: Always enable button after 3 seconds to prevent permanent blocking
      const fallbackTimeout = setTimeout(() => {
        setHasScrolled(true);
      }, 3000);
      
      return () => {
        clearTimeout(checkTimeout);
        clearTimeout(fallbackTimeout);
      };
    }
  }, [termsData, hasScrolled]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Enable accept button when user scrolls to within 20px of bottom
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolled(true);
    }
  };

  const handleAccept = async () => {
    if (!termsData || !hasScrolled) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/terms/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          termsVersionId: termsData.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept terms');
      }

      // Simple redirect without complex verification
      const redirectUrl = redirect || '/dashboard';
      window.location.href = redirectUrl;
      
    } catch (err) {
      setError(err.message || 'Failed to accept terms. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    
    try {
      // Clear authentication tokens
      clearAuthTokens();
      
      // Force a full page redirect
      window.location.href = '/login?message=Terms+declined+-+please+log+in+again';
      
    } catch (err) {
      console.error('Error during decline:', err);
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Terms and Conditions - Online Art Festival</title>
        </Head>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading terms and conditions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Terms and Conditions - Online Art Festival</title>
        </Head>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!termsData) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Terms and Conditions - Online Art Festival</title>
        </Head>
        <div className={styles.error}>
          <h2>No Terms Available</h2>
          <p>No current terms and conditions were found.</p>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Accept Terms and Conditions - Online Art Festival</title>
      </Head>
      
      <div className={styles.modal}>
        <div className={styles.termsContainer}>
          <div className={styles.termsHeader}>
            <h2>{termsData.title}</h2>
            <p className={styles.subtitle}>
              Please read and accept our updated terms and conditions to continue using Online Art Festival.
            </p>
          </div>

          <div 
            ref={termsContentRef}
            className={styles.termsContent}
            onScroll={handleScroll}
          >
            <div dangerouslySetInnerHTML={{ __html: termsData.content }} />
          </div>

          {!hasScrolled && (
            <div className={styles.scrollPrompt}>
              <p>Please scroll to the bottom to read all terms and conditions</p>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button 
            onClick={handleDecline}
            className={styles.declineButton}
            disabled={accepting || declining}
          >
            {declining ? (
              <>
                <span className={styles.spinner}></span>
                Declining...
              </>
            ) : (
              'Decline'
            )}
          </button>
          <button 
            onClick={handleAccept}
            className={`${styles.acceptButton} ${!hasScrolled ? styles.disabled : ''}`}
            disabled={!hasScrolled || accepting || declining}
          >
            {accepting ? (
              <>
                <span className={styles.spinner}></span>
                Accepting...
              </>
            ) : (
              'Accept and Continue'
            )}
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 