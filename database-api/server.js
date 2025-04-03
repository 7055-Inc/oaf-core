const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// API security credentials - these should match what we set in the API Gateway
const API_KEY = '751b0e8a01c59a49699839ae0ad692c9888a385316671f72d81fedc137021244';
const API_SECRET = '543ebdbd171b74d4874002f9f21329216c3405797bff9b323ef4e0c9aab35c9a';

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Initialize database with test table
async function initializeDatabase() {
  try {
    // Create the test table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_test (
        id SERIAL PRIMARY KEY,
        is_active BOOLEAN DEFAULT true,
        message VARCHAR(255) DEFAULT 'Hello World',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if initial record exists
    const result = await pool.query('SELECT COUNT(*) FROM api_test WHERE id = 1');
    if (parseInt(result.rows[0].count) === 0) {
      // Insert initial record
      await pool.query(`
        INSERT INTO api_test (id, is_active, message)
        VALUES (1, true, 'Hello World')
      `);
      console.log('Initialized api_test table with default data');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-Signature', 'X-Request-Timestamp']
}));

// Request signature verification middleware
function verifySignature(req, res, next) {
  const apiKey = req.header('X-API-Key');
  const signature = req.header('X-Request-Signature');
  const timestamp = req.header('X-Request-Timestamp');
  
  // Verify API key
  if (apiKey !== API_KEY) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'invalid_api_key',
        message: 'Invalid API key'
      }
    });
  }
  
  // Check for required headers
  if (!signature || !timestamp) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'missing_auth_headers',
        message: 'Missing required authentication headers'
      }
    });
  }
  
  // Verify timestamp is recent (within 5 minutes)
  const requestTime = new Date(timestamp);
  const currentTime = new Date();
  const timeDiff = Math.abs(currentTime - requestTime) / 1000; // in seconds
  
  if (isNaN(requestTime) || timeDiff > 300) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'expired_request',
        message: 'Request timestamp is invalid or expired'
      }
    });
  }
  
  // Verify signature
  const requestBody = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', API_SECRET);
  hmac.update(requestBody + timestamp);
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'invalid_signature',
        message: 'Request signature is invalid'
      }
    });
  }
  
  next();
}

// API Endpoint to process database queries
app.post('/', verifySignature, async (req, res) => {
  try {
    const { operation, parameters } = req.body;
    
    // Process based on operation type
    switch (operation) {
      case 'SELECT':
        if (parameters.table === 'api_test') {
          const { fields, conditions } = parameters;
          let query = `SELECT ${fields.join(', ')} FROM api_test`;
          
          if (conditions) {
            const whereConditions = [];
            for (const key in conditions) {
              whereConditions.push(`${key} = $${whereConditions.length + 1}`);
            }
            if (whereConditions.length > 0) {
              query += ` WHERE ${whereConditions.join(' AND ')}`;
            }
          }
          
          const values = conditions ? Object.values(conditions) : [];
          const result = await pool.query(query, values);
          res.json({
            success: true,
            data: result.rows[0] || null
          });
        } else {
          throw new Error('Unsupported table');
        }
        break;
        
      case 'UPDATE':
        if (parameters.table === 'api_test') {
          const { values, conditions } = parameters;
          
          // Construct SET part
          const setClause = [];
          const queryParams = [];
          let paramCount = 1;
          
          for (const key in values) {
            setClause.push(`${key} = $${paramCount++}`);
            queryParams.push(values[key]);
          }
          
          // Add updated_at
          if (!values.updated_at) {
            setClause.push(`updated_at = CURRENT_TIMESTAMP`);
          }
          
          // Construct WHERE part
          const whereConditions = [];
          for (const key in conditions) {
            whereConditions.push(`${key} = $${paramCount++}`);
            queryParams.push(conditions[key]);
          }
          
          const query = `
            UPDATE api_test
            SET ${setClause.join(', ')}
            WHERE ${whereConditions.join(' AND ')}
            RETURNING id, is_active, message, updated_at
          `;
          
          const result = await pool.query(query, queryParams);
          res.json({
            success: true,
            data: result.rows[0] || null
          });
        } else {
          throw new Error('Unsupported table');
        }
        break;
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: error.message || 'An error occurred while processing the database request'
      }
    });
  }
});

// Start server
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Database API server running on port ${port}`);
  });
}); 