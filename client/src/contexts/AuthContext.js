import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';

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
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.success) {
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
      const response = await fetch('/api/auth/password', {
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
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const signup = async (email, password) => {
    try {
      const response = await fetch('/api/newuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create account');
      }

      // After successful signup, redirect to registration
      navigate('/register');
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'GET',
      });
      const data = await response.json();
      if (data.url) {
        // Store the current URL to return to after Google sign-in
        localStorage.setItem('returnTo', window.location.pathname);
        window.location.href = data.url;
      }
    } catch (error) {
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
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const data = await response.json();
        setIsNewUser(data.isNewUser || false);
        if (!userProfile && user.displayName) {
          setUserProfile({ email: user.email, displayName: user.displayName, photoURL: user.photoURL });
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