import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseApp from '../lib/firebase';
import { setupAutoRefresh } from '../lib/auth';

export default function SignupScreen({ onLogin, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth(firebaseApp);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await authenticateWithBackend('google', idToken, result.user.email);
    } catch (err) {
      console.error('Google signup error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setMessage('Signup successful! Please check your email to verify your account before logging in.');
      setEmail('');
      setPassword('');
      setIsLoading(false);
    } catch (err) {
      console.error('Email signup error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const authenticateWithBackend = async (provider, token, email) => {
    try {
      const response = await fetch('https://api2.onlineartfestival.com/auth/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, token, email })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      const data = await response.json();
      
      if (data.token && data.refreshToken) {
        // Store tokens in AsyncStorage
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        await AsyncStorage.setItem('userId', data.userId?.toString() || '');
        
        console.log('Authentication successful, tokens stored');
        
        // Start auto-refresh for persistent authentication
        setupAutoRefresh();
        
        setIsLoading(false);
        onLogin(); // Notify parent that user is logged in
      } else {
        throw new Error('Invalid response: missing tokens');
      }
    } catch (err) {
      console.error('Backend authentication error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Sign Up</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
      
      {message && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{message}</Text>
          <TouchableOpacity 
            style={styles.switchToLoginButton}
            onPress={onSwitchToLogin}
          >
            <Text style={styles.switchToLoginText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!message && (
        <>
          {/* Google Sign-Up Button */}
          <TouchableOpacity 
            style={styles.googleButton}
            onPress={handleGoogleSignup}
            disabled={isLoading}
          >
            <Text style={styles.googleButtonText}>
              {isLoading ? 'Signing up...' : 'Sign up with Google'}
            </Text>
          </TouchableOpacity>

          {/* OR Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Signup Form */}
          <View style={styles.formContainer}>
            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={[styles.input, isLoading && styles.inputDisabled]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <Text style={styles.label}>Password:</Text>
            <TextInput
              style={[styles.input, isLoading && styles.inputDisabled]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              editable={!isLoading}
            />

            <TouchableOpacity 
              style={[styles.emailButton, isLoading && styles.buttonDisabled]}
              onPress={handleEmailSignup}
              disabled={isLoading}
            >
              <Text style={styles.emailButtonText}>
                {isLoading ? 'Signing up...' : 'Sign up with Email'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Switch to Login */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text style={styles.switchLink}>Login here</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 32,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    color: '#055474',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 16,
    marginBottom: 16,
    borderRadius: 4,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  successContainer: {
    backgroundColor: '#3e1c56',
    padding: 24,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  successText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  switchToLoginButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  switchToLoginText: {
    color: '#3e1c56',
    fontWeight: '600',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  googleButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    marginBottom: 32,
  },
  label: {
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 4,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  inputDisabled: {
    backgroundColor: '#f8f9fa',
  },
  emailButton: {
    backgroundColor: '#055474',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 16,
  },
  emailButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  switchText: {
    color: '#666',
    fontSize: 16,
  },
  switchLink: {
    color: '#055474',
    fontSize: 16,
    fontWeight: '500',
  },
}); 