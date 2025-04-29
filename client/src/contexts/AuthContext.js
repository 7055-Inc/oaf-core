import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserSessionPersistence,
  getAuth
} from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getApiUrl } from '../services/api';
import { tokenService } from '../services/tokenService';
import { checklistService } from '../services/checklistService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userClaims, setUserClaims] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [hasHandledInitialAuth, setHasHandledInitialAuth] = useState(false);
  const [localUser, setLocalUser] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const navigate = useNavigate();

  // Set session persistence when component mounts
  useEffect(() => {
    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        console.log('Auth persistence set to session');
      })
      .catch((error) => {
        console.error('Error setting auth persistence:', error);
      });
  }, []);

  // Handle auth state changes
  useEffect(() => {
    console.log('AuthContext: Starting auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthContext: Firebase auth state changed:', user ? 'User exists' : 'No user');
      
      if (user) {
        try {
          console.log('AuthContext: Getting Firebase token and claims');
          const tokenResult = await user.getIdTokenResult();
          console.log('AuthContext: Got token result:', tokenResult);
          
          // Set the user state with the data we already have
          setUser({
            ...user,
            claims: tokenResult.claims
          });
          
          // Only do token exchange if we don't have a valid API token
          let apiToken;
          if (!tokenService.getCachedToken()) {
            console.log('AuthContext: Starting token exchange...');
            apiToken = await tokenService.exchangeToken(user);
            console.log('AuthContext: Token exchange complete, got API token');
          } else {
            console.log('AuthContext: Using existing API token');
            apiToken = tokenService.getCachedToken();
          }
          
          // Run the checklist - it will handle any necessary redirects
          console.log('AuthContext: Starting checklist process...');
          await checklistService.runChecklist(user);
          
          // If we got here, checklist is complete and user is cleared
          console.log('AuthContext: Checklist complete, user is cleared for site access');
          
          // Set a flag to indicate we should navigate to dashboard
          console.log('AuthContext: Setting hasHandledInitialAuth to true');
          setHasHandledInitialAuth(true);
          
          // Let the auth context handle navigation naturally
          // Protected routes will handle their own access control
        } catch (error) {
          console.error('AuthContext: Error during auth state change:', error);
          setUser(null);
          setLocalUser(null);
          // Only clear cache if it's a token-related error
          if (error.message.includes('token') || error.message.includes('auth')) {
            tokenService.clearCache();
          }
        }
      } else {
        console.log('AuthContext: No user, clearing state');
        setUser(null);
        setLocalUser(null);
        tokenService.clearCache();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('1. Starting Google sign-in process');
      const provider = new GoogleAuthProvider();
      console.log('2. Provider created, about to call signInWithPopup');
      
            const result = await signInWithPopup(auth, provider);
      console.log('3. Google sign-in successful:', result.user);
      
      // Add a small delay to ensure the popup is fully closed
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('4. Popup handling complete');
      
      return { user: result.user };
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the popup');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Popup request was cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        console.log('Popup was blocked by the browser');
      }
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setHasHandledInitialAuth(false);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      setIsNewUser(true);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (profile) => {
    try {
      setLoading(true);
      await updateProfile(auth.currentUser, profile);
    } finally {
      setLoading(false);
    }
  };

  const getUserClaims = async () => {
    if (!user) return null;
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims;
  };

  const clearNewUserFlag = () => {
    setIsNewUser(false);
  };

  const value = {
    user,
    localUser,
    loading,
    userClaims,
    isNewUser,
    userProfile,
    hasHandledInitialAuth,
    signInWithGoogle,
    login,
    logout,
    signup,
    resetPassword,
    updateUserProfile,
    getUserClaims,
    clearNewUserFlag
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};