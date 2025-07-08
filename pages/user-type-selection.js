import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest } from '../lib/csrf';
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/users/select-user-type', {
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

      // Redirect to dashboard after successful selection
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Choose Your Role - Online Art Festival</title>
      </Head>
      
      <div className={styles.modal}>
        <div className={styles.header}>
          <h1>Welcome to Online Art Festival!</h1>
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
              <div className={styles.optionIcon}>🎨</div>
              <h3>Artist</h3>
              <p>Create and sell your artwork, build your artist profile, and connect with art enthusiasts.</p>
              <ul>
                <li>Upload and showcase your artwork</li>
                <li>Set up your artist storefront</li>
                <li>Accept commissions and custom orders</li>
                <li>Manage your art business</li>
              </ul>
            </div>

            <div 
              className={`${styles.option} ${selectedType === 'promoter' ? styles.selected : ''}`}
              onClick={() => setSelectedType('promoter')}
            >
              <div className={styles.optionIcon}>📢</div>
              <h3>Promoter</h3>
              <p>Organize art events, galleries, and exhibitions to promote artists and their work.</p>
              <ul>
                <li>Create and manage art events</li>
                <li>Organize exhibitions and galleries</li>
                <li>Connect artists with opportunities</li>
                <li>Build your promoter network</li>
              </ul>
            </div>

            <div 
              className={`${styles.option} ${selectedType === 'community' ? styles.selected : ''}`}
              onClick={() => setSelectedType('community')}
            >
              <div className={styles.optionIcon}>❤️</div>
              <h3>Art Enthusiast</h3>
              <p>Discover, collect, and support amazing artists and their artwork.</p>
              <ul>
                <li>Browse and purchase artwork</li>
                <li>Follow your favorite artists</li>
                <li>Attend art events and exhibitions</li>
                <li>Build your art collection</li>
              </ul>
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