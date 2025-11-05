// ChecklistController - Universal Subscription Flow Brain
// Loops through checks and shows appropriate step component

import React, { useState, useEffect } from 'react';
import { authApiRequest, handleApiResponse } from '../../lib/apiUtils';

// Step Components
import TierStep from './steps/TierStep';
import TermsStep from './steps/TermsStep';
import CardStep from './steps/CardStep';
import ApplicationStep from './steps/ApplicationStep';

export default function ChecklistController({ 
  subscriptionType,  // 'shipping_labels', 'websites', 'verified', etc
  userData,
  config            // Subscription-specific configuration
}) {
  
  const [loading, setLoading] = useState(true);
  const [checkState, setCheckState] = useState({
    tier: false,
    terms: false,
    card: false,
    application: false
  });
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Run all checks when component loads or reloadTrigger changes
  useEffect(() => {
    runChecklist();
  }, [userData, subscriptionType, reloadTrigger]);

  /**
   * THE LOOP - Run all checks in sequence
   */
  const runChecklist = async () => {
    setLoading(true);
    
    try {
      // Fetch subscription data from API
      const apiEndpoint = `api/subscriptions/${subscriptionType}/my`;
      const response = await authApiRequest(apiEndpoint);
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
        
        // Run checks based on API response
        setCheckState({
          tier: checkTier(data),
          application: checkApplication(data),
          card: checkCard(data),
          terms: checkTerms(data)
        });
      } else {
        // API failed - assume nothing is set up
        setCheckState({
          tier: false,
          application: false,
          card: false,
          terms: false
        });
      }
      
    } catch (error) {
      console.error('Error running checklist:', error);
      // On error, show tier step (start from beginning)
      setCheckState({
        tier: false,
        application: false,
        card: false,
        terms: false
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * CHECK 1: Has user selected a tier?
   */
  const checkTier = (data) => {
    // Check if subscription exists with a tier
    return data?.subscription?.tier !== null && data?.subscription?.tier !== undefined;
  };

  /**
   * CHECK 2: Is application approved?
   */
  const checkApplication = (data) => {
    // If auto-approve (config), always pass
    if (config?.autoApprove === true) {
      return true;
    }
    
    // Otherwise check application_status
    return data?.subscription?.application_status === 'approved';
  };

  /**
   * CHECK 3: Does user have valid card on file?
   */
  const checkCard = (data) => {
    // Check if subscription has valid payment method
    return data?.subscription?.cardLast4 !== null && data?.subscription?.cardLast4 !== undefined;
  };

  /**
   * CHECK 4: Has user accepted latest terms?
   */
  const checkTerms = (data) => {
    // Check if terms are accepted
    return data?.subscription?.termsAccepted === true;
  };

  /**
   * Trigger re-check after step completion
   */
  const handleStepComplete = () => {
    // Increment trigger to re-run checks
    setReloadTrigger(prev => prev + 1);
  };

  /**
   * RENDER LOGIC - Show first failed step or dashboard
   */
  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: '#6c757d'
      }}>
        <div style={{ 
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3e1c56',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '20px' }}>Loading subscription status...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // STEP 1: Check Tier
  if (!checkState.tier) {
    return (
      <TierStep 
        tiers={config.tiers}
        onTierSelect={async (tier) => {
          console.log('Tier selected:', tier);
          
          // Save tier to database via API
          try {
            const response = await authApiRequest(`api/subscriptions/${subscriptionType}/select-tier`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription_type: subscriptionType,
                tier_name: tier.name || subscriptionType,
                tier_price: typeof tier.price === 'string' ? 0 : tier.price
              })
            });
            
            const data = await handleApiResponse(response);
            
            if (data.success) {
              console.log('Tier saved:', data.action);
              // Move to next step
              handleStepComplete();
            } else {
              console.error('Failed to save tier:', data.error);
              alert('Failed to save tier selection. Please try again.');
            }
          } catch (error) {
            console.error('Error saving tier:', error);
            alert(error.message || 'Failed to save tier selection. Please try again.');
          }
        }}
        subscriptionTitle={config.displayName}
        subscriptionSubtitle={config.subtitle}
      />
    );
  }

  // STEP 2: Check Terms
  if (!checkState.terms) {
    return (
      <TermsStep 
        subscriptionType={subscriptionType}
        config={config}
        onComplete={handleStepComplete}
      />
    );
  }

  // STEP 3: Check Card (BEFORE Application)
  // Auto-skips if valid card exists, otherwise shows card setup
  if (!checkState.card) {
    return (
      <CardStep 
        subscriptionType={subscriptionType}
        config={config}
        onComplete={handleStepComplete}
      />
    );
  }

  // STEP 4: Check Application
  if (!checkState.application) {
    return (
      <ApplicationStep 
        config={config}
        subscriptionType={subscriptionType}
        onComplete={handleStepComplete}
      />
    );
  }

  // ALL CHECKS PASSED - Show Subscription Dashboard
  const DashboardComponent = config.dashboardComponent;
  
  if (DashboardComponent) {
    return (
      <DashboardComponent
        subscriptionData={subscriptionData}
        userData={userData}
        onUpdate={handleStepComplete}
      />
    );
  }
  
  // Fallback if no dashboard component specified
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
      background: '#d4edda',
      border: '2px solid #c3e6cb',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h2 style={{ color: '#155724', marginBottom: '10px' }}>
        ✓ Access Granted!
      </h2>
      <p style={{ color: '#155724' }}>
        All requirements complete. Dashboard not configured.
      </p>
    </div>
  );
}

