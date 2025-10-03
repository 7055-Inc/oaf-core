import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getApiUrl } from '../../lib/config';
import SearchBar from '../../components/SearchBar';

export default function SearchPage() {
  const router = useRouter();
  const { q: query, category = 'all' } = router.query;
  
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [availableFilters, setAvailableFilters] = useState({});
  const [activeFilters, setActiveFilters] = useState({});

  // Debug logging removed for production

  // Perform search when query or filters change
  useEffect(() => {
    if (query) {
      performSearch(query, selectedCategory, activeFilters);
      fetchAvailableFilters(selectedCategory);
    }
  }, [query, selectedCategory, activeFilters]);

  const performSearch = async (searchQuery, searchCategory = 'all', filters = {}) => {
    if (!searchQuery?.trim()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        category: searchCategory,
        limit: 20
      });
      
      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const searchUrl = getApiUrl(`search?${params.toString()}`);
      
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('SearchPage: Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableFilters = async (searchCategory) => {
    try {
      const response = await fetch(`search/filters?category=${searchCategory}`);
      if (response.ok) {
        const filters = await response.json();
        setAvailableFilters(filters);
      }
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  const handleNewSearch = (newQuery) => {
    router.push(`/search?q=${encodeURIComponent(newQuery)}&category=${selectedCategory}`);
  };

  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    setActiveFilters({}); // Reset filters when changing category
    router.push(`/search?q=${encodeURIComponent(query)}&category=${newCategory}`);
  };

  const handleFilterChange = (filterKey, filterValue) => {
    const newFilters = { ...activeFilters };
    if (filterValue === '' || filterValue === null) {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = filterValue;
    }
    setActiveFilters(newFilters);
  };

  const trackResultClick = async (resultId, resultType) => {
    if (searchResults?.searchQueryId) {
      try {
        await fetch('search/analytics/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQueryId: searchResults.searchQueryId,
            resultId,
            resultType
          })
        });
      } catch (err) {
        console.error('Error tracking click:', err);
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const renderProductResults = (products) => {
    if (!products || products.length === 0) return null;
    
    return (
      <div className="results-section">
        <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
          Products ({products.length})
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {products.map(product => (
            <div key={product.id} style={{
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <Link 
                href={`/products/${product.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => trackResultClick(product.id, 'product')}
              >
                <h4 style={{ 
                  margin: '0 0 0.5rem 0', 
                  color: '#055474',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  {product.name}
                </h4>
                <p style={{ 
                  color: '#666', 
                  fontSize: '0.9rem', 
                  margin: '0.5rem 0',
                  lineHeight: '1.4'
                }}>
                  {product.short_description || product.description?.substring(0, 100) + '...'}
                </p>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: '1rem'
                }}>
                  <span style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 'bold', 
                    color: '#055474' 
                  }}>
                    {formatPrice(product.price)}
                  </span>
                  {product.artist_business_name && (
                    <span style={{ 
                      fontSize: '0.85rem', 
                      color: '#666',
                      fontStyle: 'italic'
                    }}>
                      by {product.artist_business_name}
                    </span>
                  )}
                </div>
                {product.category_name && (
                  <div style={{ 
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    color: '#666',
                    display: 'inline-block'
                  }}>
                    {product.category_name}
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderArtistResults = (artists) => {
    if (!artists || artists.length === 0) return null;
    
    return (
      <div className="results-section">
        <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
          Artists ({artists.length})
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {artists.map(artist => (
            <div key={artist.id} style={{
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '1.5rem',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <Link 
                href={`/profile/${artist.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => trackResultClick(artist.id, 'artist')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}>
                    👨‍🎨
                  </div>
                  <div>
                    <h4 style={{ 
                      margin: '0', 
                      color: '#055474',
                      fontSize: '1.2rem',
                      fontWeight: '600'
                    }}>
                      {artist.business_name || artist.username}
                    </h4>
                    {artist.studio_city && artist.studio_state && (
                      <p style={{ 
                        margin: '0.25rem 0 0 0', 
                        color: '#666',
                        fontSize: '0.9rem'
                      }}>
                        📍 {artist.studio_city}, {artist.studio_state}
                      </p>
                    )}
                  </div>
                </div>
                
                {artist.artist_biography && (
                  <p style={{ 
                    color: '#666', 
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    margin: '0 0 1rem 0'
                  }}>
                    {artist.artist_biography.substring(0, 150)}...
                  </p>
                )}
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {artist.art_categories?.slice(0, 3).map((category, idx) => (
                    <span key={idx} style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#e3f2fd',
                      color: '#055474',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {category}
                    </span>
                  ))}
                  {artist.does_custom === 'yes' && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#e8f5e8',
                      color: '#2e7d32',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      Custom Work
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPromoterResults = (promoters) => {
    if (!promoters || promoters.length === 0) return null;
    
    return (
      <div className="results-section">
        <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
          Promoters ({promoters.length})
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {promoters.map(promoter => (
            <div key={promoter.id} style={{
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '1.5rem',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <Link 
                href={`/profile/${promoter.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => trackResultClick(promoter.id, 'promoter')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}>
                    🏢
                  </div>
                  <div>
                    <h4 style={{ 
                      margin: '0', 
                      color: '#055474',
                      fontSize: '1.2rem',
                      fontWeight: '600'
                    }}>
                      {promoter.business_name || promoter.username}
                    </h4>
                    {promoter.office_city && promoter.office_state && (
                      <p style={{ 
                        margin: '0.25rem 0 0 0', 
                        color: '#666',
                        fontSize: '0.9rem'
                      }}>
                        📍 {promoter.office_city}, {promoter.office_state}
                      </p>
                    )}
                  </div>
                </div>
                
                {promoter.artwork_description && (
                  <p style={{ 
                    color: '#666', 
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    margin: '0 0 1rem 0'
                  }}>
                    {promoter.artwork_description.substring(0, 150)}...
                  </p>
                )}
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {promoter.event_types?.slice(0, 3).map((eventType, idx) => (
                    <span key={idx} style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#fff3e0',
                      color: '#f57c00',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {eventType}
                    </span>
                  ))}
                  {promoter.is_non_profit === 'yes' && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#f3e5f5',
                      color: '#7b1fa2',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      Non-Profit
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!query) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Search</h1>
        <SearchBar autoFocus placeholder="What are you looking for?" />
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Search Header */}
      <div style={{ marginBottom: '2rem' }}>
        <SearchBar 
          placeholder="Search products, artists, promoters..." 
          onSearch={handleNewSearch}
        />
        
        {/* Category Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginTop: '1rem',
          borderBottom: '1px solid #e9ecef',
          paddingBottom: '1rem'
        }}>
          {[
            { key: 'all', label: 'All Results' },
            { key: 'products', label: 'Products' },
            { key: 'artists', label: 'Artists' },
            { key: 'promoters', label: 'Promoters' }
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                backgroundColor: selectedCategory === cat.key ? '#055474' : 'transparent',
                color: selectedCategory === cat.key ? 'white' : '#055474',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: selectedCategory === cat.key ? '600' : '400',
                transition: 'all 0.2s ease'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        
        {/* Search Info */}
        {searchResults && (
          <div style={{ 
            margin: '1rem 0',
            color: '#666',
            fontSize: '0.9rem'
          }}>
            {searchResults.metadata.totalResults} results for "{query}" 
            {searchResults.metadata.responseTime && (
              <span> ({searchResults.metadata.responseTime}ms)</span>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
          <p>Searching...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          color: '#dc3545'
        }}>
          <p>{error}</p>
          <button 
            onClick={() => performSearch(query, selectedCategory, activeFilters)}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#055474',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {searchResults && !isLoading && (
        <div>
          {searchResults.metadata.totalResults === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤷‍♂️</div>
              <h3>No results found</h3>
              <p style={{ color: '#666' }}>
                Try adjusting your search terms or browse our categories
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {renderProductResults(searchResults.results?.products || [])}
              {renderArtistResults(searchResults.results?.artists || [])}
              {renderPromoterResults(searchResults.results?.promoters || [])}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 