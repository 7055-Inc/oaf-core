import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest } from '../lib/csrf';
import { authApiRequest } from '../lib/apiUtils';
import styles from '../styles/ProfileCompletion.module.css';

export default function ProfileCompletion() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInlineForm, setShowInlineForm] = useState(false);
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

  const handleShowInlineForm = () => {
    setShowInlineForm(true);
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
      const response = await authenticatedApiRequest('users/complete-profile', {
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
        const checkResponse = await authenticatedApiRequest('users/profile-completion-status');
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

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Complete Your Profile - Online Art Festival</title>
        </Head>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Checking your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Profile Completion - Online Art Festival</title>
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

  if (!!profileData && (profileData.requiresCompletion === false || profileData.isComplete === true)) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Profile Complete - Online Art Festival</title>
        </Head>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h1>Profile Complete!</h1>
            <p>Your profile is already complete. Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Profile Updated - Online Art Festival</title>
        </Head>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h1>✅ Success!</h1>
            <p className={styles.subtitle}>
              Your profile has been updated successfully.
            </p>
          </div>
          <div className={styles.successActions}>
            <button 
              onClick={verifyAndCompleteLogin}
              className={styles.completeButton}
            >
              Complete Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Complete Your Profile - Online Art Festival</title>
      </Head>
      
      <div className={styles.modal}>
        <div className={styles.header}>
          <h1>Complete Your Profile</h1>
          <p className={styles.subtitle}>
            Please complete your profile to continue using Online Art Festival.
          </p>
        </div>

        {!showInlineForm ? (
          <div className={styles.optionsContainer}>
            <div className={styles.missingFieldsInfo}>
              <h3>Missing Required Information:</h3>
              <ul className={styles.missingFieldsList}>
                {profileData?.missingFields?.map((field, index) => (
                  <li key={index}>{field.label}</li>
                ))}
              </ul>
            </div>

            <div className={styles.options}>
              <button 
                onClick={handleGoToProfile}
                className={styles.profileButton}
              >
                <span className={styles.buttonIcon}>👤</span>
                Take me to my profile to complete setup
              </button>
              
              <button 
                onClick={handleShowInlineForm}
                className={styles.inlineButton}
              >
                <span className={styles.buttonIcon}>📝</span>
                Show me the missing fields
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.inlineFormContainer}>
            <div className={styles.formHeader}>
              <h3>Complete Missing Information</h3>
              <p>Fill in the required fields below:</p>
            </div>

            <form onSubmit={handleSubmitInlineForm} className={styles.inlineForm}>
              {profileData?.missingFields?.map((field, index) => (
                <div key={index} className={styles.formGroup}>
                  <label htmlFor={field.field} className={styles.label}>
                    {field.label} *
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

              {error && (
                <div className={styles.errorMessage}>
                  <p>{error}</p>
                </div>
              )}

              <div className={styles.formActions}>
                <button 
                  type="button"
                  onClick={() => setShowInlineForm(false)}
                  className={styles.backButton}
                  disabled={submitting}
                >
                  Back to Options
                </button>
                <button 
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className={styles.spinner}></span>
                      Updating...
                    </>
                  ) : (
                    'Complete Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
} 