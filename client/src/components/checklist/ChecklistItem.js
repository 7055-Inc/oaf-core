import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ChecklistItem.css';

/**
 * A simple checklist item component with a blue button to mark as complete
 */
const ChecklistItem = ({ itemKey, title, description, onComplete }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleContinue = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Call the onComplete callback provided by the parent
      if (onComplete) {
        console.log("Calling onComplete with:", itemKey);
        await onComplete(itemKey);
      }
    } catch (error) {
      console.error('Error updating checklist item:', error);
      setError('Failed to complete this step. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="checklist-item">
      <div className="checklist-content">
        <h2>{title}</h2>
        <p>{description}</p>
        
        {error && <div className="checklist-error">{error}</div>}
        
        <button 
          className="checklist-button"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Push to continue'}
        </button>
      </div>
    </div>
  );
};

export default ChecklistItem; 