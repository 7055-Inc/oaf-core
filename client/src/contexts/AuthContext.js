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
import { registrationService } from '../services/registrationService';

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
          
          // Verify token exists and is valid
          const storedToken = localStorage.getItem('api2_token');
          if (!storedToken) {
            throw new Error('No valid API token available for registration');
          }
          const { token, user: tokenUser } = JSON.parse(storedToken);
          if (!token || !tokenUser || !tokenUser.id) {
            throw new Error('No valid API token available for registration');
          }
          
          /**
           * User Checklist Funnel
           * 
           * This is the main user processing funnel that runs after successful login.
           * It checks various requirements and redirects users to the appropriate next step.
           * 
           * User Status Flow:
           * 1. Draft - Initial state when user is created
           * 2. Active - After completing registration
           * 3. Inactive - If account is deactivated
           */
          try {
            console.log('AuthContext: Processing user requirements...');
            const { isRegistered } = await registrationService.runChecklist();
            
            if (!isRegistered) {
              console.log('AuthContext: User not registered, redirecting to registration');
              navigate('/register');
            } else {
              console.log('AuthContext: User is registered, redirecting to dashboard');
              navigate('/dashboard');
            }
          } catch (error) {
            console.error('AuthContext: Error processing user requirements:', error);
            navigate('/');
          }
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
        // Only clear cache if we're actually signing out
        if (!auth.currentUser) {
          tokenService.clearCache();
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Add event listener for signin:complete
      return new Promise((resolve, reject) => {
        const handleSignInComplete = async () => {
          try {
            const result = await signInWithPopup(auth, provider);
            // The onAuthStateChanged handler will handle token exchange and local user info
            resolve({ user: result.user });
          } catch (error) {
            reject(error);
          }
        };

        // Listen for Google's signin:complete event
        window.addEventListener('message', (event) => {
          if (event.data === 'signin:complete') {
            handleSignInComplete();
          }
        });

        // Start the sign-in process
        signInWithPopup(auth, provider).catch(reject);
      });
    } catch (error) {
      console.error('Error signing in with Google:', error);
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