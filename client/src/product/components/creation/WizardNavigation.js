import React from 'react';
import './WizardNavigation.css';

/**
 * Component for wizard navigation controls
 * Displays buttons for next, previous, save, cancel
 * Note: Publish button is handled directly in the ReviewStep component
 */
const WizardNavigation = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSave,
  onCancel,
  onSubmit,
  isSaving,
  isSubmitting,
  isLoading,
  hasChanges,
  isLastStep
}) => {
  // Determine if previous button should be disabled
  const isPreviousDisabled = currentStep === 0 || isLoading || isSubmitting;
  
  // Determine if next button should be disabled
  const isNextDisabled = isLoading || isSaving || isSubmitting || isLastStep;
  
  // Determine if save button should be disabled
  const isSaveDisabled = isLoading || isSaving || isSubmitting;
  
  // Special case for first step (ProductType)
  const isFirstStep = currentStep === 0;
  
  // Check if we're on the Variants step (step 9, index 8)
  const isVariantsStep = currentStep === 8;
  
  // Special case for publish step (last step)
  const isPublishStep = currentStep === 9;
  
  console.log(`[DEBUG-NAV] Rendering navigation for step ${currentStep}. isFirstStep: ${isFirstStep}, isVariantsStep: ${isVariantsStep}, totalSteps: ${totalSteps}, isLastStep: ${isLastStep}`);
  
  // Determine button text based on current step
  let buttonText;
  let buttonTextForLog;
  
  if (isLoading) {
    buttonText = (
      <>
        <span className="spinner-sm"></span>
        Processing...
      </>
    );
    buttonTextForLog = "Processing...";
  } else if (isFirstStep) {
    buttonText = 'Continue';
    buttonTextForLog = "Continue";
  } else if (isVariantsStep) {
    buttonText = 'Review & Publish';
    buttonTextForLog = "Review & Publish";
  } else {
    buttonText = 'Next';
    buttonTextForLog = "Next";
  }
  
  // Use a plain text version for logging
  console.log(`[DEBUG-NAV] Button text will be: "${buttonTextForLog}"`);
  
  return (
    <div className="wizard-navigation">
      {/* Left side with Previous button */}
      <div className="navigation-left">
        {!isFirstStep && (
          <button 
            className="btn-previous" 
            onClick={onPrevious} 
            disabled={isPreviousDisabled}
          >
            Previous
          </button>
        )}
      </div>
      
      {/* Center with stacked links */}
      <div className="navigation-center">
        {!isFirstStep && (
          <div className="center-links">
            <button 
              className="link-button save-draft-link" 
              onClick={onSave} 
              disabled={isSaveDisabled}
            >
              <i className="fas fa-save"></i>
              {isSaving ? 'Saving...' : 'Save Product Draft For Later'}
            </button>
            <hr className="link-separator" />
            <button 
              className="link-button cancel-link" 
              onClick={onCancel} 
              disabled={isLoading || isSubmitting}
            >
              <i className="fas fa-times-circle"></i>
              Cancel & Delete Product Information
            </button>
          </div>
        )}
      </div>
      
      {/* Right side with Next button (hidden on last step) */}
      <div className="navigation-right">
        {!isLastStep && (
          <button 
            className="btn-next" 
            onClick={onNext} 
            disabled={isNextDisabled}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default WizardNavigation; 