import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../services/authService';

const LoginModal = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      // The modal will be closed by the AuthContext navigation
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Render your login form here */}
    </div>
  );
};

export default LoginModal; 