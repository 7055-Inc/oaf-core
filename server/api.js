const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { connectDb } = require('./db');
const path = require('path');
const admin = require('./firebase-admin');

dotenv.config();

const router = express.Router();

// Configure CORS
const corsOptions = {
  origin: ['https://main.onlineartfestival.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  credentials: true
};

router.use(cors(corsOptions));
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