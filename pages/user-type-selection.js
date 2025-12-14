import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest } from '../lib/csrf';
import { authApiRequest } from '../lib/apiUtils';
import styles from '../styles/UserTypeSelection.module.css';

export default function UserTypeSelection() {
  const [selectedType, setSelectedType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedType) {
      setError('Please select a user type');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await authApiRequest('users/select-user-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_type: selectedType })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user type');
      }

      // Check for redirect parameter, otherwise go to dashboard
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Choose Your Role - Brakebee</title>
      </Head>
      
      <div className={styles.modal}>
        <div className={styles.header}>
          <h1>Welcome to Brakebee!</h1>
          <p className={styles.subtitle}>
            Please select your role to get started with your personalized experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.optionsContainer}>
            <div 
              className={`${styles.option} ${selectedType === 'artist' ? styles.selected : ''}`}
              onClick={() => setSelectedType('artist')}
            >
              <div className={styles.optionIcon}>
                <i className="fa-solid fa-palette"></i>
              </div>
              <h3>Artist</h3>
              <p>Create, showcase, and sell your artwork</p>
            </div>

            <div 
              className={`${styles.option} ${selectedType === 'promoter' ? styles.selected : ''}`}
              onClick={() => setSelectedType('promoter')}
            >
              <div className={styles.optionIcon}>
                <i className="fa-solid fa-bullhorn"></i>
              </div>
              <h3>Promoter</h3>
              <p>Organize events and connect artists</p>
            </div>

            <div 
              className={`${styles.option} ${selectedType === 'community' ? styles.selected : ''}`}
              onClick={() => setSelectedType('community')}
            >
              <div className={styles.optionIcon}>
                <i className="fa-solid fa-heart"></i>
              </div>
              <h3>Art Lover</h3>
              <p>Discover and collect amazing art</p>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={!selectedType || submitting}
            >
              {submitting ? 'Setting up your account...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 