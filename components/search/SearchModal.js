import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PaintbrushLoader from './PaintbrushLoader';
import { getApiUrl } from '../../lib/config';

const CATEGORY_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Products', value: 'products' },
  { label: 'Artists', value: 'artists' },
  { label: 'Promoters', value: 'promoters' },
  { label: 'Articles', value: 'articles' },
  { label: 'Events', value: 'events' }
];

export default function SearchModal({ 
  isOpen, 
  onClose, 
  query = '', 
  userId = 'anonymous' 
}) {
  const [searchQuery, setSearchQuery] = useState(query);
  const [searchResults, setSearchResults] = useState(null);
  const [enrichedResults, setEnrichedResults] = useState(null); // Full product data
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const router = useRouter();

  // Update internal query when prop changes
  useEffect(() => {
    setSearchQuery(query);
    if (isOpen && query?.trim()) {
      performSearch(query.trim());
    }
  }, [isOpen, query]);

  // Handle category changes without re-searching
  useEffect(() => {
    if (searchResults && enrichedResults) {
      // Filter existing results instead of re-searching
      filterResultsByCategory(selectedCategory);
    }
  }, [selectedCategory]);

  // Handle escape key and body scroll
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
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setEnrichedResults(null);
      return;
    }

    setSearchLoading(true);
    setSearchResults(null);
    setEnrichedResults(null);

    try {
      // Step 1: Get IDs from Leo AI
      const response = await fetch('/api/leo-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          userId,
          options: { 
            limit: 20,
            categories: ['products', 'artists', 'promoters', 'articles', 'events']
          }
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data); // Store Leo AI results with IDs
      
      // Step 2: Fetch full product data for the IDs
      await enrichSearchResults(data);
      
    } catch (err) {
      console.error('Modal search error:', err);
      setSearchResults({ error: 'Search failed. Please try again.' });
    } finally {
      setSearchLoading(false);
    }
  };

  const enrichSearchResults = async (leoResults) => {
    try {
    const enriched = {
      products: [],
      artists: [],
      promoters: [],
      articles: [],
      events: []
    };

      // Fetch product data
      if (leoResults.results?.products?.length > 0) {
        const productIds = leoResults.results.products.map(p => p.id);
        const productPromises = productIds.map(async (id) => {
          try {
            const response = await fetch(getApiUrl(`products/${id}`));
            if (response.ok) {
              const productData = await response.json();
              return { 
                ...productData, 
                leoRelevance: leoResults.results.products.find(p => p.id === id)?.relevance 
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch product ${id}:`, error);
          }
          return null;
        });
        
        const products = await Promise.all(productPromises);
        enriched.products = products.filter(p => p !== null);
      }

      // Fetch events data
      if (leoResults.results?.events?.length > 0) {
        const eventIds = leoResults.results.events.map(e => e.id);
        const eventPromises = eventIds.map(async (id) => {
          try {
            const response = await fetch(getApiUrl(`events/${id}`));
            if (response.ok) {
              const eventData = await response.json();
              return { 
                ...eventData, 
                leoRelevance: leoResults.results.events.find(e => e.id === id)?.relevance 
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch event ${id}:`, error);
          }
          return null;
        });
        
        const events = await Promise.all(eventPromises);
        enriched.events = events.filter(e => e !== null);
      }

      // Fetch artists/users data
      if (leoResults.results?.artists?.length > 0) {
        const artistIds = leoResults.results.artists.map(a => a.id);
        const artistPromises = artistIds.map(async (id) => {
          try {
            const response = await fetch(getApiUrl(`users/profile/by-id/${id}`));
            if (response.ok) {
              const artistData = await response.json();
              return { 
                ...artistData, 
                leoRelevance: leoResults.results.artists.find(a => a.id === id)?.relevance 
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch artist ${id}:`, error);
          }
          return null;
        });
        
        const artists = await Promise.all(artistPromises);
        enriched.artists = artists.filter(a => a !== null);
      }

      // Fetch promoters data
      if (leoResults.results?.promoters?.length > 0) {
        const promoterIds = leoResults.results.promoters.map(p => p.id);
        const promoterPromises = promoterIds.map(async (id) => {
          try {
            const response = await fetch(getApiUrl(`users/profile/by-id/${id}`));
            if (response.ok) {
              const promoterData = await response.json();
              return { 
                ...promoterData, 
                leoRelevance: leoResults.results.promoters.find(p => p.id === id)?.relevance 
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch promoter ${id}:`, error);
          }
          return null;
        });
        
        const promoters = await Promise.all(promoterPromises);
        enriched.promoters = promoters.filter(p => p !== null);
      }

      // Fetch articles data using the new by-id endpoint
      if (leoResults.results?.articles?.length > 0) {
        const articleIds = leoResults.results.articles.map(a => a.id);
        const articlePromises = articleIds.map(async (id) => {
          try {
            const response = await fetch(getApiUrl(`articles/by-id/${id}`));
            if (response.ok) {
              const data = await response.json();
              return { 
                ...data.article, 
                leoRelevance: leoResults.results.articles.find(a => a.id === id)?.relevance 
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch article ${id}:`, error);
          }
          return null;
        });
        
        const articles = await Promise.all(articlePromises);
        enriched.articles = articles.filter(a => a !== null);
      }

      setEnrichedResults(enriched);
    } catch (error) {
      console.error('Failed to enrich search results:', error);
    }
  };

  const filterResultsByCategory = (category) => {
    // Filter logic handled in render - this function exists for future enhancements
  };

  const handleResultClick = (resultId, resultType) => {
    // Close modal and navigate to result
    onClose();
    
    // Navigate to the appropriate page
    if (resultType === 'product') {
      router.push(`/products/${resultId}`);
    } else if (resultType === 'artist' || resultType === 'promoter') {
      router.push(`/profile/${resultId}`);
    } else if (resultType === 'article') {
      router.push(`/articles/${resultId}`);
    } else if (resultType === 'event') {
      router.push(`/events/${resultId}`);
    }
  };

  const openInNewPage = () => {
    const searchUrl = `/search?q=${encodeURIComponent(searchQuery)}&category=${selectedCategory}`;
    window.open(searchUrl, '_blank');
  };

  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    // Don't re-search, just filter existing results
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery?.trim()) {
      performSearch(searchQuery.trim());
    }
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
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
      }}
      onClick={handleOverlayClick}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '1200px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(5, 84, 116, 0.1)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e9ecef',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
        }}>
          {/* Search Input */}
          <div style={{ marginBottom: '1rem' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search products, artists, articles, events..."
                aria-label="Search products, artists, articles, and events"
                autoFocus
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: '2px solid #055474',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
              <button 
                type="submit" 
                disabled={!searchQuery?.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: searchQuery?.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  opacity: searchQuery?.trim() ? 1 : 0.6
                }}
              >
                {searchLoading ? '⏳' : '🔍'}
              </button>
            </form>
          </div>

          {/* Header with results info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {searchQuery?.trim() ? (
                <h2 style={{ margin: 0, color: '#055474', fontSize: '1.2rem' }}>
                  Results for "{searchQuery}"
                </h2>
              ) : (
                <h2 style={{ margin: 0, color: '#055474', fontSize: '1.2rem' }}>
                  Search Brakebee
                </h2>
              )}
              {searchLoading && (
                <PaintbrushLoader size="small" showText={false} />
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={openInNewPage}
              style={{
                background: 'none',
                border: '1px solid #055474',
                color: '#055474',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              See All Results
            </button>
          <button 
            onClick={onClose}
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
          {!searchQuery?.trim() ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎨</div>
              <h3 style={{ color: '#055474', marginBottom: '1rem' }}>Welcome to Leo AI Search</h3>
              <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
                Discover amazing products, talented artists, inspiring articles, and exciting events.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#999' }}>
                Start typing in the search box above to begin your discovery journey!
              </p>
            </div>
          ) : searchResults?.error ? (
            <div style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>
              {searchResults.error}
            </div>
          ) : searchResults ? (
            <div>
              {/* Products */}
              {enrichedResults?.products && enrichedResults.products.length > 0 && (selectedCategory === 'all' || selectedCategory === 'products') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#055474', margin: 0, fontSize: '1.5rem' }}>
                      Products ({enrichedResults.products.length})
                    </h3>
                    {enrichedResults.products.length >= 5 && (
                      <button
                        onClick={() => router.push(`/search?q=${encodeURIComponent(query)}&category=products`)}
                        style={{
                          background: 'none',
                          border: '1px solid #055474',
                          color: '#055474',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        See All Products
                      </button>
                    )}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '1.5rem' 
                  }}>
                    {enrichedResults.products.slice(0, 5).map(product => (
                      <div key={product.id} style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '0px',
                        padding: '1rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onClick={() => handleResultClick(product.id, 'product')}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        {product.images?.[0]?.url && (
                          <img 
                            src={getApiUrl(product.images[0].url)} 
                            alt={product.name}
                            style={{
                              width: '100%',
                              height: '200px',
                              objectFit: 'cover',
                              marginBottom: '1rem',
                              borderRadius: '4px'
                            }}
                          />
                        )}
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
              {enrichedResults?.artists && enrichedResults.artists.length > 0 && (selectedCategory === 'all' || selectedCategory === 'artists') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#055474', margin: 0, fontSize: '1.5rem' }}>
                      Artists ({enrichedResults.artists.length})
                    </h3>
                    {enrichedResults.artists.length >= 5 && (
                      <button
                        onClick={() => router.push(`/search?q=${encodeURIComponent(query)}&category=artists`)}
                        style={{
                          background: 'none',
                          border: '1px solid #055474',
                          color: '#055474',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        See All Artists
                      </button>
                    )}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '1.5rem' 
                  }}>
                    {enrichedResults.artists.slice(0, 5).map(artist => (
                      <div key={artist.id} style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '0px',
                        padding: '1rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onClick={() => handleResultClick(artist.id, 'artist')}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        {artist.profile_image_path && (
                          <img 
                            src={artist.profile_image_path} 
                            alt={artist.display_name || artist.username}
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              marginBottom: '1rem',
                              display: 'block',
                              marginLeft: 'auto',
                              marginRight: 'auto'
                            }}
                          />
                        )}
                        <h4 style={{ 
                          margin: '0 0 0.5rem 0', 
                          color: '#055474',
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          textAlign: 'center'
                        }}>
                          {artist.display_name || artist.username}
                        </h4>
                        {(artist.artist_biography || artist.bio) && (
                          <p style={{ 
                            color: '#666', 
                            fontSize: '0.9rem', 
                            margin: '0.5rem 0',
                            lineHeight: '1.4'
                          }}>
                            {(artist.artist_biography || artist.bio).substring(0, 120)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Promoters */}
              {enrichedResults?.promoters && enrichedResults.promoters.length > 0 && (selectedCategory === 'all' || selectedCategory === 'promoters') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#055474', margin: 0, fontSize: '1.5rem' }}>
                      Promoters ({enrichedResults.promoters.length})
                    </h3>
                    {enrichedResults.promoters.length >= 5 && (
                      <button
                        onClick={() => router.push(`/search?q=${encodeURIComponent(query)}&category=promoters`)}
                        style={{
                          background: 'none',
                          border: '1px solid #055474',
                          color: '#055474',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        See All Promoters
                      </button>
                    )}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '1.5rem' 
                  }}>
                    {enrichedResults.promoters.slice(0, 5).map(promoter => (
                      <div key={promoter.id} style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '0px',
                        padding: '1rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onClick={() => handleResultClick(promoter.id, 'promoter')}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        {promoter.profile_image_path && (
                          <img 
                            src={promoter.profile_image_path} 
                            alt={promoter.display_name || promoter.username}
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              marginBottom: '1rem',
                              display: 'block',
                              marginLeft: 'auto',
                              marginRight: 'auto'
                            }}
                          />
                        )}
                        <h4 style={{ 
                          margin: '0 0 0.5rem 0', 
                          color: '#055474',
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          textAlign: 'center'
                        }}>
                          {promoter.display_name || promoter.username}
                        </h4>
                        {(promoter.promoter_biography || promoter.bio) && (
                          <p style={{ 
                            color: '#666', 
                            fontSize: '0.9rem', 
                            margin: '0.5rem 0',
                            lineHeight: '1.4'
                          }}>
                            {(promoter.promoter_biography || promoter.bio).substring(0, 120)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Articles */}
              {enrichedResults?.articles && enrichedResults.articles.length > 0 && (selectedCategory === 'all' || selectedCategory === 'articles') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#055474', margin: 0, fontSize: '1.5rem' }}>
                      Articles ({enrichedResults.articles.length})
                    </h3>
                    {enrichedResults.articles.length >= 3 && (
                  <button 
                        onClick={() => router.push(`/search?q=${encodeURIComponent(query)}&category=articles`)}
                        style={{
                          background: 'none',
                          border: '1px solid #055474',
                          color: '#055474',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        See All Articles
                  </button>
                    )}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                    gap: '1.5rem' 
                  }}>
                    {enrichedResults.articles.slice(0, 3).map(article => (
                      <div key={article.id} style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '0px',
                        padding: '1rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onClick={() => handleResultClick(article.id, 'article')}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        <h4 style={{ 
                          margin: '0 0 0.5rem 0', 
                          color: '#055474',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}>
                          {article.title}
                        </h4>
                        <p style={{ 
                          color: '#666', 
                          fontSize: '0.9rem', 
                          margin: '0.5rem 0',
                          lineHeight: '1.4'
                        }}>
                          {article.excerpt || article.content?.substring(0, 150) + '...'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Events */}
              {enrichedResults?.events && enrichedResults.events.length > 0 && (selectedCategory === 'all' || selectedCategory === 'events') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#055474', margin: 0, fontSize: '1.5rem' }}>
                      Events ({enrichedResults.events.length})
                    </h3>
                    {enrichedResults.events.length >= 2 && (
                      <button
                        onClick={() => router.push(`/search?q=${encodeURIComponent(query)}&category=events`)}
                        style={{
                          background: 'none',
                          border: '1px solid #055474',
                          color: '#055474',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        See All Events
                      </button>
                    )}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                    gap: '1.5rem' 
                  }}>
                    {enrichedResults.events.slice(0, 2).map(event => (
                      <div key={event.id} style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '0px',
                        padding: '1rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onClick={() => handleResultClick(event.id, 'event')}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        <h4 style={{ 
                          margin: '0 0 0.5rem 0', 
                          color: '#055474',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}>
                          {event.name}
                        </h4>
                        <p style={{ 
                          color: '#666', 
                          fontSize: '0.9rem', 
                          margin: '0.5rem 0',
                          lineHeight: '1.4'
                        }}>
                          {event.description?.substring(0, 150) + '...'}
                        </p>
                        {event.start_date && (
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: '#055474',
                            fontWeight: '500',
                            marginTop: '0.5rem'
                          }}>
                            📅 {new Date(event.start_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchResults.results && 
               Object.values(searchResults.results).every(arr => arr.length === 0) && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
                  <h3 style={{ color: '#055474', marginBottom: '1rem' }}>No results found</h3>
                  <p>Try adjusting your search terms or browse our categories.</p>
                </div>
              )}
            </div>
          ) : searchLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <PaintbrushLoader size="large" />
            </div>
          ) : null}
        </div>
      </div>

    </div>
  );
}
