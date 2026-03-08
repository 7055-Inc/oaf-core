#!/usr/bin/env node
const path = require('path');
const { loadSecrets } = require('../../api-service/src/utils/loadSecrets');

loadSecrets({ envPath: path.join(__dirname, '../.env') })
  .then(() => require('./server'))
  .catch(err => {
    console.error('Leo bootstrap failed:', err);
    process.exit(1);
  });
