import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { resetChecklist } from '../services/checklistService';

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
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const idToken = await currentUser.getIdToken();
      const response = await apiFetch('/v1/auth/session', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      // Clone the response before reading it
      const responseClone = response.clone();
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Session check failed:', {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText
        });
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Use the cloned response for JSON parsing
      const data = await responseClone.json();
      console.log('Session check response:', data);

      if (data.isLoggedIn) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiFetch('/v1/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.success) {
        await checkSession();
        return { success: true };
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Reset checklist before logout if user is authenticated
      if (user) {
        try {
          const idToken = await user.getIdToken();
          await resetChecklist(user.uid, idToken);
          console.log('Checklist reset successfully');
        } catch (error) {
          console.error('Error resetting checklist:', error);
          // Continue with logout even if checklist reset fails
        }
      }
      
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const signup = async (email, password) => {
    try {
      // Use Firebase Authentication directly
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get token for backend registration
      const idToken = await user.getIdToken();
      
      // Save user data to backend
      const response = await apiFetch('/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // After successful signup, redirect to registration
      navigate('/register');
      return user;
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in process...');
      
      // Set persistence to LOCAL to prevent session loss
      await setPersistence(auth, browserLocalPersistence);
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Firebase authentication successful:', result);
      
      const user = result.user;
      console.log('User authenticated:', user);
      
      // Get the ID token
      const idToken = await user.getIdToken(true); // Force token refresh
      console.log('ID token obtained');
      
      // Send token to backend to create/update user
      console.log('Sending token to backend...');
      const response = await apiFetch('/auth/google/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          idToken,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }),
      });

      console.log('Backend response received:', response);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Backend error:', data);
        throw new Error(data.error || 'Failed to complete Google sign-in');
      }

      console.log('Backend authentication successful');
      // Update local state
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the popup during authentication');
        return { success: false, error: 'Sign-in was cancelled' };
      }
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('Multiple popup requests were made');
        return { success: false, error: 'Multiple sign-in attempts detected' };
      }
      if (error.code === 'auth/popup-blocked') {
        console.log('Popup was blocked by the browser');
        return { success: false, error: 'Popup was blocked. Please allow popups for this site.' };
      }
      if (error.code === 'auth/network-request-failed') {
        console.log('Network error during authentication');
        return { success: false, error: 'Network error. Please check your connection.' };
      }
      throw error;
    }
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = (displayName, photoURL) => {
    return updateProfile(auth.currentUser, { displayName, photoURL });
  };

  const getUserClaims = async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdTokenResult(true);
    return token.claims;
  };

  const clearNewUserFlag = () => {
    setIsNewUser(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const claims = await getUserClaims();
        setUserClaims(claims);
        const idToken = await user.getIdToken();
        try {
          const response = await apiFetch('/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          
          // Clone the response before reading it
          const responseClone = response.clone();
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Session check failed:', {
              status: response.status,
              statusText: response.statusText,
              responseText: errorText
            });
            return;
          }
          
          // Use the cloned response for JSON parsing
          const data = await responseClone.json();
          setIsNewUser(data.isNewUser || false);
          if (!userProfile && user.displayName) {
            setUserProfile({ email: user.email, displayName: user.displayName, photoURL: user.photoURL });
          }
        } catch (error) {
          console.error('Error checking session:', error);
        }
      } else {
        setUserClaims(null);
        setUserProfile(null);
        setIsNewUser(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile]);

  const value = {
    user,
    loading,
    userClaims,
    userProfile,
    isNewUser,
    signup,
    login,
    signInWithGoogle,
    logout,
    resetPassword,
    updateProfile: updateUserProfile,
    getUserClaims,
    clearNewUserFlag
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};