import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function SearchBar({ 
  placeholder = "Search products, artists, articles, events...",
  onSearch,
  autoFocus = false,
  className = "",
  showModal = false,
  onModalOpen
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const router = useRouter();

  // Load search history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('searchHistory');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('searchHistory');
      }
    }
  }, []);

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

  const fetchSuggestions = async (searchQuery) => {
    try {
      setIsLoading(true);
      // Use Leo AI intelligent search for suggestions
      const response = await fetch('/api/leo-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          userId: 'anonymous',
          options: { limit: 8 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const suggestions = [];

        // Extract suggestions from Leo AI results
        if (data.results?.products) {
          data.results.products.slice(0, 3).forEach(product => {
            suggestions.push({
              suggestion: product.name,
              type: 'product',
              id: product.id
            });
          });
        }

        if (data.results?.artists) {
          data.results.artists.slice(0, 2).forEach(artist => {
            suggestions.push({
              suggestion: artist.business_name || artist.name,
              type: 'artist',
              id: artist.id
            });
          });
        }

        if (data.results?.articles) {
          data.results.articles.slice(0, 2).forEach(article => {
            suggestions.push({
              suggestion: article.title,
              type: 'article',
              id: article.id
            });
          });
        }

        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
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
    
    // Update search history
    const newHistory = [searchQuery.trim(), ...history.filter(h => h !== searchQuery.trim())].slice(0, 8);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    
    // If onSearch callback is provided, use it
    if (onSearch) {
      onSearch(searchQuery.trim());
      return;
    }
    
    // Otherwise, trigger modal open callback or navigate to search page
    if (onModalOpen) {
      onModalOpen(searchQuery.trim());
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 200);
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'product': return '🎨';
      case 'artist': return '👨‍🎨';
      case 'article': return '📄';
      case 'event': return '📅';
      default: return '🔍';
    }
  };

  return (
    <div className={`search-bar-container ${className}`} style={{ position: 'relative', width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        border: '2px solid #055474',
        borderRadius: '0px',
        backgroundColor: 'white',
        overflow: 'hidden'
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
          aria-label="Search products, artists, and events"
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: 'none',
            outline: 'none',
            fontSize: '1rem',
            backgroundColor: 'transparent'
          }}
        />
        
        <button
          onClick={() => handleSearch()}
          disabled={!query.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#055474',
            color: 'white',
            border: 'none',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
            fontWeight: 'bold',
            opacity: query.trim() ? 1 : 0.6,
            transition: 'opacity 0.2s'
          }}
        >
          {isLoading ? '⏳' : '🔍'}
        </button>
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
            border: '1px solid #ccc',
            borderTop: 'none',
            borderRadius: '0 0 0px 0px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.id}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                backgroundColor: selectedIndex === index ? '#f0f8ff' : 'white',
                borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span style={{ fontSize: '1.2rem' }}>
                {getSuggestionIcon(suggestion.type)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', color: '#055474' }}>
                  {suggestion.suggestion}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'capitalize' }}>
                  {suggestion.type}
                </div>
              </div>
            </div>
          ))}
          
          {/* Search History */}
          {history.length > 0 && query.length < 2 && (
            <>
              <div style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #eee',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: '#666'
              }}>
                Recent Searches
              </div>
              {history.slice(0, 3).map((historyItem, index) => (
                <div
                  key={`history-${index}`}
                  onClick={() => handleSearch(historyItem)}
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    borderBottom: index < 2 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f8ff'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  <span style={{ fontSize: '1rem', color: '#999' }}>🕒</span>
                  <span style={{ color: '#055474' }}>{historyItem}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
