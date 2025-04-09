import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  fetchChecklistStatus, 
  getNextIncompleteItem, 
  getRedirectForItem, 
  isChecklistComplete,
  updateChecklistItem,
  checkOrCreateUser
} from '../../services/checklistService';
import ChecklistItem from './ChecklistItem';
import './Checklist.css';

/**
 * Checklist component that processes the user's requirements
 */
const Checklist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checklist, setChecklist] = useState({});
  const [currentItem, setCurrentItem] = useState(null);
  
  // Define the checklist item details
  const itemDetails = {
    isUser: {
      title: 'Verify User Account',
      description: 'Checking your account status...'
    },
    registration: {
      title: 'Complete Registration',
      description: 'Please complete your registration to continue. Click the button below to mark this step as complete.'
    },
    termsAccepted: {
      title: 'Accept Terms & Conditions',
      description: 'Please review and accept our terms and conditions to continue. Click the button below to mark this step as complete.'
    },
    profileComplete: {
      title: 'Complete Your Profile',
      description: 'Please complete your profile information to continue. Click the button below to mark this step as complete.'
    },
    emailVerified: {
      title: 'Verify Your Email',
      description: 'Please verify your email address to continue. Click the button below to mark this step as complete.'
    }
  };
  
  // Fetch the user's checklist status
  useEffect(() => {
    const loadChecklist = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const idToken = await user.getIdToken();
        const decodedToken = await user.getIdTokenResult();
        const sub = decodedToken.claims.sub;

        // First check/create user
        console.log("Checking/creating user...");
        await checkOrCreateUser(sub, idToken);
        console.log("User check/create completed");

        // Then fetch checklist
        console.log("Fetching checklist...");
        const checklistData = await fetchChecklistStatus(sub, idToken);
        
        console.log("Fetched checklist data:", checklistData);
        setChecklist(checklistData);
        
        // Get the next incomplete item
        const nextItem = getNextIncompleteItem(checklistData);
        console.log("Next incomplete item:", nextItem);
        
        if (nextItem) {
          setCurrentItem(nextItem);
        } else if (isChecklistComplete(checklistData)) {
          // All items complete, redirect to dashboard
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error loading checklist:', error);
        setError('Failed to load your requirements. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadChecklist();
  }, [user, navigate]);
  
  // Handle completion of a checklist item
  const handleItemComplete = async (itemKey) => {
    console.log("handleItemComplete called with:", itemKey);
    try {
      // Mark the item as complete
      const idToken = await user.getIdToken();
      const decodedToken = await user.getIdTokenResult();
      const sub = decodedToken.claims.sub;
      
      console.log("Marking item as complete:", itemKey);
      await updateChecklistItem(sub, itemKey, true, idToken);
      console.log("Item marked as complete successfully");
      
      // Refresh the checklist data
      console.log("Fetching updated checklist data");
      const updatedChecklist = await fetchChecklistStatus(sub, idToken);
      console.log("Updated checklist data:", updatedChecklist);
      
      setChecklist(updatedChecklist);
      
      // Get the next incomplete item
      const nextItem = getNextIncompleteItem(updatedChecklist);
      console.log("Next incomplete item after update:", nextItem);
      
      if (nextItem) {
        console.log("Setting next item:", nextItem);
        setCurrentItem(nextItem);
      } else if (isChecklistComplete(updatedChecklist)) {
        // All items complete, redirect to dashboard
        console.log("Checklist complete, redirecting to dashboard");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
      setError('Failed to update your progress. Please try again.');
    }
  };
  
  if (loading) {
    return <div className="checklist-loading">Loading...</div>;
  }
  
  if (error) {
    return (
      <div className="checklist-error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }
  
  if (!currentItem) {
    return (
      <div className="checklist-complete">
        <h2>All Set!</h2>
        <p>You've completed all required steps.</p>
        <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      </div>
    );
  }
  
  return (
    <div className="checklist-container">
      <h1>Almost there!</h1>
      <p className="checklist-intro">
        Please complete the following requirements to access your account.
      </p>
      
      <ChecklistItem
        itemKey={currentItem}
        title={itemDetails[currentItem]?.title || 'Complete This Step'}
        description={itemDetails[currentItem]?.description || 'Click the button below to continue.'}
        onComplete={handleItemComplete}
      />
    </div>
  );
};

export default Checklist; 