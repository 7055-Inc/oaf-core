import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getIdToken
} from 'firebase/auth';
import { apiFetch } from '../services/api';

// Initialize Firebase with config from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// User management functions
const createUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save additional user data to our database
    const idToken = await user.getIdToken();
    const response = await apiFetch('/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        ...userData
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save user data');
    }

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user exists in our database
    const idToken = await user.getIdToken();
    const response = await apiFetch(`/users/${user.uid}`, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (response.status === 404) {
      // User doesn't exist in our database, create them
      await apiFetch('/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        })
      });
    }

    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth,
      user => {
        unsubscribe();
        resolve(user);
      },
      error => {
        unsubscribe();
        reject(error);
      }
    );
  });
};

const getUserProfile = async (uid) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const idToken = await user.getIdToken();
    const response = await apiFetch(`/users/${uid}`, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

const updateUserProfile = async (uid, profileData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const idToken = await user.getIdToken();
    const response = await apiFetch(`/users/${uid}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      throw new Error('Failed to update user profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

const deleteUser = async (uid) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const idToken = await user.getIdToken();
    const response = await apiFetch(`/users/${uid}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }

    await user.delete();
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export {
  auth,
  createUser,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  deleteUser
}; 