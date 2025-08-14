#!/usr/bin/env node

/**
 * Domain Manager - Let's Encrypt SSL Automation
 * Handles custom domain SSL certificate generation and validation
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const crypto = require('crypto');
const dns = require('dns').promises;

// Database configuration
const DB_CONFIG = {
  host: '10.128.0.31',
  user: 'oafuser',
  password: 'oafpass',
  database: 'oaf'
};

// Configuration
const CERTBOT_EMAIL = 'admin@onlineartfestival.com';
const NGINX_SITES_PATH = '/etc/nginx/sites-available';
const NGINX_SITES_ENABLED = '/etc/nginx/sites-enabled';
const VALIDATION_EXPIRY_HOURS = 24;
const LOG_FILE = '/var/log/domain-manager.log';

class DomainManager {
  constructor() {
    this.db = null;
  }

  async connect() {
    this.db = await mysql.createConnection(DB_CONFIG);
    this.log('Database connected');
  }

  async disconnect() {
    if (this.db) {
      await this.db.end();
      this.log('Database disconnected');
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    
    // Append to log file
    fs.appendFile(LOG_FILE, logMessage).catch(err => {
      console.error('Failed to write to log file:', err);
    });
  }

  /**
   * Generate a unique validation key for domain verification
   */
  generateValidationKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Start domain validation process
   */
  async startDomainValidation(siteId, customDomain) {
    try {
      const validationKey = this.generateValidationKey();
      const expiresAt = new Date(Date.now() + (VALIDATION_EXPIRY_HOURS * 60 * 60 * 1000));

      await this.db.execute(
        `UPDATE sites SET 
         domain_validation_key = ?, 
         domain_validation_status = 'pending', 
         domain_validation_expires = ?,
         domain_validation_attempted_at = NOW(),
         domain_validation_error = NULL
         WHERE id = ?`,
        [validationKey, expiresAt, siteId]
      );

      this.log(`Domain validation started for ${customDomain} (Site ID: ${siteId})`);
      this.log(`Validation key: ${validationKey}`);
      this.log(`Artist must add DNS TXT record: _oaf-site-verification.${customDomain} = ${validationKey}`);

      return {
        success: true,
        validationKey,
        expiresAt,
        instructions: `Add DNS TXT record: _oaf-site-verification.${customDomain} = ${validationKey}`
      };
    } catch (error) {
      this.log(`Error starting domain validation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify domain ownership via DNS TXT record
   */
  async verifyDomainOwnership(customDomain, expectedKey) {
    try {
      const txtRecordName = `_oaf-site-verification.${customDomain}`;
      this.log(`Checking DNS TXT record for ${txtRecordName}`);

      const txtRecords = await dns.resolveTxt(txtRecordName);
      const flatRecords = txtRecords.flat();

      const isValid = flatRecords.some(record => record === expectedKey);
      
      if (isValid) {
        this.log(`Domain ownership verified for ${customDomain}`);
        return { success: true };
      } else {
        this.log(`Domain ownership verification failed for ${customDomain}`);
        this.log(`Expected: ${expectedKey}, Found: ${flatRecords.join(', ')}`);
        return { success: false, error: 'DNS TXT record not found or incorrect' };
      }
    } catch (error) {
      this.log(`DNS verification error for ${customDomain}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate SSL certificate using Let's Encrypt
   */
  async generateSSLCertificate(customDomain) {
    try {
      this.log(`Generating SSL certificate for ${customDomain}`);

      const certbotCommand = `sudo certbot certonly --nginx -d ${customDomain} --non-interactive --agree-tos --email ${CERTBOT_EMAIL}`;
      
      const result = execSync(certbotCommand, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });

      this.log(`SSL certificate generated successfully for ${customDomain}`);
      this.log(`Certbot output: ${result}`);

      return { success: true, output: result };
    } catch (error) {
      this.log(`SSL certificate generation failed for ${customDomain}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create nginx configuration for custom domain
   */
  async createNginxConfig(siteId, customDomain, subdomain) {
    try {
      const configContent = `server {
    server_name ${customDomain};
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
    add_header Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.gstatic.com; connect-src 'self' https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://accounts.google.com https://firestore.googleapis.com https://firebasestorage.googleapis.com https://firebase.googleapis.com https://apis.google.com https://www.google.com https://api2.onlineartfestival.com; frame-src 'self' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://*.firebaseapp.com/; worker-src 'self' blob:;" always;
    
    # Logging
    access_log /var/log/nginx/custom_domain_${siteId}_access.log;
    error_log /var/log/nginx/custom_domain_${siteId}_error.log;
    
    # Serve static media files directly
    location /static_media/ {
        alias /var/www/main/public/static_media/;
        add_header Cache-Control "public, max-age=31536000";
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Range";
        
        # Handle video files
        location ~* \\.(mp4|webm|ogg)$ {
            add_header Accept-Ranges bytes;
            add_header Content-Type video/mp4;
        }
    }
    
    # Serve Next.js static files
    location /_next/static/ {
        alias /var/www/main/.next/static/;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Default location - route to user's subdomain
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host ${subdomain}.onlineartfestival.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Custom-Domain $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/${customDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${customDomain}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name ${customDomain};
    return 301 https://$host$request_uri;
}`;

      const configFile = `${NGINX_SITES_PATH}/custom-domain-${siteId}`;
      await fs.writeFile(configFile, configContent);

      // Enable the site
      const symlinkPath = `${NGINX_SITES_ENABLED}/custom-domain-${siteId}`;
      try {
        await fs.unlink(symlinkPath);
      } catch (e) {
        // Symlink might not exist, that's okay
      }
      await fs.symlink(configFile, symlinkPath);

      this.log(`Nginx configuration created for ${customDomain}`);
      return { success: true };
    } catch (error) {
      this.log(`Error creating nginx config for ${customDomain}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test nginx configuration and reload if valid
   */
  async reloadNginx() {
    try {
      // Test configuration
      execSync('sudo nginx -t', { stdio: 'pipe' });
      
      // Reload nginx
      execSync('sudo systemctl reload nginx', { stdio: 'pipe' });
      
      this.log('Nginx configuration reloaded successfully');
      return { success: true };
    } catch (error) {
      this.log(`Error reloading nginx: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a single domain validation
   */
  async processDomainValidation(site) {
    const { id, custom_domain, subdomain, domain_validation_key } = site;
    
    try {
      this.log(`Processing domain validation for ${custom_domain} (Site ID: ${id})`);

      // Step 1: Verify domain ownership
      const verificationResult = await this.verifyDomainOwnership(custom_domain, domain_validation_key);
      if (!verificationResult.success) {
        await this.db.execute(
          `UPDATE sites SET 
           domain_validation_status = 'failed',
           domain_validation_error = ?
           WHERE id = ?`,
          [verificationResult.error, id]
        );
        return { success: false, error: verificationResult.error };
      }

      // Step 2: Generate SSL certificate
      const sslResult = await this.generateSSLCertificate(custom_domain);
      if (!sslResult.success) {
        await this.db.execute(
          `UPDATE sites SET 
           domain_validation_status = 'failed',
           domain_validation_error = ?
           WHERE id = ?`,
          [sslResult.error, id]
        );
        return { success: false, error: sslResult.error };
      }

      // Step 3: Create nginx configuration
      const nginxResult = await this.createNginxConfig(id, custom_domain, subdomain);
      if (!nginxResult.success) {
        await this.db.execute(
          `UPDATE sites SET 
           domain_validation_status = 'failed',
           domain_validation_error = ?
           WHERE id = ?`,
          [nginxResult.error, id]
        );
        return { success: false, error: nginxResult.error };
      }

      // Step 4: Reload nginx
      const reloadResult = await this.reloadNginx();
      if (!reloadResult.success) {
        await this.db.execute(
          `UPDATE sites SET 
           domain_validation_status = 'failed',
           domain_validation_error = ?
           WHERE id = ?`,
          [reloadResult.error, id]
        );
        return { success: false, error: reloadResult.error };
      }

      // Step 5: Mark as verified and active
      await this.db.execute(
        `UPDATE sites SET 
         domain_validation_status = 'verified',
         custom_domain_active = TRUE,
         domain_validation_error = NULL
         WHERE id = ?`,
        [id]
      );

      this.log(`Domain validation completed successfully for ${custom_domain}`);
      return { success: true };

    } catch (error) {
      this.log(`Error processing domain validation for ${custom_domain}: ${error.message}`);
      await this.db.execute(
        `UPDATE sites SET 
         domain_validation_status = 'failed',
         domain_validation_error = ?
         WHERE id = ?`,
        [error.message, id]
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Process all pending domain validations
   */
  async processAllPendingValidations() {
    try {
      this.log('Processing all pending domain validations');

      const [sites] = await this.db.execute(
        `SELECT id, custom_domain, subdomain, domain_validation_key
         FROM sites 
         WHERE custom_domain IS NOT NULL 
         AND domain_validation_status = 'pending'
         AND domain_validation_expires > NOW()`
      );

      this.log(`Found ${sites.length} pending domain validations`);

      for (const site of sites) {
        await this.processDomainValidation(site);
      }

      this.log('Finished processing all pending domain validations');
    } catch (error) {
      this.log(`Error processing pending validations: ${error.message}`);
    }
  }

  /**
   * Clean up expired domain validations
   */
  async cleanupExpiredValidations() {
    try {
      const [result] = await this.db.execute(
        `UPDATE sites SET 
         domain_validation_status = 'expired',
         domain_validation_key = NULL
         WHERE domain_validation_status = 'pending'
         AND domain_validation_expires < NOW()`
      );

      this.log(`Cleaned up ${result.affectedRows} expired domain validations`);
    } catch (error) {
      this.log(`Error cleaning up expired validations: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const manager = new DomainManager();
  
  try {
    await manager.connect();
    
    const command = process.argv[2];
    
    switch (command) {
      case 'start-validation':
        const siteId = process.argv[3];
        const customDomain = process.argv[4];
        if (!siteId || !customDomain) {
          console.error('Usage: node domain-manager.js start-validation <siteId> <customDomain>');
          process.exit(1);
        }
        const result = await manager.startDomainValidation(siteId, customDomain);
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'process-pending':
        await manager.processAllPendingValidations();
        break;
        
      case 'cleanup-expired':
        await manager.cleanupExpiredValidations();
        break;
        
      case 'process-domain':
        const domainSiteId = process.argv[3];
        if (!domainSiteId) {
          console.error('Usage: node domain-manager.js process-domain <siteId>');
          process.exit(1);
        }
        const [sites] = await manager.db.execute(
          'SELECT id, custom_domain, subdomain, domain_validation_key FROM sites WHERE id = ?',
          [domainSiteId]
        );
        if (sites.length === 0) {
          console.error('Site not found');
          process.exit(1);
        }
        const processResult = await manager.processDomainValidation(sites[0]);
        console.log(JSON.stringify(processResult, null, 2));
        break;
        
      default:
        console.log('Available commands:');
        console.log('  start-validation <siteId> <customDomain>');
        console.log('  process-pending');
        console.log('  cleanup-expired');
        console.log('  process-domain <siteId>');
        break;
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = DomainManager; 