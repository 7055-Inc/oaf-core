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
    const userCollection = db.collection('users');
    const existingUser = await userCollection.findOne({ uid });
    
    if (existingUser) {
      // Update existing user
      await userCollection.updateOne(
        { uid },
        { $set: { ...userData, updated_at: new Date() } }
      );
      
      const updatedUser = await userCollection.findOne({ uid });
      return res.status(200).json({ 
        message: 'User profile updated successfully',
        data: updatedUser
      });
    } else {
      // Create new user
      const newUser = {
        uid,
        ...userData,
        created_at: new Date(),
        updated_at: new Date(),
        // Add any default fields needed for new users
        cart: [],
        favorites: [],
        orders: []
      };
      
      await userCollection.insertOne(newUser);
      return res.status(201).json({ 
        message: 'User profile created successfully',
        data: newUser
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
    
    const userCollection = db.collection('users');
    const user = await userCollection.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(200).json({
      message: 'User profile retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Additional routes for the art festival application

// Get all artworks
router.get('/artworks', async (req, res) => {
  try {
    const artworkCollection = db.collection('artworks');
    const artworks = await artworkCollection.find({}).toArray();
    
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
    
    const artworkCollection = db.collection('artworks');
    const artwork = await artworkCollection.findOne({ _id: id });
    
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }
    
    res.status(200).json({
      message: 'Artwork retrieved successfully',
      data: artwork
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
      _id: uuidv4(),
      artist_id: uid,
      ...artworkData,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const artworkCollection = db.collection('artworks');
    await artworkCollection.insertOne(newArtwork);
    
    res.status(201).json({
      message: 'Artwork created successfully',
      data: newArtwork
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