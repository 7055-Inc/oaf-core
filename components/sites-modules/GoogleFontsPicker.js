import React, { useState, useEffect, useRef } from 'react';

/**
 * GoogleFontsPicker Component
 * 
 * A searchable font picker that integrates with Google Fonts API.
 * Falls back to a curated popular fonts list if API key is unavailable.
 * 
 * Features:
 * - Fetches all available Google Fonts (1400+) from API
 * - Searchable/filterable dropdown
 * - Live preview of fonts
 * - Displays font category metadata
 * - Caches font list to minimize API calls
 * - Sorts by popularity
 * 
 * @param {string} value - Current selected font name
 * @param {function} onChange - Callback when font is selected
 * @param {string} label - Label for the input field
 */

// Fallback list of 50 popular Google Fonts (used if API key unavailable)
const POPULAR_FONTS_FALLBACK = [
  { family: 'Inter', category: 'sans-serif' },
  { family: 'Roboto', category: 'sans-serif' },
  { family: 'Open Sans', category: 'sans-serif' },
  { family: 'Lato', category: 'sans-serif' },
  { family: 'Montserrat', category: 'sans-serif' },
  { family: 'Poppins', category: 'sans-serif' },
  { family: 'Raleway', category: 'sans-serif' },
  { family: 'Playfair Display', category: 'serif' },
  { family: 'Merriweather', category: 'serif' },
  { family: 'Nunito', category: 'sans-serif' },
  { family: 'PT Sans', category: 'sans-serif' },
  { family: 'Ubuntu', category: 'sans-serif' },
  { family: 'Crimson Text', category: 'serif' },
  { family: 'Libre Baskerville', category: 'serif' },
  { family: 'Josefin Sans', category: 'sans-serif' },
  { family: 'Source Sans Pro', category: 'sans-serif' },
  { family: 'Oswald', category: 'sans-serif' },
  { family: 'Roboto Condensed', category: 'sans-serif' },
  { family: 'Slabo 27px', category: 'serif' },
  { family: 'PT Serif', category: 'serif' },
  { family: 'Noto Sans', category: 'sans-serif' },
  { family: 'Work Sans', category: 'sans-serif' },
  { family: 'Quicksand', category: 'sans-serif' },
  { family: 'Roboto Slab', category: 'serif' },
  { family: 'Lora', category: 'serif' },
  { family: 'Rubik', category: 'sans-serif' },
  { family: 'Cabin', category: 'sans-serif' },
  { family: 'Hind', category: 'sans-serif' },
  { family: 'Arimo', category: 'sans-serif' },
  { family: 'Noto Serif', category: 'serif' },
  { family: 'Bitter', category: 'serif' },
  { family: 'Fira Sans', category: 'sans-serif' },
  { family: 'Anton', category: 'sans-serif' },
  { family: 'Karla', category: 'sans-serif' },
  { family: 'Mukta', category: 'sans-serif' },
  { family: 'Barlow', category: 'sans-serif' },
  { family: 'DM Sans', category: 'sans-serif' },
  { family: 'Bebas Neue', category: 'display' },
  { family: 'EB Garamond', category: 'serif' },
  { family: 'Oxygen', category: 'sans-serif' },
  { family: 'Arvo', category: 'serif' },
  { family: 'Dancing Script', category: 'handwriting' },
  { family: 'Abril Fatface', category: 'display' },
  { family: 'Pacifico', category: 'handwriting' },
  { family: 'Lobster', category: 'display' },
  { family: 'Cinzel', category: 'serif' },
  { family: 'Great Vibes', category: 'handwriting' },
  { family: 'Comfortaa', category: 'display' },
  { family: 'Righteous', category: 'display' },
  { family: 'Russo One', category: 'sans-serif' }
];

