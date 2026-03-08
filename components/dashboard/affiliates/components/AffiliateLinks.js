/**
 * Affiliate Links Component
 * Generate and manage shareable affiliate links
 */
import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AffiliateLinks({ userData, affiliateData }) {
  const [links, setLinks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(null);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const response = await authApiRequest('api/affiliates/links');
      if (response.ok) {
        const data = await response.json();
        setLinks(data);
      }
    } catch (err) {
      console.error('Error loading links:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, linkType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkType);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(linkType);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">Loading your affiliate links...</div>
    );
  }

  const affiliateCode = links?.affiliate_code || affiliateData?.affiliate_code;

  return (
    <div>
      {/* Affiliate Code */}
      <div className="section-box">
        <h2>Your Affiliate Code</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
          <code style={{ 
            fontSize: '1.5em', 
            padding: '10px 20px', 
            background: 'var(--bg-secondary)', 
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            {affiliateCode}
          </code>
          <button 
            onClick={() => copyToClipboard(affiliateCode, 'code')}
            className={copiedLink === 'code' ? 'secondary' : 'secondary'}
          >
            {copiedLink === 'code' ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>

      {/* Main Links */}
      <div className="section-box">
        <h2>Quick Share Links</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
          {/* Homepage Link */}
          <div className="form-card" style={{ padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>Homepage</strong>
              <button 
                onClick={() => copyToClipboard(links?.links?.homepage || `https://brakebee.com?ref=${affiliateCode}`, 'homepage')}
                className="secondary"
                style={{ padding: '4px 12px', fontSize: '0.9em' }}
              >
                {copiedLink === 'homepage' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <code style={{ 
              display: 'block', 
              fontSize: '0.85em', 
              padding: '8px', 
              background: 'var(--bg-secondary)', 
              borderRadius: '4px',
              wordBreak: 'break-all'
            }}>
              {links?.links?.homepage || `https://brakebee.com?ref=${affiliateCode}`}
            </code>
          </div>

          {/* Shop Link */}
          <div className="form-card" style={{ padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>Shop All Products</strong>
              <button 
                onClick={() => copyToClipboard(links?.links?.shop || `https://brakebee.com/marketplace?ref=${affiliateCode}`, 'shop')}
                className="secondary"
                style={{ padding: '4px 12px', fontSize: '0.9em' }}
              >
                {copiedLink === 'shop' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <code style={{ 
              display: 'block', 
              fontSize: '0.85em', 
              padding: '8px', 
              background: 'var(--bg-secondary)', 
              borderRadius: '4px',
              wordBreak: 'break-all'
            }}>
              {links?.links?.shop || `https://brakebee.com/marketplace?ref=${affiliateCode}`}
            </code>
          </div>

          {/* Events Link */}
          <div className="form-card" style={{ padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>Events</strong>
              <button 
                onClick={() => copyToClipboard(links?.links?.events || `https://brakebee.com/events?ref=${affiliateCode}`, 'events')}
                className="secondary"
                style={{ padding: '4px 12px', fontSize: '0.9em' }}
              >
                {copiedLink === 'events' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <code style={{ 
              display: 'block', 
              fontSize: '0.85em', 
              padding: '8px', 
              background: 'var(--bg-secondary)', 
              borderRadius: '4px',
              wordBreak: 'break-all'
            }}>
              {links?.links?.events || `https://brakebee.com/events?ref=${affiliateCode}`}
            </code>
          </div>
        </div>
      </div>

      {/* Custom Link Builder */}
      <div className="section-box">
        <h2>Custom Link Builder</h2>
        <p style={{ marginTop: '10px' }}>
          Add <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '3px' }}>?ref={affiliateCode}</code> to any Brakebee URL to create your affiliate link.
        </p>
        <div style={{ marginTop: '15px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
          <strong style={{ fontSize: '0.9em' }}>Example:</strong>
          <code style={{ display: 'block', marginTop: '5px', fontSize: '0.85em', wordBreak: 'break-all' }}>
            https://brakebee.com/products/123?ref={affiliateCode}
          </code>
        </div>
      </div>

      {/* Tips */}
      <div className="section-box">
        <h2>Tips for Success</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div className="form-card" style={{ padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Share on Social</h4>
            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>
              Post your affiliate links on Instagram, TikTok, Facebook, and Twitter.
            </p>
          </div>
          <div className="form-card" style={{ padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Write Reviews</h4>
            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>
              Create blog posts or videos reviewing products you love.
            </p>
          </div>
          <div className="form-card" style={{ padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Direct Sharing</h4>
            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>
              Send links directly to friends who might be interested.
            </p>
          </div>
          <div className="form-card" style={{ padding: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Be Specific</h4>
            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>
              Link to specific products rather than just the homepage for better conversions.
            </p>
          </div>
        </div>
      </div>

      {/* Attribution Info */}
      <div className="section-box">
        <h2>How Attribution Works</h2>
        <p style={{ marginTop: '10px' }}>
          When someone clicks your link and adds a product to their cart, 
          that product is permanently attributed to you. Even if they don't 
          purchase immediately, you'll earn the commission when they complete 
          their order.
        </p>
      </div>
    </div>
  );
}
