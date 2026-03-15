#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../api-service/.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const { testConnection } = require('./config/database');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.SOP_PORT || 3002;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/static', express.static(path.join(__dirname, '../public')));
app.get('/api/config', (req, res) => {
  const apiUrl = (process.env.API_BASE_URL || '').replace(/\/$/, '');
  const host = req.get('host') || '';
  const base = host.replace(/^sop\./, '');
  const loginUrl = base
    ? 'https://' + base + '/login'
    : (process.env.FRONTEND_URL || 'https://brakebee.com').replace(/\/$/, '') + '/login';
  res.json({ success: true, data: { loginUrl, brakebeeApiUrl: apiUrl || undefined } });
});
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sop-catalog', timestamp: new Date().toISOString() });
});

app.get('/api/db/test', async (req, res) => {
  try {
    const ok = await testConnection();
    res.json({ success: ok, database: 'brakebee_sop' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/static') || req.path === '/health') return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', service: 'sop-catalog' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error', service: 'sop-catalog' });
});

app.listen(PORT, () => {
  console.log(`SOP Catalog running on port ${PORT}`);
});

module.exports = app;
