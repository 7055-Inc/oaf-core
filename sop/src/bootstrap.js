#!/usr/bin/env node
const path = require('path');
const { loadSecrets } = require('../../api-service/src/utils/loadSecrets');

loadSecrets({ envPath: path.join(__dirname, '../../api-service/.env') })
  .then(() => require('./server'))
  .catch(err => {
    console.error('SOP bootstrap failed:', err);
    process.exit(1);
  });
