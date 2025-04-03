import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ProfileUpdateModal from './ProfileUpdateModal';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('showModal') === 'true') {
      const fields = JSON.parse(params.get('missingFields') || '[]');
      setMissingFields(fields);
      setShowModal(true);
    }
    if (params.get('error')) {
      setError(params.get('error'));
    }
  }, [location]);

  const handleGoogleSignIn = async () => {
    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Failed to initiate Google sign-in');
    }
  };

  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

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

      if (data.showModal) {
        setMissingFields(data.missingFields);
        setShowModal(true);
      } else if (data.redirect) {
        navigate(data.redirect);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Password sign-in error:', error);
      setError(error.message || 'Authentication failed');
    }
  };

  const handleProfileUpdate = async (updatedFields) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setShowModal(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update profile');
    }
  };

  return (
    <div className="login-container">
      <h2>Sign In</h2>
      {error && <div className="error-message">{error}</div>}
      
      <div className="auth-buttons">
        <button 
          className="google-sign-in"
          onClick={handleGoogleSignIn}
        >
          Sign in with Google
        </button>
      </div>

      <div className="divider">
        <span>or</span>
      </div>

      <form onSubmit={handlePasswordSignIn} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" className="submit-button">
          Sign In
        </button>
      </form>

      <div className="links">
        <a href="/forgot-password">Forgot Password?</a>
        <a href="/register">Create Account</a>
      </div>

      {showModal && (
        <ProfileUpdateModal
          missingFields={missingFields}
          onUpdate={handleProfileUpdate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default Login;