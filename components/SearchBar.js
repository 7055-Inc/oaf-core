import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const CATEGORY_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Products', value: 'products' },
  { label: 'Artists', value: 'artists' },
  { label: 'Promoters', value: 'promoters' }
];

export default function SearchBar({ 
  placeholder = "Search products, artists, promoters...",
  showFilters = false,
  onSearch,
  autoFocus = false,
  className = "",
  showModal = false,
  onClose
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [category, setCategory] = useState('all');
  const [history, setHistory] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(showModal);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const router = useRouter();

  // Update showSearchModal when showModal prop changes
  useEffect(() => {
    setShowSearchModal(showModal);
  }, [showModal]);

  // Debounce autocomplete requests
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    // Load search history from localStorage
    const stored = localStorage.getItem('searchHistory');
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const fetchSuggestions = async (searchQuery) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://api2.onlineartfestival.com/search/autocomplete?q=${encodeURIComponent(searchQuery)}&limit=8`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
  };

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) {
      return;
    }
    
    setShowSuggestions(false);
    
    const newHistory = [searchQuery.trim(), ...history.filter(h => h !== searchQuery.trim())].slice(0, 8);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    
    if (onSearch) {
      onSearch(searchQuery.trim(), category);
      return;
    }
    
    setShowSearchModal(true);
    setSearchLoading(true);
    await performModalSearch(searchQuery.trim(), selectedCategory);
  };

  const performModalSearch = async (searchQuery, categoryFilter = 'all') => {
    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        category: categoryFilter,
        limit: 20
      });
      
      const searchUrl = `https://api2.onlineartfestival.com/search?${params.toString()}`;
      
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setSearchResults({ error: 'Search failed. Please try again.' });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleModalResultClick = (resultId, resultType) => {
    // Close modal and navigate to result
    setShowSearchModal(false);
    setSearchResults(null);
    if (onClose) onClose();
    
    // Navigate to the appropriate page
    if (resultType === 'product') {
      router.push(`/products/${resultId}`);
    } else if (resultType === 'artist' || resultType === 'promoter') {
      router.push(`/profile/${resultId}`);
    }
  };

  const openInNewPage = () => {
    const searchUrl = `/search?q=${encodeURIComponent(query)}&category=${selectedCategory}`;
    window.open(searchUrl, '_blank');
  };

  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    if (query.trim()) {
      performModalSearch(query.trim(), newCategory);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSearch(suggestions[selectedIndex].suggestion);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSearch(suggestion.suggestion);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(e.relatedTarget)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  const getSuggestionTypeIcon = (type) => {
    switch (type) {
      case 'product': return '🎨';
      case 'artist': return '👨‍🎨';
      case 'promoter': return '🏢';
      default: return '🔍';
    }
  };

  const getSuggestionTypeLabel = (type) => {
    switch (type) {
      case 'product': return 'Product';
      case 'artist': return 'Artist';
      case 'promoter': return 'Promoter';
      default: return 'Search';
    }
  };

  const closeModal = () => {
    setShowSearchModal(false);
    setSearchResults(null);
    if (onClose) onClose();
  };

  // If showModal is true, only render the modal
  if (showModal) {
    return (
      <>
        {/* Search Results Modal */}
        {showSearchModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '100px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0px',
              width: '90%',
              maxWidth: '1200px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Modal Header with Search Input */}
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e9ecef',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, color: '#055474', fontSize: '1.5rem' }}>
                    Search
                  </h2>
                  <button
                    onClick={closeModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: '#666'
                    }}
                  >
                    ×
                  </button>
                </div>
                
                {/* Search Input */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  backgroundColor: 'white',
                  border: '2px solid #e9ecef',
                  borderRadius: '0px',
                  padding: '0.15rem 1rem',
                  transition: 'border-color 0.2s ease'
                }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '1rem',
                      color: '#333',
                      padding: '0.5rem 0'
                    }}
                  />
                  
                  {isLoading ? (
                    <div style={{ marginLeft: '0.5rem', color: '#666' }}>⏳</div>
                  ) : (
                    <button
                      onClick={() => handleSearch()}
                      style={{
                        marginLeft: '0.5rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#3e1c56',
                        fontSize: '1.2rem',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Search"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '1.5rem',
                      right: '1.5rem',
                      backgroundColor: 'white',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      zIndex: 1000,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={`${suggestion.type}-${suggestion.suggestion}-${index}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          borderBottom: index < suggestions.length - 1 ? '1px solid #f1f3f4' : 'none',
                          backgroundColor: selectedIndex === index ? '#f8f9fa' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <span style={{ fontSize: '1.2rem' }}>
                          {getSuggestionTypeIcon(suggestion.type)}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', color: '#333' }}>
                            {suggestion.suggestion}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            {getSuggestionTypeLabel(suggestion.type)}
                            {suggestion.frequency && ` • ${suggestion.frequency} searches`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Tabs */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid #e9ecef',
                backgroundColor: 'white'
              }}>
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleCategoryChange(opt.value)}
                    style={{
                      background: selectedCategory === opt.value ? '#055474' : 'transparent',
                      color: selectedCategory === opt.value ? 'white' : '#055474',
                      border: 'none',
                      padding: '1rem 1.5rem',
                      cursor: 'pointer',
                      fontWeight: selectedCategory === opt.value ? 'bold' : 'normal',
                      fontSize: '1rem',
                      transition: 'background 0.2s, color 0.2s'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '1.5rem'
              }}>
                {searchResults?.error ? (
                  <div style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>
                    {searchResults.error}
                  </div>
                ) : searchResults ? (
                  <div>
                    {/* Products */}
                    {searchResults.results?.products && searchResults.results.products.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
                          Products ({searchResults.results.products.length})
                        </h3>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                          gap: '1.5rem' 
                        }}>
                          {searchResults.results.products.map(product => (
                            <div key={product.id} style={{
                              border: '1px solid #e9ecef',
                              borderRadius: '0px',
                              padding: '1rem',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onClick={() => handleModalResultClick(product.id, 'product')}
                            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
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
                                  ${product.price}
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
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Artists */}
                    {searchResults.results?.artists && searchResults.results.artists.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
                          Artists ({searchResults.results.artists.length})
                        </h3>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                          gap: '1.5rem' 
                        }}>
                          {searchResults.results.artists.map(artist => (
                            <div key={artist.id} style={{
                              border: '1px solid #e9ecef',
                              borderRadius: '0px',
                              padding: '1rem',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onClick={() => handleModalResultClick(artist.id, 'artist')}
                            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                              <h4 style={{ 
                                margin: '0 0 0.5rem 0', 
                                color: '#055474',
                                fontSize: '1.1rem',
                                fontWeight: '600'
                              }}>
                                {artist.business_name || artist.display_name}
                              </h4>
                              <p style={{ 
                                color: '#666', 
                                fontSize: '0.9rem', 
                                margin: '0.5rem 0',
                                lineHeight: '1.4'
                              }}>
                                {artist.artist_biography?.substring(0, 100) + '...'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Promoters */}
                    {searchResults.results?.promoters && searchResults.results.promoters.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
                          Promoters ({searchResults.results.promoters.length})
                        </h3>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                          gap: '1.5rem' 
                        }}>
                          {searchResults.results.promoters.map(promoter => (
                            <div key={promoter.id} style={{
                              border: '1px solid #e9ecef',
                              borderRadius: '0px',
                              padding: '1rem',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onClick={() => handleModalResultClick(promoter.id, 'promoter')}
                            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                              <h4 style={{ 
                                margin: '0 0 0.5rem 0', 
                                color: '#055474',
                                fontSize: '1.1rem',
                                fontWeight: '600'
                              }}>
                                {promoter.business_name || promoter.display_name}
                              </h4>
                              <p style={{ 
                                color: '#666', 
                                fontSize: '0.9rem', 
                                margin: '0.5rem 0',
                                lineHeight: '1.4'
                              }}>
                                {promoter.promoter_description?.substring(0, 100) + '...'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {(!searchResults.results?.products || searchResults.results.products.length === 0) &&
                     (!searchResults.results?.artists || searchResults.results.artists.length === 0) &&
                     (!searchResults.results?.promoters || searchResults.results.promoters.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                        <h3>No results found for "{query}"</h3>
                        <p>Try adjusting your search terms or browse our categories.</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Original search bar component (for backward compatibility)
  return (
    <div className={`search-bar-container ${className}`} style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
      {/* Search Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        border: '2px solid #e9ecef',
        borderRadius: '0px',
        padding: '0.15rem 1rem',
        transition: 'border-color 0.2s ease',
        ...(showSuggestions && { borderColor: '#055474' })
      }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: '1rem',
            color: '#333',
            padding: '0.5rem 0'
          }}
        />
        
        {isLoading ? (
          <div style={{ marginLeft: '0.5rem', color: '#666' }}>⏳</div>
        ) : (
          <button
            onClick={() => handleSearch()}
            style={{
              marginLeft: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#3e1c56',
              fontSize: '1.2rem',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.suggestion}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid #f1f3f4' : 'none',
                backgroundColor: selectedIndex === index ? '#f8f9fa' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span style={{ fontSize: '1.2rem' }}>
                {getSuggestionTypeIcon(suggestion.type)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', color: '#333' }}>
                  {suggestion.suggestion}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {getSuggestionTypeLabel(suggestion.type)}
                  {suggestion.frequency && ` • ${suggestion.frequency} searches`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search History Dropdown */}
      {showSuggestions && history.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #e9ecef',
          borderRadius: '0 0 12px 12px',
          zIndex: 10,
          maxHeight: '200px',
          overflowY: 'auto',
          marginTop: '-2px'
        }}>
          <div style={{ padding: '0.5rem', color: '#055474', fontWeight: 'bold' }}>Recent Searches</div>
          {history.map((h, i) => (
            <div
              key={h}
              style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: i < history.length - 1 ? '1px solid #f0f0f0' : 'none' }}
              onClick={() => handleSearch(h)}
            >
              {h}
            </div>
          ))}
        </div>
      )}

      {/* Error and Loading Feedback */}
      {isLoading && <div style={{ position: 'absolute', right: 10, top: 10, color: '#666' }}>⏳ Loading...</div>}

      {/* Search Results Modal */}
      {showSearchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '100px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0px',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ margin: 0, color: '#055474', fontSize: '1.5rem' }}>
                  Search Results for "{query}"
                </h2>
                {searchLoading && <span style={{ color: '#666' }}>⏳ Loading...</span>}
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  onClick={openInNewPage}
                  style={{
                    background: 'none',
                    border: '1px solid #055474',
                    color: '#055474',
                    padding: '0.5rem 1rem',
                    borderRadius: '0px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Open In New Page
                </button>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchResults(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: 'white'
            }}>
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleCategoryChange(opt.value)}
                  style={{
                    background: selectedCategory === opt.value ? '#055474' : 'transparent',
                    color: selectedCategory === opt.value ? 'white' : '#055474',
                    border: 'none',
                    padding: '1rem 1.5rem',
                    cursor: 'pointer',
                    fontWeight: selectedCategory === opt.value ? 'bold' : 'normal',
                    fontSize: '1rem',
                    transition: 'background 0.2s, color 0.2s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '1.5rem'
            }}>
              {searchResults?.error ? (
                <div style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>
                  {searchResults.error}
                </div>
              ) : searchResults ? (
                <div>
                  {/* Products */}
                  {searchResults.results?.products && searchResults.results.products.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
                        Products ({searchResults.results.products.length})
                      </h3>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '1.5rem' 
                      }}>
                        {searchResults.results.products.map(product => (
                          <div key={product.id} style={{
                            border: '1px solid #e9ecef',
                            borderRadius: '0px',
                            padding: '1rem',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onClick={() => handleModalResultClick(product.id, 'product')}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
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
                                ${product.price}
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Artists */}
                  {searchResults.results?.artists && searchResults.results.artists.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
                        Artists ({searchResults.results.artists.length})
                      </h3>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '1.5rem' 
                      }}>
                        {searchResults.results.artists.map(artist => (
                          <div key={artist.id} style={{
                            border: '1px solid #e9ecef',
                            borderRadius: '0px',
                            padding: '1rem',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onClick={() => handleModalResultClick(artist.id, 'artist')}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                          >
                            <h4 style={{ 
                              margin: '0 0 0.5rem 0', 
                              color: '#055474',
                              fontSize: '1.1rem',
                              fontWeight: '600'
                            }}>
                              {artist.business_name || artist.display_name}
                            </h4>
                            <p style={{ 
                              color: '#666', 
                              fontSize: '0.9rem', 
                              margin: '0.5rem 0',
                              lineHeight: '1.4'
                            }}>
                              {artist.artist_biography?.substring(0, 100) + '...'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Promoters */}
                  {searchResults.results?.promoters && searchResults.results.promoters.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{ color: '#055474', marginBottom: '1rem', fontSize: '1.5rem' }}>
                        Promoters ({searchResults.results.promoters.length})
                      </h3>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '1.5rem' 
                      }}>
                        {searchResults.results.promoters.map(promoter => (
                          <div key={promoter.id} style={{
                            border: '1px solid #e9ecef',
                            borderRadius: '0px',
                            padding: '1rem',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onClick={() => handleModalResultClick(promoter.id, 'promoter')}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                          >
                            <h4 style={{ 
                              margin: '0 0 0.5rem 0', 
                              color: '#055474',
                              fontSize: '1.1rem',
                              fontWeight: '600'
                            }}>
                              {promoter.business_name || promoter.display_name}
                            </h4>
                            <p style={{ 
                              color: '#666', 
                              fontSize: '0.9rem', 
                              margin: '0.5rem 0',
                              lineHeight: '1.4'
                            }}>
                              {promoter.promoter_description?.substring(0, 100) + '...'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {(!searchResults.results?.products || searchResults.results.products.length === 0) &&
                   (!searchResults.results?.artists || searchResults.results.artists.length === 0) &&
                   (!searchResults.results?.promoters || searchResults.results.promoters.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                      <h3>No results found for "{query}"</h3>
                      <p>Try adjusting your search terms or browse our categories.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 