import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import './login.css';
import { tokenService } from '../services/tokenService';
import Modal from 'react-modal';

// Set the app element for react-modal
Modal.setAppElement('#root');

const Login = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [user_type, setUserType] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const auth = getAuth();

  // Close modal and navigate when user is authenticated
  useEffect(() => {
    if (user) {
      // Close the modal first
      setIsOpen(false);
      // Use setTimeout to ensure modal cleanup before navigation
      const timer = setTimeout(() => {
        // AuthContext will handle the post-login flow
        navigate('/', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // If we have a user, don't render the modal at all
  if (user) {
    return null;
  }

  const closeModal = () => {
    setIsOpen(false);
    // Ensure modal is fully closed before any navigation
    setTimeout(() => {
      navigate('/');
    }, 100);
  };

  const handleGoogleLogin = async () => {
    console.log('Google login button clicked');
    setLoading(true);
    setError(null);
    try {
      console.log('Attempting Google sign in...');
      await signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Get API2 token after successful login
      try {
        await tokenService.getApi2Token();
      } catch (error) {
        console.error('Error getting API2 token:', error);
      }
      
      closeModal();
      // AuthContext will handle the post-login flow
      navigate('/');
    } catch (error) {
      console.error('Email login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegister = () => {
    setIsRegistering(!isRegistering);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={closeModal}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      style={{
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '400px',
          width: '100%',
          padding: '20px',
          borderRadius: '0',
          fontFamily: "'Playwrite Italia Moderna', cursive"
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)'
        }
      }}
    >
      <div className="login-container">
        <h2>{isRegistering ? 'Register' : 'Login'}</h2>
        <form onSubmit={handleEmailLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          {isRegistering && (
            <select
              value={user_type}
              onChange={(e) => setUserType(e.target.value)}
              required
            >
              <option value="">Select User Type</option>
              <option value="artist">Artist</option>
              <option value="community">Community Member</option>
              <option value="promoter">Promoter</option>
            </select>
          )}
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
          </button>
        </form>
        <button
          type="button"
          className="btn google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span className="provider-icon"></span>
          {loading ? 'Logging in...' : 'Login with Google'}
        </button>
        <button type="button" onClick={toggleRegister}>
          {isRegistering ? 'Already have an account? Login' : 'Don\'t have an account? Register'}
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>
    </Modal>
  );
};

export default Login; 