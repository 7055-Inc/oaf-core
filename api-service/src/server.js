require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

// Handle JSON parsing errors
app.use(express.json(), (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err.message, 'Body:', req.body);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next();
});

app.use(cors({
  origin: 'https://main.onlineartfestival.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Added PATCH
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/auth', require('./routes/auth'));
app.use('/api-keys', require('./routes/api-keys'));
app.use('/admin', require('./routes/admin'));
app.use('/users', require('./routes/users')); // Mount the users route

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.API_VERSION, instance: process.env.API_INSTANCE });
});

const port = process.env.API_GATEWAY_PORT || 3001;
app.listen(port, () => {
  console.log(`> API running on http://api2.onlineartfestival.com:${port}`);
});