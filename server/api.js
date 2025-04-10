const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { connectDb } = require('./db');
const path = require('path');
const admin = require('./firebase-admin');

dotenv.config();

const router = express.Router();
router.use(cors());
router.use(express.json());

// Database connection
let db;
connectDb().then(database => {
  db = database;
  console.log('Connected to database');
}).catch(err => {
  console.error('Failed to connect to database:', err);
});

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// User API Routes

// Verify token endpoint
router.post('/auth/verify', verifyToken, (req, res) => {
  res.status(200).json({ 
    uid: req.user.uid,
    message: 'Token verified successfully' 
  });
});

// Save or update user profile
router.post('/users/profile', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const userData = req.body;
    
    // Make sure the request contains a user object
    if (!userData) {
      return res.status(400).json({ error: 'No user data provided' });
    }
    
    // Check if user already exists in the database
    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE google_uid = ?",
      [uid]
    );
    
    if (existingUser.length > 0) {
      // Update existing user
      await db.query(
        "UPDATE users SET ? WHERE google_uid = ?",
        [{ ...userData, updated_at: new Date() }, uid]
      );
      
      const [updatedUser] = await db.query(
        "SELECT * FROM users WHERE google_uid = ?",
        [uid]
      );
      
      return res.status(200).json({ 
        message: 'User profile updated successfully',
        data: updatedUser[0]
      });
    } else {
      // Create new user
      const newUser = {
        google_uid: uid,
        ...userData,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await db.query(
        "INSERT INTO users SET ?",
        [newUser]
      );
      
      const [createdUser] = await db.query(
        "SELECT * FROM users WHERE google_uid = ?",
        [uid]
      );
      
      return res.status(201).json({ 
        message: 'User profile created successfully',
        data: createdUser[0]
      });
    }
  } catch (error) {
    console.error('Error saving user profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/users/profile', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    const [user] = await db.query(
      "SELECT * FROM users WHERE google_uid = ?",
      [uid]
    );
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(200).json({
      message: 'User profile retrieved successfully',
      data: user[0]
    });
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Check or create user
router.post('/users/:uid/check-user', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const { sub } = req.user;
    
    // Ensure the requested user ID matches the authenticated user
    if (uid !== sub) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }
    
    // First check if user exists by google_uid
    const [userByUid] = await db.query(
      "SELECT * FROM users WHERE google_uid = ?",
      [uid]
    );
    
    if (userByUid.length > 0) {
      // User exists by google_uid, check checklist
      const [checklistRows] = await db.query(
        "SELECT * FROM user_checklist WHERE user_id = ?",
        [uid]
      );
      
      return res.status(200).json({ 
        exists: true, 
        user: userByUid[0],
        checklist: checklistRows[0] || {
          is_user: true,
          registration: false,
          terms_accepted: false,
          profile_complete: false,
          email_verified: false
        }
      });
    }
    
    // If no user by google_uid, check by email
    const [userByEmail] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [req.user.email]
    );
    
    if (userByEmail.length > 0) {
      // User exists by email, update their google_uid
      await db.query(
        "UPDATE users SET google_uid = ? WHERE username = ?",
        [uid, req.user.email]
      );
      
      // Get updated user
      const [updatedUser] = await db.query(
        "SELECT * FROM users WHERE google_uid = ?",
        [uid]
      );
      
      // Check checklist
      const [checklistRows] = await db.query(
        "SELECT * FROM user_checklist WHERE user_id = ?",
        [uid]
      );
      
      return res.status(200).json({ 
        exists: true, 
        user: updatedUser[0],
        checklist: checklistRows[0] || {
          is_user: true,
          registration: false,
          terms_accepted: false,
          profile_complete: false,
          email_verified: false
        }
      });
    }
    
    // If no user exists by either google_uid or email, create new user
    const newUser = {
      username: req.user.email,
      email_verified: true,
      user_type: 'community',
      status: 'active',
      google_uid: uid
    };
    
    await db.query(
      "INSERT INTO users SET ?",
      [newUser]
    );
    
    // Get the created user
    const [createdUser] = await db.query(
      "SELECT * FROM users WHERE google_uid = ?",
      [uid]
    );
    
    // Create initial checklist
    await db.query(
      "INSERT INTO user_checklist (user_id, is_user, registration, terms_accepted, profile_complete, email_verified) VALUES (?, ?, ?, ?, ?, ?)",
      [uid, true, false, false, false, false]
    );
    
    res.status(200).json({ 
      exists: false, 
      user: createdUser[0],
      checklist: {
        is_user: true,
        registration: false,
        terms_accepted: false,
        profile_complete: false,
        email_verified: false
      }
    });
  } catch (error) {
    console.error('Error checking/creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Additional routes for the art festival application

// Get all artworks
router.get('/artworks', async (req, res) => {
  try {
    const [artworks] = await db.query(
      "SELECT * FROM artworks"
    );
    
    res.status(200).json({
      message: 'Artworks retrieved successfully',
      data: artworks
    });
  } catch (error) {
    console.error('Error retrieving artworks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get artwork by ID
router.get('/artworks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [artwork] = await db.query(
      "SELECT * FROM artworks WHERE id = ?",
      [id]
    );
    
    if (artwork.length === 0) {
      return res.status(404).json({ error: 'Artwork not found' });
    }
    
    res.status(200).json({
      message: 'Artwork retrieved successfully',
      data: artwork[0]
    });
  } catch (error) {
    console.error('Error retrieving artwork:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new artwork (protected)
router.post('/artworks', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const artworkData = req.body;
    
    // Validate artwork data
    if (!artworkData.title || !artworkData.price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }
    
    const newArtwork = {
      artist_id: uid,
      ...artworkData,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    await db.query(
      "INSERT INTO artworks SET ?",
      [newArtwork]
    );
    
    const [createdArtwork] = await db.query(
      "SELECT * FROM artworks WHERE id = LAST_INSERT_ID()"
    );
    
    res.status(201).json({
      message: 'Artwork created successfully',
      data: createdArtwork[0]
    });
  } catch (error) {
    console.error('Error creating artwork:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

module.exports = router; 