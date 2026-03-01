#!/usr/bin/env node
const path = require('path');
const { loadSecrets } = require('./utils/loadSecrets');

loadSecrets({ envPath: path.join(__dirname, '../.env') })
  .then(() => require('./server'))
  .catch(err => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });
