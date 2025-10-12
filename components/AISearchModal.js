'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getApiUrl } from '../lib/config';

export default function AISearchModal({ isOpen, onClose, initialQuery = '', userId = null }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Helper functions to clean up raw data
  const getCleanTitle = (item) => {
    // If it has proper display fields, use them
    if (item.displayName) return item.displayName;
    if (item.businessName) return item.businessName;
    if (item.title && item.title !== 'Untitled' && item.title !== 'Untitled Article') {
      return item.title;
    }
    
    // Extract meaningful info from metadata
    if (item.metadata?.value_name) {
      return `${item.metadata.value_name} (Color Option)`;
    }
    if (item.metadata?.name) return item.metadata.name;
    if (item.metadata?.display_name) return item.metadata.display_name;
    
    return 'Untitled';
  };

  const getCleanContent = (item) => {
    // Use excerpt if available
    if (item.excerpt && !item.excerpt.includes('Table:')) {
      return item.excerpt;
    }
    
    // Clean up raw content
    let content = item.content || '';
    
    // Remove table prefixes and technical jargon
    content = content.replace(/^Table:\s*\w+\s*/i, '');
    content = content.replace(/\w+_id:\s*\d+\s*/g, '');
    content = content.replace(/source_table:\s*\w+\s*/g, '');
    
    // Extract meaningful parts
    if (item.metadata?.value_name) {
      return `Color option: ${item.metadata.value_name}`;
    }
    
    // Fallback to cleaned content
    if (content && content.length > 10) {
      return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }
    
    return 'No description available';
  };

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leo-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          userId: userId || 'anonymous',
          options: { limit: 20 }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Search failed');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatResultTitle = (item) => {
    // Extract meaningful title from content or metadata
    if (item.title && item.title !== 'Untitled') {
      return item.title;
    }
    
    // Try to extract from content
    if (item.content) {
      // Look for value_name pattern
      const valueNameMatch = item.content.match(/value_name:\s*([^,\n]+)/i);
      if (valueNameMatch) {
        return valueNameMatch[1].trim();
      }
      
      // Look for name pattern
      const nameMatch = item.content.match(/name:\s*([^,\n]+)/i);
      if (nameMatch) {
        return nameMatch[1].trim();
      }
      
      // Use first meaningful part of content
      const firstLine = item.content.split('\n')[0];
      if (firstLine.length > 10) {
        return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
      }
    }
    
    return 'Search Result';
  };

  const formatResultContent = (item) => {
    if (!item.content) return 'No description available';
    
    let content = item.content;
    
    // Remove all table references completely
    content = content.replace(/^Table:\s*\w+\s*/i, '');
    content = content.replace(/Table:\s*\w+/gi, '');
    
    // Extract just the meaningful values, not field names
    const valueMatches = content.match(/value_name:\s*([^,\n]+)/gi);
    if (valueMatches) {
      const values = valueMatches.map(match => 
        match.replace(/value_name:\s*/i, '').trim()
      );
      content = values.join(', ');
    } else {
      // Remove technical field patterns entirely
      content = content.replace(/\w+_id:\s*\d+/gi, '');
      content = content.replace(/\w+:\s*\d{4}-\d{2}-\d{2}/gi, '');
      content = content.replace(/created_at:\s*[^,\n]+/gi, '');
      content = content.replace(/updated_at:\s*[^,\n]+/gi, '');
      content = content.replace(/source_table:\s*[^,\n]+/gi, '');
      content = content.replace(/original_id:\s*\d+/gi, '');
      
      // Clean up remaining content
      content = content.replace(/,\s*,/g, ',');
      content = content.replace(/^,\s*/, '');
      content = content.replace(/\s*,\s*$/, '');
      content = content.trim();
    }
    
    // If content is still too technical or empty, provide a generic description
    if (!content || content.length < 3 || /^\d+$/.test(content)) {
      if (item.metadata?.source_table === 'user_variation_values') {
        content = 'Product color variation';
      } else if (item.metadata?.source_table === 'products') {
        content = 'Product listing';
      } else if (item.metadata?.source_table === 'users') {
        content = 'Artist profile';
      } else {
        content = 'Search result';
      }
    }
    
    // Limit length
    if (content.length > 100) {
      content = content.substring(0, 100) + '...';
    }
    
    return content;
  };

  const formatCollectionName = (collection) => {
    if (!collection) return 'General';
    
    // Clean up collection names
    return collection
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('User Interactions', 'User Data')
      .replace('Site Content', 'Content');
  };

  const renderResults = () => {
    if (!results) return null;

    const { categories, totalResults, metadata } = results;
    const hasResults = totalResults > 0;

    return (
      <div className="search-results">
        <div className="search-meta">
          <p>{totalResults} results found</p>
        </div>

        {!hasResults && (
          <div className="no-results">
            <p>No results found for "{query}"</p>
            <p>Try different keywords or check your spelling.</p>
          </div>
        )}

        {/* Products */}
        {categories.products?.length > 0 && (
          <div className="result-category">
            <h3>🎨 Products ({categories.products.length})</h3>
            <div className="result-list">
              {categories.products.slice(0, 5).map((item) => (
                <div key={item.id} className="result-item">
                  <div className="result-header">
                    <div className="result-type" style={{ color: '#e74c3c' }}>
                      🎨 Product
                    </div>
                    {item.relevance && (
                      <div className="relevance-score">
                        {(item.relevance * 100).toFixed(1)}% match
                      </div>
                    )}
                  </div>
                  <h3 className="result-title">
                    {getCleanTitle(item)}
                  </h3>
                  <p className="result-content">
                    {getCleanContent(item)}
                  </p>
                  <div className="result-meta">
                    {item.price && <span className="meta-item price">${item.price}</span>}
                    {item.vendor && <span className="meta-item vendor">By: {item.vendor}</span>}
                  </div>
                  {item.learningEnhanced && (
                    <div className="ai-enhanced">🤖 AI Enhanced</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Artists */}
        {categories.artists?.length > 0 && (
          <div className="result-category">
            <h3>👨‍🎨 Artists ({categories.artists.length})</h3>
            <div className="result-list">
              {categories.artists.slice(0, 5).map((item) => (
                <div key={item.id} className="result-item">
                  <div className="result-header">
                    <div className="result-type" style={{ color: '#9b59b6' }}>
                      👨‍🎨 Artist
                    </div>
                    {item.relevance && (
                      <div className="relevance-score">
                        {(item.relevance * 100).toFixed(1)}% match
                      </div>
                    )}
                  </div>
                  <h3 className="result-title">
                    {getCleanTitle(item)}
                  </h3>
                  <p className="result-content">
                    {getCleanContent(item)}
                  </p>
                  <div className="result-meta">
                    {item.location && <span className="meta-item location">📍 {item.location}</span>}
                    {item.businessName && <span className="meta-item">Business: {item.businessName}</span>}
                  </div>
                  {item.learningEnhanced && (
                    <div className="ai-enhanced">🤖 AI Enhanced</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Articles */}
        {categories.articles?.length > 0 && (
          <div className="result-category">
            <h3>📚 Articles ({categories.articles.length})</h3>
            <div className="result-list">
              {categories.articles.slice(0, 5).map((item) => (
                <div key={item.id} className="result-item">
                  <div className="result-header">
                    <div className="result-type" style={{ color: '#3498db' }}>
                      📚 Article
                    </div>
                    {item.relevance && (
                      <div className="relevance-score">
                        {(item.relevance * 100).toFixed(1)}% match
                      </div>
                    )}
                  </div>
                  <h3 className="result-title">
                    {getCleanTitle(item)}
                  </h3>
                  <p className="result-content">
                    {getCleanContent(item)}
                  </p>
                  <div className="result-meta">
                    {item.publishDate && (
                      <span className="meta-item date">📅 {new Date(item.publishDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  {item.learningEnhanced && (
                    <div className="ai-enhanced">🤖 AI Enhanced</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {categories.events?.length > 0 && (
          <div className="result-category">
            <h3>🎪 Events ({categories.events.length})</h3>
            <div className="result-list">
              {categories.events.slice(0, 5).map((item) => (
                <div key={item.id} className="result-item">
                  <div className="result-header">
                    <div className="result-type" style={{ color: '#f39c12' }}>
                      🎪 Event
                    </div>
                    {item.relevance && (
                      <div className="relevance-score">
                        {(item.relevance * 100).toFixed(1)}% match
                      </div>
                    )}
                  </div>
                  <h3 className="result-title">
                    {getCleanTitle(item)}
                  </h3>
                  <p className="result-content">
                    {getCleanContent(item)}
                  </p>
                  <div className="result-meta">
                    {item.startDate && (
                      <span className="meta-item date">📅 {new Date(item.startDate).toLocaleDateString()}</span>
                    )}
                    {item.location && <span className="meta-item location">📍 {item.location}</span>}
                  </div>
                  {item.learningEnhanced && (
                    <div className="ai-enhanced">🤖 AI Enhanced</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Results */}
        {categories.other?.length > 0 && (
          <div className="result-category">
            <h3>🔍 Other Results ({categories.other.length})</h3>
            <div className="result-list">
              {categories.other.slice(0, 5).map((item) => (
                <div key={item.id} className="result-item">
                  <div className="result-header">
                    <div className="result-type" style={{ color: '#95a5a6' }}>
                      🔍 Other
                    </div>
                    {item.relevance && (
                      <div className="relevance-score">
                        {(item.relevance * 100).toFixed(1)}% match
                      </div>
                    )}
                  </div>
                  <h3 className="result-title">
                    {getCleanTitle(item)}
                  </h3>
                  <p className="result-content">
                    {getCleanContent(item)}
                  </p>
                  <div className="result-meta">
                    <span className="meta-item collection">{formatCollectionName(item.collection)}</span>
                  </div>
                  {item.learningEnhanced && (
                    <div className="ai-enhanced">🤖 AI Enhanced</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasResults && (
          <div className="modal-actions">
            <Link href={`/search?q=${encodeURIComponent(query)}&ai=true`} className="see-all-btn">
              See All {totalResults} Results →
            </Link>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content ai-search-modal">
        <div className="modal-header">
          <button 
            className="close-btn" 
            onClick={onClose}
            aria-label="Close search"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-input-container">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Smart Search - Powered by Leo Art AI"
              className="search-input"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        <div className="search-content">
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}

          {isLoading && (
            <div className="loading-message">
              <p>🤖 AI is searching...</p>
            </div>
          )}

          {renderResults()}
        </div>
      </div>

      <style jsx>{`
        .ai-search-modal {
          max-width: 800px;
          width: 95%;
          max-height: 90vh;
          padding: 0;
        }

        .modal-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 1rem 1.5rem 0.5rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #333;
        }

        .search-form {
          padding: 0.5rem 2rem 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .search-input-container {
          display: flex;
          gap: 0.5rem;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #055474;
        }


        .search-content {
          padding: 1.5rem 2rem;
          max-height: 60vh;
          overflow-y: auto;
        }

        .search-meta {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }

        .search-meta p {
          margin: 0.25rem 0;
          color: #666;
          font-size: 0.9rem;
        }

        .confidence {
          font-weight: bold;
          color: #28a745;
        }

        .no-results {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .result-category {
          margin-bottom: 2rem;
        }

        .result-category h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #007bff;
        }

        .result-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .result-item {
          padding: 1rem;
          border: 1px solid #eee;
          border-radius: 4px;
          background: #fafafa;
        }

        .result-item h4 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 1rem;
        }

        .result-content {
          margin: 0.5rem 0;
          color: #666;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .result-meta {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
          font-size: 0.8rem;
        }

        .result-meta span {
          color: #888;
        }

        .price {
          color: #28a745;
          font-weight: bold;
        }

        .relevance {
          color: #007bff;
          font-weight: bold;
        }

        .see-all-btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #28a745;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          margin-top: 1rem;
        }

        .see-all-btn:hover {
          background: #218838;
        }

        .error-message {
          text-align: center;
          padding: 1rem;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          color: #721c24;
        }

        .loading-message {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        @media (max-width: 768px) {
          .ai-search-modal {
            width: 98%;
            max-height: 95vh;
          }

          .modal-header {
            padding: 1rem;
          }

          .search-form {
            padding: 1rem;
          }

          .search-content {
            padding: 1rem;
          }

          .search-input-container {
            flex-direction: column;
          }

          .search-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
