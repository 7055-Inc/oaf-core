import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PaintbrushLoader from './PaintbrushLoader';

const CATEGORY_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Products', value: 'products' },
  { label: 'Artists', value: 'artists' },
  { label: 'Articles', value: 'articles' },
  { label: 'Events', value: 'events' }
];

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name A-Z', value: 'name_asc' }
];

export default function SearchResults({ 
  initialQuery = '', 
  initialCategory = 'all',
  userId = 'anonymous' 
}) {
  const router = useRouter();
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(initialCategory);
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const resultsPerPage = 20;

  // Perform search when query, filter, or sort changes
  useEffect(() => {
    if (searchQuery?.trim()) {
      performSearch(searchQuery, activeFilter, sortBy, currentPage);
    }
  }, [searchQuery, activeFilter, sortBy, currentPage]);

  const performSearch = async (query, category = 'all', sort = 'relevance', page = 1) => {
    if (!query?.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use Leo AI intelligent search
      const response = await fetch('/api/leo-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          userId,
          options: { 
            limit: resultsPerPage * page,
            categories: category === 'all' ? 
              ['products', 'artists', 'articles', 'events'] : 
              [category],
            sort,
            page
          }
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
    setCurrentPage(1);
    // Update URL
    router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${newFilter}`, undefined, { shallow: true });
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const handleResultClick = (resultId, resultType) => {
    if (resultType === 'product') {
      router.push(`/products/${resultId}`);
    } else if (resultType === 'artist') {
      router.push(`/profile/${resultId}`);
    } else if (resultType === 'article') {
      router.push(`/articles/${resultId}`);
    } else if (resultType === 'event') {
      router.push(`/events/${resultId}`);
    }
  };

  const getTotalResults = () => {
    if (!results?.results) return 0;
    return Object.values(results.results).reduce((total, arr) => total + arr.length, 0);
  };

  const getAllResults = () => {
    if (!results?.results) return [];
    
    let allResults = [];
    
    // Combine all result types with their type information
    Object.entries(results.results).forEach(([type, items]) => {
      items.forEach(item => {
        allResults.push({ ...item, resultType: type.slice(0, -1) }); // Remove 's' from type
      });
    });

    // Apply sorting
    if (sortBy === 'newest') {
      allResults.sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
    } else if (sortBy === 'price_asc') {
      allResults.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    } else if (sortBy === 'price_desc') {
      allResults.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    } else if (sortBy === 'name_asc') {
      allResults.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
    }

    return allResults;
  };

  const renderResultItem = (item) => {
    const { resultType } = item;
    
    return (
      <div 
        key={`${resultType}-${item.id}`}
        style={{
          border: '1px solid #e9ecef',
          borderRadius: '0px',
          padding: '1.5rem',
          backgroundColor: 'white',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          marginBottom: '1rem'
        }}
        onClick={() => handleResultClick(item.id, resultType)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{
                backgroundColor: '#055474',
                color: 'white',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                borderRadius: '0px'
              }}>
                {resultType}
              </span>
              {item.relevance && (
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {Math.round(item.relevance * 100)}% match
                </span>
              )}
            </div>
            
            <h3 style={{ 
              margin: '0 0 0.5rem 0', 
              color: '#055474',
              fontSize: '1.3rem',
              fontWeight: '600'
            }}>
              {item.name || item.title || item.business_name}
            </h3>
            
            <p style={{ 
              color: '#666', 
              fontSize: '1rem', 
              margin: '0.5rem 0 1rem 0',
              lineHeight: '1.5'
            }}>
              {item.short_description || 
               item.description?.substring(0, 200) + '...' ||
               item.excerpt ||
               item.content?.substring(0, 200) + '...' ||
               item.bio?.substring(0, 200) + '...'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              {item.price && (
                <span style={{ 
                  fontSize: '1.3rem', 
                  fontWeight: 'bold', 
                  color: '#055474' 
                }}>
                  ${item.price}
                </span>
              )}
              
              {item.artist_business_name && (
                <span style={{ 
                  fontSize: '0.9rem', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  by {item.artist_business_name}
                </span>
              )}
              
              {item.start_date && (
                <span style={{ 
                  fontSize: '0.9rem', 
                  color: '#055474',
                  fontWeight: '500'
                }}>
                  📅 {new Date(item.start_date).toLocaleDateString()}
                </span>
              )}
              
              {(item.created_at || item.date) && (
                <span style={{ 
                  fontSize: '0.85rem', 
                  color: '#999'
                }}>
                  {new Date(item.created_at || item.date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* Search Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#055474', fontSize: '2rem', marginBottom: '0.5rem' }}>
          Search Results
        </h1>
        {searchQuery && (
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Showing results for "{searchQuery}"
            {getTotalResults() > 0 && (
              <span> ({getTotalResults()} results found)</span>
            )}
          </p>
        )}
      </div>

      {/* Filters and Sorting */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '0px'
      }}>
        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {CATEGORY_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleFilterChange(option.value)}
              style={{
                background: activeFilter === option.value ? '#055474' : 'white',
                color: activeFilter === option.value ? 'white' : '#055474',
                border: '1px solid #055474',
                padding: '0.5rem 1rem',
                borderRadius: '0px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeFilter === option.value ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: '#666' }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0px',
              fontSize: '0.9rem',
              backgroundColor: 'white'
            }}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <PaintbrushLoader size="large" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ 
          color: 'red', 
          textAlign: 'center', 
          padding: '2rem',
          backgroundColor: '#fee',
          borderRadius: '0px',
          marginBottom: '2rem'
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {results && !isLoading && (
        <div>
          {getTotalResults() > 0 ? (
            <div>
              {getAllResults().map(renderResultItem)}
              
              {/* Load More Button */}
              {getAllResults().length >= resultsPerPage && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    style={{
                      backgroundColor: '#055474',
                      color: 'white',
                      border: 'none',
                      padding: '1rem 2rem',
                      borderRadius: '0px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Load More Results
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎨</div>
              <h3 style={{ color: '#055474', marginBottom: '1rem' }}>No results found</h3>
              <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
                We couldn't find anything matching "{searchQuery}".
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/products" style={{ 
                  color: '#055474', 
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  border: '1px solid #055474',
                  borderRadius: '0px'
                }}>
                  Browse Products
                </Link>
                <Link href="/artists" style={{ 
                  color: '#055474', 
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  border: '1px solid #055474',
                  borderRadius: '0px'
                }}>
                  Browse Artists
                </Link>
                <Link href="/articles" style={{ 
                  color: '#055474', 
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  border: '1px solid #055474',
                  borderRadius: '0px'
                }}>
                  Browse Articles
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
