// Reusable Tier Selection Component
// Used across all subscription types

import React from 'react';

export default function TierStep({ tiers, onTierSelect, subscriptionTitle, subscriptionSubtitle }) {
  
  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          {subscriptionTitle || 'Choose Your Plan'}
        </h2>
        <p style={{ color: '#6c757d', fontSize: '18px' }}>
          {subscriptionSubtitle || 'Select the plan that works best for you'}
        </p>
      </div>

      {/* Tier Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px',
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
        {tiers.map((tier, index) => (
          <div key={index} style={{
            background: 'white',
            border: tier.popular ? '2px solid #055474' : '1px solid #dee2e6',
            borderRadius: '2px',
            padding: '30px',
            position: 'relative',
            boxShadow: tier.popular ? '0 8px 25px rgba(0,123,255,0.15)' : '0 2px 10px rgba(0,0,0,0.1)',
            transform: tier.popular ? 'scale(1.05)' : 'none'
          }}>
            {/* Popular Badge */}
            {tier.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#055474',
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
              <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '24px' }}>
                {tier.name}
              </h3>
              <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '20px', lineHeight: '1.4' }}>
                {tier.description}
              </p>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#2c3e50' }}>
                  {tier.priceDisplay || tier.price}
                </span>
                <span style={{ color: '#6c757d' }}>{tier.period}</span>
              </div>
            </div>

            {/* Features List */}
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              marginBottom: '30px' 
            }}>
              {tier.features.map((feature, featureIndex) => (
                <li key={featureIndex} style={{
                  padding: '8px 0',
                  color: '#495057',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#3e1c56', marginRight: '10px' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => onTierSelect(tier)}
              style={{
                width: '100%',
                padding: '15px',
                background: tier.popular ? '#055474' : '#3e1c56',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {tier.buttonText || `Get Started with ${tier.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

