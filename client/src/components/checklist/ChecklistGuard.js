import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUser } from '../../users/users';
import { fetchChecklistStatus, isChecklistComplete } from '../../services/checklistService';

/**
 * Protects routes from users who haven't completed their checklist
 * Redirects to checklist if requirements are not met
 */
const ChecklistGuard = ({ children }) => {
  const { user } = useAuth();
  const { currentUser } = useUser();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  
  // Determine which user object to use (prefer the one with more data)
  const activeUser = user || currentUser;
  
  console.log('ChecklistGuard - Active user:', activeUser ? `${activeUser.uid} (${activeUser.user_type || 'no type'})` : 'null');
  
  useEffect(() => {
    const checkRequirements = async () => {
      console.log('ChecklistGuard - Checking requirements');
      if (!activeUser) {
        console.log('ChecklistGuard - No active user found');
        setLoading(false);
        return;
      }
      
      try {
        console.log('ChecklistGuard - Getting ID token for user:', activeUser.uid);
        const idToken = await activeUser.getIdToken();
        console.log('ChecklistGuard - Fetching checklist status');
        const checklist = await fetchChecklistStatus(activeUser.uid, idToken);
        console.log('ChecklistGuard - Checklist data:', checklist);
        
        // Check if all requirements are complete
        const complete = isChecklistComplete(checklist);
        console.log('ChecklistGuard - Is checklist complete?', complete);
        setIsComplete(complete);
      } catch (error) {
        console.error('ChecklistGuard - Error checking requirements:', error);
        // Default to incomplete if there's an error
        setIsComplete(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkRequirements();
  }, [activeUser]);
  
  if (loading) {
    console.log('ChecklistGuard - Still loading checklist data');
    return <div>Loading...</div>;
  }
  
  // If requirements are not complete, redirect to checklist
  if (!isComplete) {
    console.log('ChecklistGuard - Checklist not complete, redirecting to /checklist');
    return <Navigate to="/checklist" state={{ from: location }} replace />;
  }
  
  console.log('ChecklistGuard - All checks passed, rendering children');
  // Requirements are complete, render the protected route
  return children;
};

export default ChecklistGuard; 