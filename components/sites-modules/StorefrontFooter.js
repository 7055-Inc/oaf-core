import React from 'react';
import { getFrontendUrl } from '../../lib/config';

export default function StorefrontFooter({ siteData }) {
  const displayName = siteData.display_name || `${siteData.first_name} ${siteData.last_name}`;

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-social">
          {siteData.social_instagram && (
            <a href={siteData.social_instagram} target="_blank" rel="noopener noreferrer" className="social-icon">Instagram</a>
          )}
          {siteData.social_facebook && (
            <a href={siteData.social_facebook} target="_blank" rel="noopener noreferrer" className="social-icon">Facebook</a>
          )}
          {siteData.social_twitter && (
            <a href={siteData.social_twitter} target="_blank" rel="noopener noreferrer" className="social-icon">Twitter</a>
          )}
          {siteData.social_pinterest && (
            <a href={siteData.social_pinterest} target="_blank" rel="noopener noreferrer" className="social-icon">Pinterest</a>
          )}
          {siteData.social_tiktok && (
            <a href={siteData.social_tiktok} target="_blank" rel="noopener noreferrer" className="social-icon">TikTok</a>
          )}
        </div>

        <div className="footer-links">
          {siteData.phone && (
            <a href={`tel:${siteData.phone}`} className="footer-link">{siteData.phone}</a>
          )}
          {siteData.business_website && (
            <a href={siteData.business_website} target="_blank" rel="noopener noreferrer" className="footer-link">Website</a>
          )}
        </div>

        {siteData.footer_text && (
          <p className="footer-text">{siteData.footer_text}</p>
        )}

        <p className="footer-text">
          &copy; {new Date().getFullYear()} {displayName}. All rights reserved.
        </p>
        <p className="footer-text">
          Powered by <a href={getFrontendUrl('/')} target="_blank" rel="noopener noreferrer" className="footer-link">Brakebee</a>
        </p>
      </div>
    </footer>
  );
}
