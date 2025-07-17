import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from './signup.module.css';

const SignupRedirectPage = () => {
  const router = useRouter();
  const { subdomain } = router.query;

  useEffect(() => {
    // Redirect to main site after 3 seconds
    const timer = setTimeout(() => {
      window.location.href = 'https://main.onlineartfestival.com';
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Redirecting to Online Art Festival</title>
        <meta name="description" content="Email verification complete. Redirecting to Online Art Festival." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <h1 className={styles.title}>Online Art Festival</h1>
          </div>
          
          <div className={styles.message}>
            <h2 className={styles.heading}>Welcome!</h2>
            <p className={styles.text}>
              Thank you for verifying your email. You're being redirected to the main site.
            </p>
            <div className={styles.spinner}></div>
          </div>
          
          <div className={styles.actions}>
            <a 
              href="https://main.onlineartfestival.com" 
              className={styles.button}
              onClick={() => window.location.href = 'https://main.onlineartfestival.com'}
            >
              Continue to Main Site
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupRedirectPage; 