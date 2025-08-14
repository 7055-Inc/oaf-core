import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const SubdomainNotFound = () => {
  const router = useRouter();
  const { subdomain } = router.query;

  return (
    <>
      <Head>
        <title>Gallery Not Found - {subdomain}</title>
        <meta name="description" content="This artist gallery is not available." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '2rem'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem'
          }}>🎨</div>
          
          <h1 style={{
            fontSize: '2rem',
            color: '#2c3e50',
            marginBottom: '1rem',
            fontWeight: '600'
          }}>
            Gallery Not Found
          </h1>
          
          <p style={{
            color: '#6c757d',
            marginBottom: '0.5rem',
            fontSize: '1.1rem'
          }}>
            The gallery <strong>{subdomain}.onlineartfestival.com</strong> is not available.
          </p>
          
          <p style={{
            color: '#6c757d',
            marginBottom: '2rem'
          }}>
            This artist may not have set up their gallery yet, or the subdomain may not exist.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link href="https://main.onlineartfestival.com">
              <a style={{
                background: '#667eea',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'background 0.2s'
              }}>
                🏠 Visit Main Site
              </a>
            </Link>
            
            <Link href="https://main.onlineartfestival.com/artists">
              <a style={{
                background: '#764ba2',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'background 0.2s'
              }}>
                🎨 Browse Artists
              </a>
            </Link>
          </div>
          
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#6c757d'
          }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Are you an artist?</strong>
            </p>
            <p style={{ margin: 0 }}>
              <Link href="https://main.onlineartfestival.com/signup">
                <a style={{ color: '#667eea', textDecoration: 'none' }}>
                  Create your own gallery →
                </a>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubdomainNotFound;
