/**
 * Website subscription tier selection (grid + modal).
 * Uses shared websitesSubscriptionTiers and v2 API (select-tier).
 * After tier selection, parent/gate shows terms and card steps.
 */

import React, { useState } from 'react';
import { refreshAuthToken } from '../../../lib/csrf';
import { fetchAddons, selectWebsitesTier } from '../../../lib/websites/api';

const { getAllTiersForDisplay } = require('../../../lib/websites/tierConfig');
const tiers = getAllTiersForDisplay();

export default function PricingTiers({ userData, onSubscriptionSuccess }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [error, setError] = useState('');

  const handleSignupClick = (tierName) => {
    setSelectedTier(tierName);
    setSelectedAddons([]);
    setError('');
    if (['professional'].includes(tierName)) {
      fetchAddons().then((addons) => setAvailableAddons(addons || [])).catch(() => setAvailableAddons([]));
    } else {
      setAvailableAddons([]);
    }
    setShowSignupModal(true);
  };

  const handleAddonToggle = (addon) => {
    setSelectedAddons((prev) => {
      const isSelected = prev.find((a) => a.id === addon.id);
      if (isSelected) return prev.filter((a) => a.id !== addon.id);
      return [...prev, addon];
    });
  };

  const getTierPrice = (id) => {
    const t = tiers.find((x) => x.id === id);
    return t ? (typeof t.price === 'number' ? t.price : 0) : 0;
  };

  const calculateTotalPrice = () => {
    const basePrice = getTierPrice(selectedTier) || 0;
    let addonTotal = selectedAddons.reduce((sum, a) => sum + (a.monthly_price || 0), 0);
    let discount = 0;
    if (
      selectedTier &&
      ['professional'].includes(selectedTier) &&
      selectedAddons.length > 0
    ) {
      if (selectedAddons.length === 1) discount = 5;
      else if (selectedAddons.length === 2) discount = 10;
      else if (selectedAddons.length >= 3) discount = 15;
    }
    return { basePrice, addonTotal, discount, total: basePrice + addonTotal - discount };
  };

  const handleContinue = async () => {
    if (!selectedTier) return;
    setProcessing(true);
    setError('');
    try {
      const pricing = calculateTotalPrice();
      await selectWebsitesTier({
        subscription_type: 'websites',
        tier_name: selectedTier,
        tier_price: pricing.total
      });
      await refreshAuthToken();
      setShowSignupModal(false);
      setSelectedTier(null);
      if (onSubscriptionSuccess) onSubscriptionSuccess();
      else window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to save tier. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleModalClose = () => {
    setShowSignupModal(false);
    setSelectedTier(null);
    setError('');
  };

  // Display format: format price from shared config
  const displayTiers = tiers.map((t) => ({
    ...t,
    name: t.displayName,
    priceDisplay: typeof t.price === 'number' ? `$${t.price.toFixed(2)}` : '$0.00',
    period: '/month',
    buttonText: `Get ${t.displayName}`,
    popular: t.id === 'basic' // Mark basic as most popular
  }));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Choose Your Website Plan</h2>
        <p style={{ color: '#6c757d', fontSize: '18px' }}>Create beautiful artist websites with our professional tools</p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '1600px',
          margin: '0 auto',
          marginBottom: '60px'
        }}
      >
        {displayTiers.map((tier, index) => (
          <div
            key={index}
            style={{
              background: 'white',
              border: tier.popular ? '2px solid #055474' : '1px solid #dee2e6',
              borderRadius: '2px',
              padding: '30px',
              position: 'relative',
              boxShadow: tier.popular ? '0 8px 25px rgba(0,123,255,0.15)' : '0 2px 10px rgba(0,0,0,0.1)',
              transform: tier.popular ? 'scale(1.05)' : 'none'
            }}
          >
            {tier.popular && (
              <div
                style={{
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
                }}
              >
                MOST POPULAR
              </div>
            )}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '24px' }}>{tier.name}</h3>
              <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '20px', lineHeight: '1.4' }}>{tier.description}</p>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#2c3e50' }}>{tier.priceDisplay}</span>
                <span style={{ color: '#6c757d' }}>{tier.period}</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
              {tier.features.map((feature, i) => (
                <li key={i} style={{ padding: '8px 0', color: '#495057', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#3e1c56', marginRight: '10px' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSignupClick(tier.name)}
              style={{
                width: '100%',
                padding: '15px',
                background: tier.popular ? '#055474' : '#3e1c56',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {tier.buttonText || `Get Started with ${tier.name}`}
            </button>
          </div>
        ))}
      </div>

      {showSignupModal && selectedTier && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '40px', maxHeight: '90vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>Get Started with {selectedTier}</h3>
              <p style={{ color: '#6c757d' }}>
                Complete terms and payment on the next steps.
              </p>
            </div>

            {['professional'].includes(selectedTier) && availableAddons.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Select Add-ons (optional)</h4>
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '2px', border: '1px solid #dee2e6' }}>
                  {availableAddons.map((addon) => (
                    <div
                      key={addon.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedAddons.find((a) => a.id === addon.id)}
                          onChange={() => handleAddonToggle(addon)}
                          style={{ marginRight: '10px' }}
                        />
                        <strong>{addon.addon_name}</strong>
                      </label>
                      <span>${addon.monthly_price || 0}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '2px',
                marginBottom: '30px',
                border: '1px solid #dee2e6'
              }}
            >
              <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Pricing Summary</h4>
              {(() => {
                const p = calculateTotalPrice();
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>{selectedTier}</span>
                      <span>${p.basePrice}/mo</span>
                    </div>
                    {selectedAddons.map((addon) => (
                      <div
                        key={addon.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '5px',
                          fontSize: '14px',
                          color: '#6c757d'
                        }}
                      >
                        <span>+ {addon.addon_name}</span>
                        <span>${addon.monthly_price}/mo</span>
                      </div>
                    ))}
                    {p.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#28a745' }}>
                        <span>Package Discount</span>
                        <span>-${p.discount}/mo</span>
                      </div>
                    )}
                    <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Total</span>
                      <span>${p.total}/mo</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {error && <div className="error-alert" style={{ marginBottom: '15px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={handleModalClose} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={processing}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: processing ? '#ccc' : '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {processing ? 'Saving...' : 'Continue to terms & payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
