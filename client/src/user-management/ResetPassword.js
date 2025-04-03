import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './UserManagement.css';

function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setMessage('Check your email for password reset instructions');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err.code === 'auth/user-not-found' ? 'No account exists with this email' :
        err.code === 'auth/invalid-email' ? 'Invalid email address' :
        'Failed to send password reset email'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Reset Password</h2>
      {message && <div className="auth-success">{message}</div>}
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="email">Email:</label>
          <input 
            type="email" 
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        <div className="button-group">
          <button onClick={() => navigate('/')} type="button">Cancel</button>
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;