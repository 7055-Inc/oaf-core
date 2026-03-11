import React from 'react';
import Head from 'next/head';
import GoogleFontsLoader from './GoogleFontsLoader';

/**
 * TemplateLoader Component
 * 
 * Dynamically loads template CSS, JavaScript, and applies user customizations for artist storefronts.
 * The storefront runs as an independent Next.js process with no global CSS, so template styles
 * have full control with no contamination.
 */
export default function TemplateLoader({ templateSlug, customizations = {}, templateData = {}, customCSS = null, hasScript = false }) {
  const generateCustomizationCSS = () => {
    const vars = [];
    
    if (customizations.primary_color) vars.push(`--main-color: ${customizations.primary_color};`);
    if (customizations.secondary_color) vars.push(`--secondary-color: ${customizations.secondary_color};`);
    if (customizations.text_color) vars.push(`--text-color: ${customizations.text_color};`);
    if (customizations.accent_color) vars.push(`--accent-color: ${customizations.accent_color};`);
    if (customizations.background_color) vars.push(`--background-color: ${customizations.background_color};`);
    if (customizations.button_color) vars.push(`--button-color: ${customizations.button_color};`);
    if (customizations.body_font) vars.push(`--body-font: ${customizations.body_font};`);
    if (customizations.header_font) vars.push(`--header-font: ${customizations.header_font};`);
    if (customizations.border_radius) vars.push(`--border-radius: ${customizations.border_radius};`);
    
    if (customizations.spacing_scale) {
      const spacingMultiplier = customizations.spacing_scale === 'compact' ? '0.75' :
                               customizations.spacing_scale === 'relaxed' ? '1.25' : '1';
      vars.push(`--spacing-scale: ${spacingMultiplier};`);
    }
    
    if (templateData && typeof templateData === 'object') {
      Object.entries(templateData).forEach(([key, value]) => {
        if (value) {
          const cssVarName = key.replace(/_/g, '-');
          if ((key.includes('image') || key.includes('video')) && value.startsWith('http')) {
            vars.push(`--${cssVarName}: url('${value}');`);
          } else {
            vars.push(`--${cssVarName}: ${value};`);
          }
        }
      });
    }
    
    if (vars.length > 0) {
      return `.storefront {\n  ${vars.join('\n  ')}\n}`;
    }
    return '';
  };
  
  const collectGoogleFonts = () => {
    const fonts = [];
    if (customizations.body_font) fonts.push(customizations.body_font);
    if (customizations.header_font) fonts.push(customizations.header_font);
    if (customizations.h1_font) fonts.push(customizations.h1_font);
    if (customizations.h2_font) fonts.push(customizations.h2_font);
    if (customizations.h3_font) fonts.push(customizations.h3_font);
    if (customizations.h4_font) fonts.push(customizations.h4_font);
    return [...new Set(fonts)];
  };
  
  const templateCSSPath = templateSlug 
    ? `/templates/${templateSlug}/styles.css` 
    : '/templates/classic-gallery/styles.css';
  
  const templateJSPath = hasScript && templateSlug
    ? `/templates/${templateSlug}/script.js`
    : null;
  
  const customizationCSS = generateCustomizationCSS();
  const googleFonts = collectGoogleFonts();

  return (
    <>
      <GoogleFontsLoader fonts={googleFonts} />
      
      <Head>
        {templateJSPath && (
          <script 
            src={templateJSPath}
            defer
            data-template-script={templateSlug}
          />
        )}
      </Head>

      <link 
        rel="stylesheet" 
        href={templateCSSPath}
        data-template={templateSlug || 'classic-gallery'}
      />
      {customizationCSS && (
        <style 
          dangerouslySetInnerHTML={{ __html: customizationCSS }}
          data-customizations="true"
        />
      )}
      {customCSS && (
        <style 
          dangerouslySetInnerHTML={{ __html: customCSS }}
          data-custom-css="true"
        />
      )}
    </>
  );
}
