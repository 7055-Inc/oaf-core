import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getSubdomainBase } from '../../lib/config';
import TemplateLoader from '../../components/sites-modules/TemplateLoader';

const ArtistAbout = ({
  initialSiteData,
  initialSubdomain,
  hasTemplateScript,
  ssrError
}) => {
  const siteData = initialSiteData;
  const subdomain = initialSubdomain;

  const subdomainBase = getSubdomainBase();
  const siteUrl = siteData?.custom_domain
    ? `https://${siteData.custom_domain}`
    : `https://${subdomain}.${subdomainBase}`;

  if (ssrError || !siteData) {
    return (
      <div className="error">
        <h1>Page Not Found</h1>
        <p>Sorry, this page is not available.</p>
      </div>
    );
  }

  const templateCustomizations = {
    primary_color: siteData.primary_color,
    secondary_color: siteData.secondary_color,
    text_color: siteData.text_color,
    body_font: siteData.body_font,
    header_font: siteData.header_font,
  };

  const getCustomStyles = () => ({
    '--text-color': siteData.text_color,
    '--main-color': siteData.primary_color,
    '--secondary-color': siteData.secondary_color,
  });

  const displayName = siteData.business_name || siteData.display_name || `${siteData.first_name} ${siteData.last_name}`;
  const pageTitle = `About - ${displayName}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={siteData.bio || `Learn more about ${displayName}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${siteUrl}/about`} />
      </Head>

      <TemplateLoader
        templateSlug={siteData.template_slug || 'classic-gallery'}
        customizations={templateCustomizations}
        templateData={siteData.template_data || {}}
        customCSS={siteData.custom_css}
        hasScript={hasTemplateScript}
      />

      <div className="storefront" style={getCustomStyles()}>
        <header className="site-header">
          <div className="header-container">
            {siteData.logo_path ? (
              <Link href={siteUrl} className="site-logo">
                <img src={siteData.logo_path} alt="Logo" style={{ maxHeight: '48px', width: 'auto', display: 'block' }} />
              </Link>
            ) : (
              <Link href={siteUrl} className="site-logo">{displayName}</Link>
            )}
            <nav className="site-nav">
              <Link href={siteUrl} className="nav-link">Home</Link>
              <Link href={`${siteUrl}/products`} className="nav-link">Gallery</Link>
              <Link href={`${siteUrl}/about`} className="nav-link active">About</Link>
            </nav>
          </div>
        </header>

        <section className="about-section">
          <h2 className="section-title about-title">About {displayName}</h2>

          {(siteData.bio || siteData.artist_biography) && (
            <p className="about-text">{siteData.artist_biography || siteData.bio}</p>
          )}

          {siteData.does_custom === 'yes' && (
            <>
              <h3 className="section-title">Custom Commissions</h3>
              <p className="about-text">{siteData.custom_details || 'Available for custom work. Get in touch!'}</p>
            </>
          )}

          <div style={{ marginTop: '2rem' }}>
            <Link href={`${siteUrl}/products`} className="hero-cta">View Gallery</Link>
          </div>
        </section>

        <footer className="site-footer">
          <div className="footer-container">
            <div className="footer-social">
              {siteData.social_instagram && <a href={siteData.social_instagram} target="_blank" rel="noopener noreferrer" className="social-icon">Instagram</a>}
              {siteData.social_facebook && <a href={siteData.social_facebook} target="_blank" rel="noopener noreferrer" className="social-icon">Facebook</a>}
              {siteData.social_twitter && <a href={siteData.social_twitter} target="_blank" rel="noopener noreferrer" className="social-icon">Twitter</a>}
            </div>
            <p className="footer-text">
              &copy; {new Date().getFullYear()} {displayName}. All rights reserved.
            </p>
            <p className="footer-text">
              Powered by <a href="https://brakebee.com" target="_blank" rel="noopener noreferrer" className="footer-link">Brakebee</a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export async function getServerSideProps(context) {
  const fs = require('fs');
  const path = require('path');
  const { subdomain } = context.query;
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com';

  if (!subdomain) {
    return { props: { ssrError: 'No subdomain specified' } };
  }

  try {
    const siteResponse = await fetch(`${apiUrl}/api/v2/websites/resolve/${subdomain}`);
    if (!siteResponse.ok) {
      return { props: { ssrError: 'Site not found', initialSubdomain: subdomain } };
    }
    let siteData = await siteResponse.json();

    const profileResponse = await fetch(`${apiUrl}/api/v2/users/${siteData.user_id}`);
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      const profileData = profileResult.data || profileResult;
      const customizationKeys = ['primary_color', 'secondary_color', 'text_color', 'accent_color', 'background_color'];
      const fromResolve = {};
      customizationKeys.forEach(k => { if (siteData[k] != null) fromResolve[k] = siteData[k]; });
      const siteId = siteData.id;
      siteData = { ...siteData, ...profileData, ...fromResolve, id: siteId };
    }

    const templateSlug = siteData.template_slug || 'classic-gallery';
    const hasTemplateScript = fs.existsSync(
      path.join(process.cwd(), 'public', 'templates', templateSlug, 'script.js')
    );

    const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

    return {
      props: sanitize({
        initialSiteData: siteData,
        initialSubdomain: subdomain,
        hasTemplateScript,
      })
    };
  } catch (err) {
    console.error('SSR error:', err.message);
    return { props: { ssrError: 'Failed to load', initialSubdomain: subdomain } };
  }
}

export default ArtistAbout;
