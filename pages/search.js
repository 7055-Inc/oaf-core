'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { SearchResults } from '../components/search';
import { getAuthToken } from '../lib/csrf';
import { authApiRequest, API_ENDPOINTS } from '../lib/apiUtils';

export default function SearchPage() {
  const router = useRouter();
  const { q: query, category = 'all' } = router.query;
  const [userId, setUserId] = useState(null);

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

  return (
    <>
      <Head>
        <title>{query ? `Search Results for "${query}"` : 'Search'} | Brakebee</title>
        <meta name="description" content={query ? `Search results for "${query}" on Brakebee` : 'Search for products, artists, articles, and events on Brakebee'} />
      </Head>

      <Header />
      
      <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
        <SearchResults 
          initialQuery={query || ''}
          initialCategory={category}
          userId={userId}
        />
      </main>

      <Footer />
    </>
  );
}