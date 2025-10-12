'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getApiUrl } from '../lib/config';
import { getAuthToken } from '../lib/csrf';
import { authApiRequest, API_ENDPOINTS } from '../lib/apiUtils';

export default function SearchPage() {
  const router = useRouter();
  const { q: query, ai } = router.query;
  
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const resultsPerPage = 20;
  const isAISearch = ai === 'true';

  // Get user ID
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      authApiRequest(API_ENDPOINTS.USERS_ME, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setUserId(data.id))
      .catch(() => {}); // Silent fail
    }
  }, []);

  // Initialize search query from URL
  useEffect(() => {
    if (query) {
      setSearchQuery(query);
    }
  }, [query]);

  // Perform search when query changes
  useEffect(() => {
    if (searchQuery && isAISearch) {
      performAISearch(searchQuery);
    } else if (searchQuery && !isAISearch) {
      performRegularSearch(searchQuery);
    }
  }, [searchQuery, isAISearch, userId]);

  const performAISearch = async (searchTerm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leo-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchTerm,
          userId: userId || 'anonymous',
          options: { limit: 100 }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Search failed');
      
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const performRegularSearch = async (searchTerm) => {
    // Fallback to Leo AI search (same as AI search now)
    setIsLoading(true);
    setError(null);
    
    try {
      // Use Leo AI intelligent search as fallback too
      const response = await fetch('/api/leo-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchTerm,
          userId: userId || 'anonymous',
          options: { limit: 100 }
        })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Search failed');
      
      // Leo AI already returns the correct format
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newQuery = formData.get('query');
    
    if (newQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(newQuery)}&ai=${isAISearch}`);
    }
  };

  const getFilteredResults = () => {
    if (!results) return [];
    
    let allResults = [];
    
    if (activeFilter === 'all') {
      allResults = [
        ...results.categories.products.map(item => ({ ...item, type: 'product' })),
        ...results.categories.artists.map(item => ({ ...item, type: 'artist' })),
        ...results.categories.articles.map(item => ({ ...item, type: 'article' })),
        ...results.categories.events.map(item => ({ ...item, type: 'event' })),
        ...results.categories.other.map(item => ({ ...item, type: 'other' }))
      ];
    } else if (activeFilter === 'products') {
      allResults = results.categories.products.map(item => ({ ...item, type: 'product' }));
    } else if (activeFilter === 'artists') {
      allResults = results.categories.artists.map(item => ({ ...item, type: 'artist' }));
    } else if (activeFilter === 'articles') {
      allResults = results.categories.articles.map(item => ({ ...item, type: 'article' }));
    } else if (activeFilter === 'events') {
      allResults = results.categories.events.map(item => ({ ...item, type: 'event' }));
    } else if (activeFilter === 'other') {
      allResults = results.categories.other.map(item => ({ ...item, type: 'other' }));
    }

    // Sort results
    if (sortBy === 'relevance') {
      allResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    } else if (sortBy === 'date') {
      allResults.sort((a, b) => new Date(b.publishDate || b.startDate || b.metadata?.created_at || 0) - 
                                new Date(a.publishDate || a.startDate || a.metadata?.created_at || 0));
    } else if (sortBy === 'price') {
      allResults.sort((a, b) => (parseFloat(b.price || 0)) - (parseFloat(a.price || 0)));
    }

    return allResults;
  };

  const getPaginatedResults = () => {
    const filtered = getFilteredResults();
    const startIndex = (currentPage - 1) * resultsPerPage;
    return filtered.slice(startIndex, startIndex + resultsPerPage);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredResults().length / resultsPerPage);
  };

  const renderResultItem = (item) => {
    const getTypeIcon = (type) => {
      switch (type) {
        case 'product': return '🎨';
        case 'artist': return '👨‍🎨';
        case 'article': return '📚';
        case 'event': return '🎪';
        default: return '🔍';
      }
    };

    const getTypeColor = (type) => {
      switch (type) {
        case 'product': return '#e74c3c';
        case 'artist': return '#9b59b6';
        case 'article': return '#3498db';
        case 'event': return '#f39c12';
        default: return '#95a5a6';
      }
    };

    return (
      <div key={item.id} className="result-item">
        <div className="result-header">
          <div className="result-type" style={{ color: getTypeColor(item.type) }}>
            {getTypeIcon(item.type)} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </div>
          {item.relevance && (
            <div className="relevance-score">
              {(item.relevance * 100).toFixed(1)}% match
            </div>
          )}
        </div>
        
        <h3 className="result-title">
          {item.displayName || item.businessName || item.title || 'Untitled'}
        </h3>
        
        <p className="result-content">
          {item.excerpt || item.content?.substring(0, 200) || 'No description available'}
          {item.content?.length > 200 && '...'}
        </p>
        
        <div className="result-meta">
          {item.price && <span className="meta-item price">${item.price}</span>}
          {item.location && <span className="meta-item location">📍 {item.location}</span>}
          {item.publishDate && (
            <span className="meta-item date">
              📅 {new Date(item.publishDate).toLocaleDateString()}
            </span>
          )}
          {item.startDate && (
            <span className="meta-item date">
              📅 {new Date(item.startDate).toLocaleDateString()}
            </span>
          )}
          {item.vendor && <span className="meta-item vendor">By: {item.vendor}</span>}
          {item.collection && <span className="meta-item collection">{item.collection}</span>}
        </div>

        {item.learningEnhanced && (
          <div className="ai-enhanced">
            🤖 AI Enhanced Result
          </div>
        )}
      </div>
    );
  };

  const renderPagination = () => {
    const totalPages = getTotalPages();
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`page-btn ${i === currentPage ? 'active' : ''}`}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <button 
          className="page-btn"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          ← Previous
        </button>
        {pages}
        <button 
          className="page-btn"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next →
        </button>
      </div>
    );
  };

  const pageTitle = query ? `Search: ${query}` : 'Search';
  const pageDescription = results ? 
    `Found ${results.totalResults} results for "${query}"${isAISearch ? ' using AI search' : ''}` :
    'Search for products, artists, articles, and events';

  return (
    <>
      <Head>
        <title>{pageTitle} | Your Art Platform</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <Header />
      
      <main className="search-page">
        <div className="search-container">
          {/* Search Header */}
          <div className="search-header">
            <h1>
              {isAISearch ? '🤖 AI Search' : '🔍 Search'}
            </h1>
            
            <form onSubmit={handleNewSearch} className="search-form">
              <input
                type="text"
                name="query"
                defaultValue={query}
                placeholder={isAISearch ? "Search with AI..." : "Search..."}
                className="search-input"
              />
              <button type="submit" className="search-btn">
                Search
              </button>
              <Link 
                href={`/search?q=${encodeURIComponent(query || '')}&ai=${!isAISearch}`}
                className="toggle-search"
              >
                {isAISearch ? 'Try Regular Search' : 'Try AI Search'}
              </Link>
            </form>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="results-summary">
              <p>
                Found <strong>{results.totalResults}</strong> results for "<strong>{query}</strong>"
              </p>
              
              {isAISearch && results.metadata?.learningApplied && (
                <p className="ai-note">
                  🤖 Results enhanced with AI learning and personalization
                </p>
              )}
            </div>
          )}

          {/* Filters and Sorting */}
          {results && results.totalResults > 0 && (
            <div className="controls">
              <div className="filters">
                <label>Filter by:</label>
                <select 
                  value={activeFilter} 
                  onChange={(e) => {
                    setActiveFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Results ({results.totalResults})</option>
                  {results.categories.products?.length > 0 && (
                    <option value="products">Products ({results.categories.products.length})</option>
                  )}
                  {results.categories.artists?.length > 0 && (
                    <option value="artists">Artists ({results.categories.artists.length})</option>
                  )}
                  {results.categories.articles?.length > 0 && (
                    <option value="articles">Articles ({results.categories.articles.length})</option>
                  )}
                  {results.categories.events?.length > 0 && (
                    <option value="events">Events ({results.categories.events.length})</option>
                  )}
                  {results.categories.other?.length > 0 && (
                    <option value="other">Other ({results.categories.other.length})</option>
                  )}
                </select>
              </div>

              <div className="sorting">
                <label>Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="price">Price</option>
                </select>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="loading">
              <p>{isAISearch ? '🤖 AI is searching...' : '🔍 Searching...'}</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="error">
              <p>❌ {error}</p>
              <button onClick={() => performAISearch(searchQuery)} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {/* No Results */}
          {results && results.totalResults === 0 && (
            <div className="no-results">
              <h2>No results found</h2>
              <p>Try different keywords or check your spelling.</p>
              {isAISearch && (
                <Link 
                  href={`/search?q=${encodeURIComponent(query)}&ai=false`}
                  className="fallback-link"
                >
                  Try regular search instead
                </Link>
              )}
            </div>
          )}

          {/* Results */}
          {results && results.totalResults > 0 && (
            <>
              <div className="results-list">
                {getPaginatedResults().map(renderResultItem)}
              </div>
              
              {renderPagination()}
            </>
          )}
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .search-page {
          min-height: 100vh;
          padding-top: var(--header-height-desktop);
          background: #fafafa;
        }

        .search-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .search-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .search-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: #333;
        }

        .search-form {
          display: flex;
          gap: 1rem;
          max-width: 600px;
          margin: 0 auto;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 1rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #007bff;
        }

        .search-btn {
          padding: 1rem 2rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
        }

        .search-btn:hover {
          background: #0056b3;
        }

        .toggle-search {
          color: #666;
          text-decoration: none;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .toggle-search:hover {
          color: #007bff;
          text-decoration: underline;
        }

        .results-summary {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .results-summary p {
          margin: 0.5rem 0;
        }

        .confidence {
          color: #28a745;
          font-weight: bold;
        }

        .ai-note {
          color: #007bff;
          font-style: italic;
        }

        .controls {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
          background: white;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .filters, .sorting {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filters label, .sorting label {
          font-weight: bold;
          color: #333;
        }

        .filters select, .sorting select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .loading, .error, .no-results {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .retry-btn, .fallback-link {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #007bff;
          color: white;
          text-decoration: none;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .retry-btn:hover, .fallback-link:hover {
          background: #0056b3;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .result-item {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .result-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .result-type {
          font-weight: bold;
          font-size: 0.9rem;
          text-transform: uppercase;
        }

        .relevance-score {
          background: #e3f2fd;
          color: #1976d2;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .result-title {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.3rem;
          line-height: 1.4;
        }

        .result-content {
          color: #666;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .result-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .meta-item {
          font-size: 0.9rem;
          color: #888;
        }

        .meta-item.price {
          color: #28a745;
          font-weight: bold;
        }

        .ai-enhanced {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
          display: inline-block;
          margin-top: 0.5rem;
        }

        .pagination {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 2rem;
          padding: 2rem 0;
        }

        .page-btn {
          padding: 0.75rem 1rem;
          border: 1px solid #ddd;
          background: white;
          color: #333;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .page-btn:hover:not(:disabled) {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .page-btn.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .search-page {
            padding-top: var(--header-height-mobile);
          }

          .search-container {
            padding: 1rem;
          }

          .search-header h1 {
            font-size: 2rem;
          }

          .search-form {
            flex-direction: column;
            align-items: stretch;
          }

          .controls {
            flex-direction: column;
            gap: 1rem;
          }

          .result-meta {
            flex-direction: column;
            gap: 0.5rem;
          }

          .pagination {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}
