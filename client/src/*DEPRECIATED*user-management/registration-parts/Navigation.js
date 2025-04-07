import React from 'react';
import './Navigation.css';

function Navigation({ steps, currentStep, completedSteps, onPrevStep, onNextStep, onStepClick, canNavigateToStep, onComplete }) {
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="registration-navigation">
      <div className="step-indicators">
        {steps.map((step, index) => {
          // Force step 1 to show as completed when on step 2 or beyond
          // Force step 2 to show as completed when on step 3 or beyond
          const forceCompleted = (index === 0 && currentStep >= 1) || (index === 1 && currentStep >= 2);
          const isCompleted = forceCompleted || (completedSteps && completedSteps.includes(step.id));
          const isCurrent = index === currentStep;
          const isClickable = canNavigateToStep ? canNavigateToStep(index) : (isCompleted || index === currentStep);
          
          return (
            <div 
              key={step.id}
              className={`step-indicator ${isCurrent ? 'active' : ''} ${
                isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
              onClick={() => isClickable && onStepClick && onStepClick(index)}
            >
              <div className="step-number">
                {isCompleted ? '✓' : index + 1}
              </div>
            </div>
          );
        })}
      </div>
      <div className="current-step-title">
        {steps[currentStep]?.title}
      </div>
    </div>
  );
}

export default Navigation;
