'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { SearchResults } from '../components/search';
import { getAuthToken } from '../lib/csrf';
import { getCurrentUser } from '../lib/users/api';

export default function SearchPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Get user ID for personalized search
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      getCurrentUser()
        .then(data => data && setUserId(data.id))
        .catch(() => {});
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