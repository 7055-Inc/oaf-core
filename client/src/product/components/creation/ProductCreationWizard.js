import React, { useContext, useEffect, useState } from 'react';
import { ProductCreationContext } from '../../contexts/ProductCreationContext';
import useProductCreate from '../../hooks/useProductCreate';
import WizardNavigation from './WizardNavigation';
import WizardProgress from './WizardProgress';
import Login from '../../../user-management/Login';

// Import all step components
import ProductTypeStep from './steps/ProductTypeStep';
import BasicInfoStep from './steps/BasicInfoStep';
import DescriptionStep from './steps/DescriptionStep';
import CategoriesStep from './steps/CategoriesStep';
import PricingStep from './steps/PricingStep';
import InventoryStep from './steps/InventoryStep';
import ShippingStep from './steps/ShippingStep';
import MediaStep from './steps/MediaStep';
import VariationsStep from './steps/VariationsStep';
import ReviewStep from './steps/ReviewStep';

import './ProductCreationWizard.css';

/**
 * Main container component for the product creation wizard
 * Manages rendering the appropriate step component based on context state
 */
const ProductCreationWizard = ({ onComplete, onCancel, initialDraftId }) => {
  const { 
    currentStep, 
    steps, 
    draftId, 
    isLoading, 
    hasChanges,
    errorMessage,
    clearErrorMessage,
    validateCurrentStep,
    nextStep,
    prevStep,
    productData,
    setErrorMessage
  } = useContext(ProductCreationContext);
  
  const { 
    initializeDraft, 
    loadDraft, 
    saveDraft, 
    submitProduct, 
    cancelDraft, 
    isSaving, 
    isSubmitting 
  } = useProductCreate();
  
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const [initializationError, setInitializationError] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Force a re-render by updating a timestamp
  const [renderTimestamp, setRenderTimestamp] = useState(Date.now());
  
  // Force a re-render when step changes
  useEffect(() => {
    console.log(`Step changed to ${currentStep}. Forcing re-render.`);
    setRenderTimestamp(Date.now());
  }, [currentStep]);
  
  // This is a separate useEffect to respond to step changes and ensure the component refreshes
  useEffect(() => {
    // Get the current step title for logging
    const currentStepTitle = steps[currentStep]?.title || 'Unknown';
    console.log(`Current step is ${currentStep}: ${currentStepTitle}`);
    
    // Optional: Scroll to top when step changes
    window.scrollTo(0, 0);
  }, [currentStep, steps]);
  
  // Initialize the wizard - either load existing draft or create a new one
  useEffect(() => {
    const setup = async () => {
      try {
        if (initialDraftId) {
          await loadDraft(initialDraftId);
        } else if (!draftId && initAttempts < 2) {
          await initializeDraft();
        }
      } catch (error) {
        console.error('Wizard initialization failed:', error);
        if (error.response && error.response.status === 401) {
          setIsLoggedIn(false);
          setShowLoginModal(true);
        } else {
          setInitializationError(true);
        }
        
        // Increment attempts to prevent endless retries
        setInitAttempts(prev => prev + 1);
      }
    };
    
    setup();
  }, [initialDraftId, draftId, initAttempts, initializeDraft, loadDraft]);
  
  // Retry initialization if it failed
  const handleRetryInit = async () => {
    setInitializationError(false);
    try {
      await initializeDraft();
    } catch (error) {
      console.error('Retry initialization failed:', error);
      setInitializationError(true);
    }
  };
  
  // Save draft when user navigates to next step
  const handleNextStep = async () => {
    console.log(`Attempting to go from step ${currentStep} to next step`);
    
    if (validateCurrentStep()) {
      try {
        // Always ensure product is in draft status before saving during wizard navigation
        if (productData && productData.status !== 'draft') {
          console.log('Ensuring product remains in draft status during wizard navigation');
          productData.status = 'draft';
        }
        
        await saveDraft();
        console.log('Draft saved successfully, now advancing to next step');
        
        // Call the nextStep function to advance
        const result = nextStep();
        
        // If nextStep returns false, it means we couldn't advance (e.g., already at last step)
        if (!result) {
          console.warn('Failed to advance to next step');
        } else {
          console.log(`Successfully advanced to step ${currentStep}`);
        }
      } catch (error) {
        console.error('Failed to save and proceed:', error);
        
        // Check if this is a known API error with a message
        if (error.error) {
          // If it's an API error object with an error message
          setErrorMessage(error.error);
        } else if (error.message) {
          // If it's a JavaScript Error object
          setErrorMessage(error.message);
        } else {
          // Generic fallback message
          setErrorMessage('Failed to save draft: Database operation failed');
        }
      }
    }
  };
  
  // Save current progress
  const handleSave = async () => {
    try {
      // Always ensure product is in draft status when manually saving
      if (productData && productData.status !== 'draft') {
        console.log('Ensuring product remains in draft status during manual save');
        productData.status = 'draft';
      }
      
      await saveDraft();
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 3000);
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Show error message only if it's not about status - we handle that silently
      if (!(error.message && error.message.toLowerCase().includes('status'))) {
        setErrorMessage(`Failed to save draft: ${error.message || 'Unknown error'}`);
      }
    }
  };
  
  // Submit finalized product
  const handleSubmit = async () => {
    if (validateCurrentStep()) {
      try {
        const product = await submitProduct();
        
        if (product) {
          console.log('Product submitted successfully:', product);
          
          if (onComplete) {
            onComplete(product);
          }
        } else {
          // Handle case where product is undefined but no error was thrown
          console.warn('Product submission returned undefined, but no error was thrown');
          setErrorMessage('Product submission was incomplete. Your product might be in draft state.');
        }
      } catch (error) {
        console.error('Failed to submit product:', error);
        
        // Create a user-friendly error message
        let userMessage = 'Failed to publish product.';
        
        if (error.message && error.message.includes('404')) {
          userMessage += ' The server endpoint is not available, but your product data was saved.';
        } else if (error.message) {
          userMessage += ` ${error.message}`;
        }
        
        setErrorMessage(userMessage);
      }
    }
  };
  
  // Cancel and clean up
  const handleCancel = async () => {
    try {
      await cancelDraft();
      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error('Failed to cancel draft:', error);
    }
  };
  
  // Get the current step component to render
  const getCurrentStepComponent = () => {
    const stepComponents = {
      0: <ProductTypeStep />,
      1: <BasicInfoStep />,
      2: <DescriptionStep />,
      3: <CategoriesStep />,
      4: <PricingStep />,
      5: <InventoryStep />,
      6: <ShippingStep />,
      7: <MediaStep />,
      8: <VariationsStep />,
      9: <ReviewStep onSubmit={handleSubmit} />
    };
    
    console.log(`[Wizard] Rendering step ${currentStep}: ${steps[currentStep]?.title}`);
    return stepComponents[currentStep] || <div>Unknown step</div>;
  };
  
  // Check if current step is the last one
  const isLastStep = currentStep === steps.length - 1;
  
  // If user is not logged in, show login form
  if (!isLoggedIn && showLoginModal) {
    return (
      <div className="product-wizard-unauthorized">
        <div className="unauthorized-content">
          <h2>Login Required</h2>
          <p>You need to be logged in to create a product. Please log in to continue.</p>
          <Login 
            setIsLoggedIn={setIsLoggedIn} 
            setIsModalOpen={setShowLoginModal}
            onSuccess={() => {
              setIsLoggedIn(true);
              setShowLoginModal(false);
              handleRetryInit();
            }}
          />
        </div>
      </div>
    );
  }
  
  // If still initializing, show loading state
  if (isLoading && !draftId && !initializationError) {
    return (
      <div className="product-wizard-loading">
        <div className="spinner"></div>
        <p>Initializing product creation...</p>
      </div>
    );
  }
  
  // If initialization error occurred, show retry option
  if (initializationError) {
    return (
      <div className="product-wizard-loading">
        <div className="error-icon">⚠️</div>
        <h3>Database Connection Error</h3>
        <p>
          We couldn't initialize a new product due to a database issue. This might be caused by:
        </p>
        <ul style={{ textAlign: 'left', marginBottom: '20px' }}>
          <li>Temporary server maintenance</li>
          <li>Database connectivity issues</li>
          <li>High server load</li>
        </ul>
        <div style={{ marginBottom: '20px' }}>
          <p><strong>What you can do:</strong></p>
          <ol style={{ textAlign: 'left' }}>
            <li>Wait a few minutes and try again</li>
            <li>Refresh the page</li>
            <li>Check if you're logged in correctly</li>
            <li>Contact support if the problem persists</li>
          </ol>
        </div>
        <button 
          className="btn-retry"
          onClick={handleRetryInit}
        >
          Try Again
        </button>
        <button 
          className="btn-cancel"
          onClick={onCancel}
          style={{ marginTop: '10px' }}
        >
          Cancel
        </button>
      </div>
    );
  }
  
  return (
    <div className="product-creation-wizard">
      {/* Removing Product ID display since it's now in each step 
      {draftId && (
        <div className="product-id-display">
          Product ID: {draftId}
        </div>
      )}
      */}
      
      {/* Wizard header with progress indicator */}
      <div className="wizard-header">
        <WizardProgress 
          steps={steps} 
          currentStep={currentStep} 
        />
      </div>
      
      {/* Error message display */}
      {errorMessage && (
        <div className="wizard-error-message">
          <p>{errorMessage}</p>
          <button onClick={clearErrorMessage} className="close-error">×</button>
        </div>
      )}
      
      {/* Saved confirmation message */}
      {showSavedMessage && (
        <div className="wizard-saved-message">
          <p>Progress saved successfully!</p>
        </div>
      )}
      
      {/* Main content area for the current step */}
      <div className="wizard-content">
        {getCurrentStepComponent()}
      </div>
      
      {/* Navigation controls */}
      <WizardNavigation 
        currentStep={currentStep}
        totalSteps={steps.length}
        onPrevious={prevStep}
        onNext={handleNextStep}
        onSave={handleSave}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
        isLoading={isLoading}
        hasChanges={hasChanges}
        isLastStep={isLastStep}
      />
    </div>
  );
};

export default ProductCreationWizard; 