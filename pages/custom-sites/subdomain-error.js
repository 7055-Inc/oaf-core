import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getSubdomainBase, getFrontendUrl } from '../../lib/config';

const SubdomainError = () => {
  const router = useRouter();
  const { subdomain, error } = router.query;

  return (
    <>
      <Head>
        <title>Gallery Error - {subdomain}</title>
        <meta name="description" content="There was an error loading this gallery." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
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
          }}>⚠️</div>
          
          <h1 style={{
            fontSize: '2rem',
            color: '#2c3e50',
            marginBottom: '1rem',
            fontWeight: '600'
          }}>
            Gallery Error
          </h1>
          
          <p style={{
            color: '#6c757d',
            marginBottom: '0.5rem',
            fontSize: '1.1rem'
          }}>
            There was an error loading <strong>{subdomain}.{getSubdomainBase()}</strong>
          </p>
          
          <p style={{
            color: '#6c757d',
            marginBottom: '2rem'
          }}>
            Please try again in a few moments. If the problem persists, contact support.
          </p>
          
          {error && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '2rem',
              fontSize: '0.9rem',
              color: '#856404'
            }}>
              <strong>Technical Details:</strong><br />
              {decodeURIComponent(error)}
            </div>
          )}
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#ff6b6b',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              🔄 Try Again
            </button>
            
            <Link href={getFrontendUrl()}>
              <a style={{
                background: '#ee5a24',
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
          </div>
        </div>
      </div>
    </>
  );
};

export default SubdomainError;
