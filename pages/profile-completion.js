import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest } from '../lib/csrf';
import { authApiRequest } from '../lib/apiUtils';
import styles from '../styles/ProfileCompletion.module.css';

export default function ProfileCompletion() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { redirect } = router.query;

  useEffect(() => {
    const fetchProfileStatus = async () => {
      try {
        const response = await authApiRequest('users/profile-completion-status');
        if (!response.ok) {
          throw new Error('Failed to fetch profile status');
        }
        const data = await response.json();
        setProfileData(data);
        
        // Initialize form data with empty values for missing fields
        const initialFormData = {};
        data.missingFields?.forEach(field => {
          initialFormData[field.field] = '';
        });
        setFormData(initialFormData);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileStatus();
  }, []);

  const handleGoToProfile = () => {
    router.push('/profile/edit');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitInlineForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await authApiRequest('users/complete-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete profile');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteLogin = () => {
    let redirectUrl = '/dashboard';

    // Next.js can provide query params as string or array
    const rawRedirect = Array.isArray(redirect) ? redirect[0] : redirect;

    if (rawRedirect && typeof rawRedirect === 'string') {
      let decoded = rawRedirect;
      try {
        // Handle encoded values like %2Fprofile%2F123
        decoded = decodeURIComponent(decoded);
      } catch (_) {
        // Keep original if decoding fails
      }

      // Ensure it starts with a single leading slash and is a relative path
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        // For safety, disallow absolute URLs and fallback
        redirectUrl = '/dashboard';
      } else {
        // Normalize to "/..." only
        decoded = decoded.trim();
        if (!decoded.startsWith('/')) decoded = `/${decoded}`;
        redirectUrl = decoded;
      }
    }

    // Prevent loops back to this page
    if (redirectUrl.startsWith('/profile-completion')) {
      redirectUrl = '/dashboard';
    }

    // Use replace to avoid back-button loops
    router.replace(redirectUrl);
  };

  // Auto-redirect when profile is complete (must be above early returns)
  useEffect(() => {
    const complete = !!profileData && (profileData.requiresCompletion === false || profileData.isComplete === true);
    if (complete) {
      const timer = setTimeout(() => {
        let redirectUrl = '/dashboard';

        // Next.js can provide query params as string or array
        const rawRedirect = Array.isArray(redirect) ? redirect[0] : redirect;

        if (rawRedirect && typeof rawRedirect === 'string') {
          let decoded = rawRedirect;
          try {
            // Handle encoded values like %2Fprofile%2F123
            decoded = decodeURIComponent(decoded);
          } catch (_) {
            // Keep original if decoding fails
          }

          // Ensure it starts with a single leading slash and is a relative path
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            // For safety, disallow absolute URLs and fallback
            redirectUrl = '/dashboard';
          } else {
            // Normalize to "/..." only
            decoded = decoded.trim();
            if (!decoded.startsWith('/')) decoded = `/${decoded}`;
            redirectUrl = decoded;
          }
        }

        // Prevent loops back to this page
        if (redirectUrl.startsWith('/profile-completion')) {
          redirectUrl = '/dashboard';
        }

        // Use replace to avoid back-button loops
        router.replace(redirectUrl);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [profileData?.requiresCompletion, profileData?.isComplete, redirect, router]);

  const verifyAndCompleteLogin = async () => {
    // Verify profile completion before redirecting
    let verificationAttempts = 0;
    let profileComplete = false;
    
    while (verificationAttempts < 3 && !profileComplete) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const checkResponse = await authApiRequest('users/profile-completion-status');
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (!checkData.requiresCompletion) {
            profileComplete = true;
            break;
          }
        }
      } catch (checkErr) {
        // If API calls are failing, just proceed with redirect to avoid infinite loops
        profileComplete = true;
        break;
      }
      
      verificationAttempts++;
    }

    handleCompleteLogin();
  };

  const getFieldType = (fieldName) => {
    switch (fieldName) {
      case 'phone':
        return 'tel';
      case 'postal_code':
        return 'text';
      default:
        return 'text';
    }
  };

  const getFieldPlaceholder = (fieldName) => {
    switch (fieldName) {
      case 'first_name':
        return 'Enter your first name';
      case 'last_name':
        return 'Enter your last name';
      case 'address_line1':
        return 'Enter your street address';
      case 'city':
        return 'Enter your city';
      case 'state':
        return 'Enter your state/province';
      case 'postal_code':
        return 'Enter your postal/zip code';
      case 'phone':
        return 'Enter your phone number';
      case 'business_name':
        return 'Enter your business name';
      default:
        return '';
    }
  };

  // Fields that should span full width in the grid
  const isFullWidthField = (fieldName) => {
    return ['address_line1', 'business_name'].includes(fieldName);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Complete Your Profile - Brakebee</title>
        </Head>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Checking your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profileData) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Profile Completion - Brakebee</title>
        </Head>
        <div className={`section-box ${styles.modal}`}>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h1>Something Went Wrong</h1>
            <p className={styles.subtitle}>{error}</p>
          </div>
          <div className={styles.actions}>
            <button onClick={() => router.push('/')} className={styles.secondaryButton}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!!profileData && (profileData.requiresCompletion === false || profileData.isComplete === true)) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Profile Complete - Brakebee</title>
        </Head>
        <div className={`section-box ${styles.modal}`}>
          <div className={styles.header}>
            <div className={styles.headerIcon + ' ' + styles.successIcon}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h1>All Set!</h1>
            <p className={styles.subtitle}>Your profile is complete. Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Profile Updated - Brakebee</title>
        </Head>
        <div className={`section-box ${styles.modal}`}>
          <div className={styles.header}>
            <div className={styles.headerIcon + ' ' + styles.successIcon}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h1>Success!</h1>
            <p className={styles.subtitle}>Your profile has been updated.</p>
          </div>
          <div className={styles.actions}>
            <button 
              onClick={verifyAndCompleteLogin}
              className={styles.primaryButton}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Complete Your Profile - Brakebee</title>
      </Head>
      
      <div className={`section-box ${styles.modal}`}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <i className="fa-solid fa-user-pen"></i>
          </div>
          <h1>Almost There!</h1>
          <p className={styles.subtitle}>We just need a few basics to get you started. You can complete the rest of your profile from your dashboard.</p>
        </div>

        <form onSubmit={handleSubmitInlineForm} className={styles.form}>
          <div className={styles.formGrid}>
            {profileData?.missingFields?.map((field, index) => (
              <div 
                key={index} 
                className={`${styles.formGroup} ${isFullWidthField(field.field) ? styles.fullWidth : ''}`}
              >
                <label htmlFor={field.field} className={styles.label}>
                  {field.label}
                </label>
                <input
                  type={getFieldType(field.field)}
                  id={field.field}
                  name={field.field}
                  value={formData[field.field] || ''}
                  onChange={handleInputChange}
                  placeholder={getFieldPlaceholder(field.field)}
                  className={styles.input}
                  required
                />
              </div>
            ))}
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              type="submit"
              className={styles.primaryButton}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Complete Profile'}
            </button>
            <button 
              type="button"
              onClick={handleGoToProfile}
              className={styles.secondaryButton}
              disabled={submitting}
            >
              Edit Full Profile Instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 