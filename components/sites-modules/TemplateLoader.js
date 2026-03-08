import React from 'react';
import Head from 'next/head';
import GoogleFontsLoader from './GoogleFontsLoader';

/**
 * TemplateLoader Component
 * 
 * Dynamically loads template CSS, JavaScript, and applies user customizations for artist storefronts.
 * This component makes the storefront a "shell" that can render different templates.
 * 
 * Template Structure:
 * - /templates/{slug}/styles.css (required) - Template CSS
 * - /templates/{slug}/script.js (optional) - Template JavaScript for interactive features
 * - /templates/{slug}/schema.json (optional) - Template-specific custom fields
 * 
 * @param {string} templateSlug - The slug identifier for the template (e.g., 'classic-gallery')
 * @param {object} customizations - Color and font customizations from site_customizations table
 * @param {string} customizations.primary_color - Main brand color
 * @param {string} customizations.secondary_color - Secondary brand color
 * @param {string} customizations.text_color - Main text color
 * @param {string} customizations.accent_color - Accent color
 * @param {string} customizations.background_color - Background color
 * @param {string} customizations.body_font - Body font family
 * @param {string} customizations.header_font - Header font family
 * @param {object} templateData - Template-specific customization data
 * @param {string} customCSS - Optional custom CSS (professional tier feature)
 */
export default function TemplateLoader({ templateSlug, customizations = {}, templateData = {}, customCSS = null }) {
  // Generate CSS variables for customizations
  const generateCustomizationCSS = () => {
    const vars = [];
    
    // Color customizations
    if (customizations.primary_color) {
      vars.push(`--main-color: ${customizations.primary_color};`);
    }
    if (customizations.secondary_color) {
      vars.push(`--secondary-color: ${customizations.secondary_color};`);
    }
    if (customizations.text_color) {
      vars.push(`--text-color: ${customizations.text_color};`);
    }
    if (customizations.accent_color) {
      vars.push(`--accent-color: ${customizations.accent_color};`);
    }
    if (customizations.background_color) {
      vars.push(`--background-color: ${customizations.background_color};`);
    }
    if (customizations.button_color) {
      vars.push(`--button-color: ${customizations.button_color};`);
    }
    
    // Font customizations
    if (customizations.body_font) {
      vars.push(`--body-font: ${customizations.body_font};`);
    }
    if (customizations.header_font) {
      vars.push(`--header-font: ${customizations.header_font};`);
    }
    
    // Layout and style customizations
    if (customizations.border_radius) {
      vars.push(`--border-radius: ${customizations.border_radius};`);
    }
    
    // Convert spacing scale to numeric multiplier
    if (customizations.spacing_scale) {
      const spacingMultiplier = customizations.spacing_scale === 'compact' ? '0.75' :
                               customizations.spacing_scale === 'relaxed' ? '1.25' : '1';
      vars.push(`--spacing-scale: ${spacingMultiplier};`);
    }
    
    // Template-specific customizations
    // Convert template data field keys to CSS variables
    // Example: hero_video_url → --hero-video-url
    if (templateData && typeof templateData === 'object') {
      Object.entries(templateData).forEach(([key, value]) => {
        if (value) {
          // Convert snake_case to kebab-case for CSS variables
          const cssVarName = key.replace(/_/g, '-');
          
          // For URL fields, wrap in url() if it's an image/video
          if ((key.includes('image') || key.includes('video')) && value.startsWith('http')) {
            vars.push(`--${cssVarName}: url('${value}');`);
          } else {
            // For other values, use as-is
            vars.push(`--${cssVarName}: ${value};`);
          }
        }
      });
    }
    
    // Return CSS block if we have customizations
    if (vars.length > 0) {
      return `.storefront {\n  ${vars.join('\n  ')}\n}`;
    }
    
    return '';
  };
  
  // Collect all fonts to load via Google Fonts
  const collectGoogleFonts = () => {
    const fonts = [];
    
    // Add body and header fonts
    if (customizations.body_font) fonts.push(customizations.body_font);
    if (customizations.header_font) fonts.push(customizations.header_font);
    
    // Add heading-specific fonts if they exist
    if (customizations.h1_font) fonts.push(customizations.h1_font);
    if (customizations.h2_font) fonts.push(customizations.h2_font);
    if (customizations.h3_font) fonts.push(customizations.h3_font);
    if (customizations.h4_font) fonts.push(customizations.h4_font);
    
    // Remove duplicates
    return [...new Set(fonts)];
  };
  
  // Generate the template CSS path
  const templateCSSPath = templateSlug 
    ? `/templates/${templateSlug}/styles.css` 
    : '/templates/classic-gallery/styles.css'; // Fallback to default template
  
  // Generate the template JavaScript path (optional)
  const templateJSPath = templateSlug 
    ? `/templates/${templateSlug}/script.js` 
    : null;
  
  const customizationCSS = generateCustomizationCSS();
  const googleFonts = collectGoogleFonts();
  
  return (
    <>
      {/* Load Google Fonts */}
      <GoogleFontsLoader fonts={googleFonts} />
      
      <Head>
        {/* Load template CSS */}
        <link 
          rel="stylesheet" 
          href={templateCSSPath}
          data-template={templateSlug || 'classic-gallery'}
        />
        
        {/* Load template JavaScript if it exists (optional, for interactive templates) */}
        {templateJSPath && (
          <script 
            src={templateJSPath}
            defer
            data-template-script={templateSlug}
          />
        )}
        
        {/* Inject customization CSS variables */}
        {customizationCSS && (
          <style 
            type="text/css"
            dangerouslySetInnerHTML={{ __html: customizationCSS }}
            data-customizations="true"
          />
        )}
        
        {/* Load custom CSS if present (Professional tier feature) */}
        {customCSS && (
          <style 
            type="text/css"
            dangerouslySetInnerHTML={{ __html: customCSS }}
            data-custom-css="true"
          />
        )}
      </Head>
    </>
  );
}
