import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getSession } from '../services/authService';

// Create context
const UserContext = createContext();

// Provider component
export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Firebase User:', firebaseUser);
      
      if (firebaseUser) {
        try {
          // Get the complete user data from our backend
          const idToken = await firebaseUser.getIdToken();
          console.log('Fetching session with token:', idToken.substring(0, 20) + '...');
          
          const sessionData = await getSession(idToken);
          console.log('Session Data:', sessionData);
          
          if (sessionData && sessionData.user) {
            // Combine Firebase user with our backend user data
            const combinedUser = {
              ...firebaseUser,
              ...sessionData.user
            };
            console.log('Combined User Data:', combinedUser);
            console.log('User Type:', combinedUser.user_type);
            setCurrentUser(combinedUser);
          } else {
            console.error('Invalid session data:', sessionData);
            setCurrentUser(firebaseUser);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser(firebaseUser);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Clean up the listener on unmount
    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the auth context
export function useUser() {
  return useContext(UserContext);
}

// Export auth for use elsewhere
export { auth }; 