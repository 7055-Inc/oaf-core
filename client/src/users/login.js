import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup 
} from 'firebase/auth';
import { auth } from './users';
import { googleProvider, facebookProvider, twitterProvider, githubProvider } from './auth_get_providers';
import { saveUserToDatabase } from '../services/authService';
import './login.css';

export default function Login({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [userType, setUserType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handleUserTypeChange = (e) => setUserType(e.target.value);
  
  // Social sign-in handler
  const handleSocialSignIn = async (provider) => {
    try {
      setLoading(true);
      setError('');
      
      const result = await signInWithPopup(auth, provider);
      
      // If user is registering, add user type
      if (isRegistering && userType) {
        const idToken = await result.user.getIdToken();
        
        await saveUserToDatabase({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          user_type: userType
        }, idToken);
      }
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Error signing in with social provider:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Email/password sign-in handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    if (isRegistering && !userType) {
      setError('Please select a user type');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      if (isRegistering) {
        // Register new user
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await result.user.getIdToken();
        
        // Save additional user data to the backend
        await saveUserToDatabase({
          uid: result.user.uid,
          email: result.user.email,
          user_type: userType
        }, idToken);
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };
  
  return (
    <div className="login-container">
      <h2>{isRegistering ? 'Create an Account' : 'Log In'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={handleEmailChange}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            disabled={loading}
            required
          />
        </div>
        
        {isRegistering && (
          <div className="form-group">
            <label htmlFor="userType">I am a...</label>
            <select
              id="userType"
              value={userType}
              onChange={handleUserTypeChange}
              disabled={loading}
              required
            >
              <option value="">Select...</option>
              <option value="artist">Artist</option>
              <option value="buyer">Art Collector</option>
              <option value="gallery">Gallery Owner</option>
            </select>
          </div>
        )}
        
        <button 
          type="submit" 
          className="btn primary-btn" 
          disabled={loading}
        >
          {isRegistering ? 'Register' : 'Log In'}
        </button>
        
        <div className="divider">or</div>
        
        <div className="social-login-buttons">
          <button 
            type="button" 
            className="btn google-btn" 
            onClick={() => handleSocialSignIn(googleProvider)} 
            disabled={loading}
          >
            <div className="social-button-content">
              <span className="provider-icon google-icon"></span>
              Sign in with Google
            </div>
          </button>
          
          <button 
            type="button" 
            className="btn facebook-btn" 
            onClick={() => handleSocialSignIn(facebookProvider)} 
            disabled={loading}
          >
            <div className="social-button-content">
              <span className="provider-icon facebook-icon"></span>
              Facebook
            </div>
          </button>
          
          <button 
            type="button" 
            className="btn twitter-btn" 
            onClick={() => handleSocialSignIn(twitterProvider)} 
            disabled={loading}
          >
            <div className="social-button-content">
              <span className="provider-icon twitter-icon"></span>
              X
            </div>
          </button>
          
          <button 
            type="button" 
            className="btn github-btn" 
            onClick={() => handleSocialSignIn(githubProvider)} 
            disabled={loading}
          >
            <div className="social-button-content">
              <span className="provider-icon github-icon"></span>
              GitHub
            </div>
          </button>
        </div>
      </form>
      
      <div className="mode-toggle">
        {isRegistering ? (
          <p>Already have an account? <button type="button" onClick={toggleMode}>Log In</button></p>
        ) : (
          <p>Don't have an account? <button type="button" onClick={toggleMode}>Register</button></p>
        )}
      </div>
    </div>
  );
} 