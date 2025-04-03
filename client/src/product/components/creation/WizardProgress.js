import React, { useEffect, useRef } from 'react';
import './WizardProgress.css';

/**
 * Component for displaying wizard progress
 * Shows a visual indicator of completed, current, and future steps
 */
const WizardProgress = ({ steps, currentStep }) => {
  const progressRef = useRef(null);
  
  // Calculate and apply the completion percentage as a CSS variable
  useEffect(() => {
    if (progressRef.current && steps.length > 1) {
      // Calculate the percentage of steps completed (position currentStep in the range)
      const completion = currentStep / (steps.length - 1);
      progressRef.current.style.setProperty('--completion-percent', completion);
    }
  }, [currentStep, steps.length]);
  
  return (
    <div className="wizard-progress-container">
      <div className="wizard-progress" ref={progressRef}>
        {steps.map((step, index) => {
          // Determine status based on currentStep
          const status = index < currentStep ? 'completed' : 
                  index === currentStep ? 'current' : 'upcoming';
          
          return (
            <div 
              key={index} 
              className={`progress-step ${status}`}
              data-step-name={step.title}
            >
              <div className="step-indicator">
                {status === 'completed' ? (
                  <span className="check-mark">✓</span>
                ) : (
                  index + 1
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Display current step name below the progress indicators */}
      <div className="current-step-name">
        {steps[currentStep]?.title}
      </div>
    </div>
  );
};

export default WizardProgress; 