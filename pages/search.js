'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { SearchResults } from '../components/search';
import { getAuthToken } from '../lib/csrf';
import { authApiRequest, API_ENDPOINTS } from '../lib/apiUtils';

export default function SearchPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Get user ID for personalized search
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      authApiRequest(API_ENDPOINTS.USERS_ME, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setUserId(data.id))
      .catch(() => {}); // Silent fail for anonymous users
    }
  }, []);

  // Wait for router to be ready
  useEffect(() => {
    if (router.isReady) {
      setIsReady(true);
    }
  }, [router.isReady]);

  const { q: query, category = 'all' } = router.query;

  return (
    <>
      <Head>
        <title>{query ? `Search Results for "${query}"` : 'Search'} | Brakebee</title>
        <meta name="description" content={query ? `Search results for "${query}" on Brakebee` : 'Search for products, artists, articles, and events on Brakebee'} />
      </Head>
      
      <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
        {isReady ? (
          <SearchResults 
            initialQuery={query || ''}
            initialCategory={category}
            userId={userId}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#666' }}>Loading search...</p>
          </div>
        )}
      </main>
    </>
  );
}