import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchChecklistStatus, isChecklistComplete } from '../../services/checklistService';

/**
 * Protects routes from users who haven't completed their checklist
 * Redirects to checklist if requirements are not met
 */
const ChecklistGuard = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const checkRequirements = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const idToken = await user.getIdToken();
        const checklist = await fetchChecklistStatus(user.uid, idToken);
        
        // Check if all requirements are complete
        setIsComplete(isChecklistComplete(checklist));
      } catch (error) {
        console.error('Error checking requirements:', error);
        // Default to incomplete if there's an error
        setIsComplete(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkRequirements();
  }, [user]);
  
  if (loading) {
    // Could return a loading spinner here
    return <div>Loading...</div>;
  }
  
  // If requirements are not complete, redirect to checklist
  if (!isComplete) {
    return <Navigate to="/checklist" state={{ from: location }} replace />;
  }
  
  // Requirements are complete, render the protected route
  return children;
};

export default ChecklistGuard; 