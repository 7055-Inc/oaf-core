import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { registrationService } from '../../services/registrationService';
import RegistrationTimeline from './RegistrationTimeline';
import './registration.css';

const Registration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    displayName: ''
  });

  const steps = [
    { id: 'email', label: 'Email', type: 'email', readOnly: true },
    { id: 'firstName', label: 'First Name', type: 'text' },
    { id: 'lastName', label: 'Last Name', type: 'text' },
    { id: 'displayName', label: 'Display Name', type: 'text' }
  ];

  useEffect(() => {
    // Start tracking registration progress
    registrationService.startProgressTracking((lastCompletedField) => {
      const stepIndex = steps.findIndex(step => step.id === lastCompletedField);
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex + 1);
      }
    });

    // Watch for user status changes
    const checkUserStatus = async () => {
      if (user) {
        try {
          const userStatus = await registrationService.getUserStatus();
          if (userStatus?.status === 'active') {
            navigate('/checklist');
          }
        } catch (error) {
          console.error('Error checking user status:', error);
        }
      }
    };

    // Check status periodically
    const statusCheckInterval = setInterval(checkUserStatus, 2000);
    checkUserStatus(); // Initial check

    return () => {
      registrationService.stopProgressTracking();
      clearInterval(statusCheckInterval);
    };
  }, [user, navigate]);

  const handleFieldSubmit = async (fieldId, value) => {
    try {
      await registrationService.submitField(fieldId, value);
      setUserData(prev => ({ ...prev, [fieldId]: value }));
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        navigate('/registration/review');
      }
    } catch (error) {
      console.error('Error submitting field:', error);
      // Error handling will be done in the RegistrationTimeline component
    }
  };

  return (
    <div className="registration-container">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${((currentStep + 1) / steps.length) * 100}%`,
            background: `linear-gradient(to right, #055474, #3e1c56)`
          }}
        />
      </div>
      
      <RegistrationTimeline
        steps={steps}
        currentStep={currentStep}
        userData={userData}
        onSubmit={handleFieldSubmit}
      />
    </div>
  );
};

export default Registration; 