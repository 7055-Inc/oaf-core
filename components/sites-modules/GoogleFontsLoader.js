import Head from 'next/head';

/**
 * GoogleFontsLoader Component
 * 
 * Dynamically loads Google Fonts for use in artist storefronts.
 * Uses Next.js Head component to inject Google Fonts links with preconnect for performance.
 * 
 * Features:
 * - Accepts array of font family names
 * - Builds proper Google Fonts API URL with all requested fonts
 * - Adds preconnect links for performance optimization
 * - Filters out system fonts and null values
 * - Returns null if no valid fonts provided
 * 
 * @param {string[]} fonts - Array of font family names to load (e.g., ['Inter', 'Playfair Display'])
 * @returns {JSX.Element|null} Head component with font links or null
 * 
 * @example
 * <GoogleFontsLoader fonts={['Inter', 'Montserrat', 'Playfair Display']} />
 */
export default function GoogleFontsLoader({ fonts = [] }) {
  // Return null if no fonts provided
  if (!fonts || fonts.length === 0) {
    return null;
  }

  // System fonts that shouldn't be loaded from Google Fonts
  const systemFonts = [
    'system-ui',
    'sans-serif',
    'serif',
    'monospace',
    'Georgia',
    'Times New Roman',
    'Arial',
    'Helvetica',
    'Verdana',
    'Courier New',
    'cursive',
    'fantasy'
  ];

  /**
   * Filter out system fonts and invalid values
   */
  const validFonts = fonts
    .filter(font => {
      // Filter out null, undefined, empty strings
      if (!font || !font.trim()) return false;
      
      // Filter out system fonts
      const fontLower = font.toLowerCase();
      return !systemFonts.some(sysFont => fontLower.includes(sysFont.toLowerCase()));
    });

  // Return null if no valid fonts after filtering
  if (validFonts.length === 0) {
    return null;
  }

  /**
   * Build Google Fonts URL
   * Format: https://fonts.googleapis.com/css2?family=Font+One&family=Font+Two&display=swap
   */
  const fontFamilies = validFonts
    .map(font => font.trim().replace(/\s+/g, '+'))
    .map(font => `family=${font}`)
    .join('&');

  const fontsUrl = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;

  return (
    <Head>
      {/* Preconnect to Google Fonts domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link 
        rel="preconnect" 
        href="https://fonts.gstatic.com" 
        crossOrigin="anonymous" 
      />
      
      {/* Load the actual fonts */}
      <link 
        href={fontsUrl} 
        rel="stylesheet"
        data-google-fonts="true"
      />
    </Head>
  );
}