// Cache key for localStorage
const CACHE_KEY = 'google_fonts_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export default function GoogleFontsPicker({ value, onChange, label = 'Select Font' }) {
  const [fonts, setFonts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load fonts on component mount
  useEffect(() => {
    loadFonts();
    
    // Load Google Fonts CSS for preview (load popular fonts)
    if (!document.getElementById('google-fonts-preview')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-preview';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter&family=Roboto&family=Open+Sans&family=Lato&family=Montserrat&family=Poppins&family=Raleway&family=Playfair+Display&family=Merriweather&family=Nunito&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Load fonts from cache or API
   */
  const loadFonts = async () => {
    try {
      // Try to load from cache first
      const cached = loadFromCache();
      if (cached) {
        setFonts(cached.fonts);
        setUsingFallback(cached.usingFallback);
        setLoading(false);
        return;
      }

      // Try to fetch from API
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY;
      
      if (apiKey) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`
          );
          
          if (response.ok) {
            const data = await response.json();
            const fontList = data.items.map(font => ({
              family: font.family,
              category: font.category
            }));
            
            setFonts(fontList);
            setUsingFallback(false);
            saveToCache(fontList, false);
            setLoading(false);
            return;
          }
        } catch (apiError) {
          console.warn('Google Fonts API request failed, using fallback list:', apiError);
        }
      }

      // Use fallback if API key unavailable or request failed
      setFonts(POPULAR_FONTS_FALLBACK);
      setUsingFallback(true);
      saveToCache(POPULAR_FONTS_FALLBACK, true);
      setLoading(false);
    } catch (error) {
      console.error('Error loading fonts:', error);
      setFonts(POPULAR_FONTS_FALLBACK);
      setUsingFallback(true);
      setLoading(false);
    }
  };

  /**
   * Load fonts from localStorage cache
   */
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (data.timestamp && (now - data.timestamp < CACHE_DURATION)) {
        return {
          fonts: data.fonts,
          usingFallback: data.usingFallback
        };
      }

      // Cache expired
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  };

  /**
   * Save fonts to localStorage cache
   */
  const saveToCache = (fontList, isFallback) => {
    try {
      const data = {
        fonts: fontList,
        usingFallback: isFallback,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  /**
   * Filter fonts based on search term
   */
  const filteredFonts = fonts.filter(font => 
    font.family.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Handle font selection
   */
  const handleSelect = (font) => {
    onChange(font.family);
    setShowDropdown(false);
    setSearchTerm('');
    
    // Dynamically load selected font for preview
    loadFontForPreview(font.family);
  };

  /**
   * Load a specific font for preview
   */
  const loadFontForPreview = (fontFamily) => {
    const fontId = `google-font-${fontFamily.replace(/\s+/g, '-')}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  };

  /**
   * Get category badge color
   */
  const getCategoryColor = (category) => {
    const colors = {
      'sans-serif': '#3498db',
      'serif': '#e74c3c',
      'display': '#9b59b6',
      'handwriting': '#f39c12',
      'monospace': '#2ecc71'
    };
    return colors[category] || '#95a5a6';
  };

  return (
    <div style={{ position: 'relative', marginBottom: '15px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '5px', 
        color: '#495057', 
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {label}
        {usingFallback && (
          <span style={{ 
            marginLeft: '8px', 
            fontSize: '11px', 
            color: '#6c757d',
            fontWeight: 'normal'
          }}>
            (Top 50 fonts)
          </span>
        )}
      </label>

      <div style={{ position: 'relative' }} ref={inputRef}>
        <input
          type="text"
          value={showDropdown ? searchTerm : (value || '')}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={loading ? 'Loading fonts...' : 'Search Google Fonts...'}
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #ced4da',
            borderRadius: '2px',
            fontSize: '14px',
            background: loading ? '#f8f9fa' : 'white',
            cursor: loading ? 'not-allowed' : 'text'
          }}
        />

        {showDropdown && !loading && (
          <div 
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '1px solid #ced4da',
              borderTop: 'none',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {filteredFonts.length > 0 ? (
              filteredFonts.slice(0, 100).map(font => (
                <div
                  key={font.family}
                  onClick={() => handleSelect(font)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    background: value === font.family ? '#f8f9fa' : 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (value !== font.family) {
                      e.currentTarget.style.background = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== font.family) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <span style={{ 
                    fontFamily: font.family,
                    fontSize: '14px',
                    flex: 1
                  }}>
                    {font.family}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: getCategoryColor(font.category),
                    color: 'white',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    {font.category}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ 
                padding: '15px', 
                textAlign: 'center', 
                color: '#6c757d',
                fontSize: '14px'
              }}>
                No fonts found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Font Preview */}
      {value && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px',
          background: '#f8f9fa',
          borderRadius: '2px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: '#6c757d',
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            Preview:
          </div>
          <div style={{ 
            fontFamily: value,
            fontSize: '14px',
            color: '#495057',
            lineHeight: '1.5'
          }}>
            The quick brown fox jumps over the lazy dog
          </div>
        </div>
      )}
    </div>
  );
}
