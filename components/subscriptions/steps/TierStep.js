// Reusable Tier Selection Component
// Used across all subscription types

import React from 'react';

export default function TierStep({ tiers, onTierSelect, subscriptionTitle, subscriptionSubtitle }) {
  
  // Check if we should show headers (only if explicitly provided)
  const showHeader = subscriptionTitle !== '' || subscriptionSubtitle !== '';

  return (
    <div>
      {/* Header - only show if title/subtitle provided */}
      {showHeader && (
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {subscriptionTitle && <h2>{subscriptionTitle}</h2>}
          {subscriptionSubtitle && (
            <p style={{ color: '#6c757d', fontSize: '18px' }}>{subscriptionSubtitle}</p>
          )}
        </div>
      )}

      {/* Tier Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px',
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
        {tiers.map((tier, index) => (
          <div 
            key={index} 
            className="form-card"
            style={{
              position: 'relative',
              padding: '30px',
              border: tier.popular ? '2px solid var(--primary-color)' : undefined,
              boxShadow: tier.popular ? '0 8px 25px rgba(0,123,255,0.15)' : '0 2px 10px rgba(0,0,0,0.1)',
              transform: tier.popular ? 'scale(1.05)' : 'none'
            }}
          >
            {/* Popular Badge */}
            {tier.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--primary-color)',
                color: 'white',
                padding: '6px 20px',
                borderRadius: '2px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                MOST POPULAR
              </div>
            )}

            {/* Tier Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '10px', fontSize: '24px' }}>{tier.name}</h3>
              <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '20px', lineHeight: '1.4' }}>
                {tier.description}
              </p>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '36px', fontWeight: 'bold' }}>
                  {tier.priceDisplay || tier.price}
                </span>
                <span style={{ color: '#6c757d' }}>{tier.period}</span>
              </div>
            </div>

            {/* Features List */}
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
              {tier.features.map((feature, featureIndex) => (
                <li key={featureIndex} style={{ padding: '8px 0', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--secondary-color)', marginRight: '10px' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => onTierSelect(tier)}
              style={{ width: '100%', padding: '15px', fontSize: '16px' }}
            >
              {tier.buttonText || `Get Started with ${tier.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
