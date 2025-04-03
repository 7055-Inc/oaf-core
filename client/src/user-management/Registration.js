// THIS IMPLEMENTATION IS DEPRECATED
// This file has been replaced by the modular implementation in registration-parts/Registration-container.js
// Keeping this code as a reference only.

/*
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase'; // Import initialized auth
import './Registration.css';

const Registration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [draftToken, setDraftToken] = useState(null);
  const [userType, setUserType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [firebaseToken, setFirebaseToken] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setFirebaseToken(token);
        fetch(`/users/register/drafts-by-email/${user.email}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.drafts.length > 0) {
              const latestDraft = data.drafts[0];
              setDraftToken(latestDraft.token);
              setStep(latestDraft.current_step);
              setUserType(latestDraft.user_type);
            }
          })
          .catch((err) => console.error('Error fetching drafts:', err));
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleUpdateDraft = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      // Check if draft exists
      const checkResponse = await fetch(`/users/register/drafts-by-email/${email}`, {
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
        },
      });
      
      const checkData = await checkResponse.json();
      
      if (checkData.success && checkData.drafts.length > 0) {
        // Use existing draft
        const latestDraft = checkData.drafts[0];
        setDraftToken(latestDraft.token);
        setStep(2); // Go to user type selection
      } else {
        // Create new draft with account details
        const createResponse = await fetch('/users/register/create-draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            id: user.uid,
            data: { 
              email,
              password,
              signupMethod: 'email' 
            },
          }),
        });

        const createData = await createResponse.json();
        if (createData.success) {
          setDraftToken(createData.token);
          setStep(2); // Go to user type selection
        } else {
          setError(createData.message || 'Failed to create registration');
        }
      }
    } catch (err) {
      setError('Error creating draft');
      console.error(err);
    }
  };

  const handleCreateDraft = async () => {
    if (!userType) {
      setError('Please select a user type');
      return;
    }

    if (!draftToken) {
      setError('Registration token not found. Please start over.');
      return;
    }

    try {
      const response = await fetch(`/users/register/update-draft/${draftToken}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          step: 2,
          user_type: userType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStep(3);
        navigate(data.redirect);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error updating user type');
      console.error(err);
    }
  };

  const handleBasicProfile = async () => {
    if (!firstName || !lastName) {
      setError('First name and last name are required');
      return;
    }

    try {
      const response = await fetch(`/users/register/update-draft/${draftToken}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          step: 3,
          data: { firstName, lastName },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStep(4);
        navigate(data.redirect);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error updating draft');
      console.error(err);
    }
  };

  const handleComplete = async () => {
    try {
      const response = await fetch(`/users/register/complete/${draftToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          formData: {
            email,
            password,
            firstName,
            lastName,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        navigate('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error completing registration');
      console.error(err);
    }
  };

  return (
    <div className="registration-container">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}

      {step === 1 && (
        <div>
          <h3>Step 1: Account Details</h3>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleUpdateDraft}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3>Step 2: Select User Type</h3>
          <select value={userType} onChange={(e) => setUserType(e.target.value)}>
            <option value="">Select user type</option>
            <option value="artist">Artist</option>
            <option value="promoter">Promoter</option>
            <option value="community">Community</option>
          </select>
          <button onClick={handleCreateDraft}>Next</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3>Step 3: Basic Profile</h3>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <button onClick={handleBasicProfile}>Next</button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3>Step 4: Type-Specific Details</h3>
          <button onClick={() => setStep(5)}>Next</button>
        </div>
      )}

      {step === 5 && (
        <div>
          <h3>Step 5: Complete Registration</h3>
          <button onClick={handleComplete}>Complete</button>
        </div>
      )}
    </div>
  );
};

export default Registration;
*/