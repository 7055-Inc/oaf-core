import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Step.css';

const Step7 = ({ onNext, onPrev, formData, setFormData, isFormValid, setIsFormValid }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    // Form is always valid in the final step
    setIsFormValid(true);
  }, [setIsFormValid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (onNext) {
      onNext();
    }
  };

  return (
    <div className="step-container">
      <div className="step-content">
        <h2>Registration Complete!</h2>
        <div className="completion-message">
          <div className="success-icon">✓</div>
          <p>Thank you for registering with us! Your account has been created successfully.</p>
          <p>You can now start using all the features of our platform.</p>
        </div>
        <div className="button-container">
          <button
            type="submit"
            className="next-button"
            onClick={handleSubmit}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step7; 