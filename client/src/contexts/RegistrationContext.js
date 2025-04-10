import React, { createContext, useContext, useState, useCallback } from 'react';

const RegistrationContext = createContext();

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};

export const RegistrationProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateUserData = useCallback((field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error for the updated field
    setValidationErrors(prev => ({
      ...prev,
      [field]: undefined
    }));
  }, []);

  const setValidationError = useCallback((field, errors) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: errors
    }));
  }, []);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
    clearValidationErrors();
  }, [clearValidationErrors]);

  const value = {
    userData,
    updateUserData,
    validationErrors,
    setValidationError,
    clearValidationErrors,
    currentStep,
    setCurrentStep,
    nextStep,
    isSubmitting,
    setIsSubmitting
  };

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
}; 