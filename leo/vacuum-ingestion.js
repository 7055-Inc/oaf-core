#!/usr/bin/env node

/**
 * Leo AI - Intelligent Vacuum Ingestion Script
 * Discovers ALL database tables and columns dynamically
 * Ingests any new data since last run with intelligent batching
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const VectorDatabase = require('./src/core/vectorDatabase');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [LEO-VACUUM] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, 'logs/vacuum.log') }),
    new winston.transports.Console()
  ]
});

class IntelligentVacuum {
  constructor() {
    this.vectorDB = new VectorDatabase();
    this.dbConnection = null;
    this.lastRunFile = path.join(__dirname, 'data/last-vacuum-run.json');
    this.lockFile = path.join(__dirname, 'data/vacuum-running.lock');
    this.batchSize = 100;
    this.relationshipBreakMs = 2000;
    
    // TABLES HANDLED BY MANUAL INGESTION SCRIPTS - SKIP THESE!
    this.EXCLUDED_TABLES = [
      // User tables (handled by ingestion/ingest-users.js)
      'users',
      'user_profiles',
      'artist_profiles',
      'promoter_profiles',
      'community_profiles',
      'admin_profiles',
      
      // Product tables (handled by ingestion/ingest-products.js)
      'products',
      'product_images',
      'product_inventory',
      'product_variations',
      'product_shipping',
      'product_categories', // Junction table
      // Note: categories table is JOINed in product ingestion, not excluded
      
      // Order tables (handled by ingestion/ingest-orders.js)
      'orders',
      'order_items',
      'order_status_history',
      
      // Sensitive/system tables
      'sessions',
      'password_resets',
      'api_tokens',
      'refresh_tokens',
      
      // System/config tables
      'migrations',
      'schema_migrations'
    ];
  }

  async initialize() {
    try {
      await this.vectorDB.initialize();
      
      this.dbConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'oaf_media'
      });

      logger.info('Intelligent vacuum initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize intelligent vacuum:', error);
      throw error;
    }
  }

  async getLastRunTimestamp() {
    try {
      const data = await fs.readFile(this.lastRunFile, 'utf8');
      const lastRun = JSON.parse(data);
      return lastRun.timestamp || '1970-01-01 00:00:00';
    } catch (error) {
      logger.info('No previous run found, starting from beginning');
      return '1970-01-01 00:00:00';
    }
  }

  async updateLastRunTimestamp() {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await fs.writeFile(this.lastRunFile, JSON.stringify({ timestamp }));
      logger.info(`Updated last run timestamp: ${timestamp}`);
    } catch (error) {
      logger.error('Failed to update last run timestamp:', error);
    }
  }

  async isAlreadyRunning() {
    try {
      const lockData = await fs.readFile(this.lockFile, 'utf8');
      const lock = JSON.parse(lockData);
      const lockAge = Date.now() - new Date(lock.startTime).getTime();
      
      // If lock is older than 24 hours, consider it stale
      if (lockAge > 24 * 60 * 60 * 1000) {
        logger.warn('Found stale lock file, removing it');
        await this.releaseLock();
        return false;
      }
      
      logger.info(`Vacuum already running since ${lock.startTime} (PID: ${lock.pid})`);
      return true;
    } catch (error) {
      // No lock file or can't read it = not running
      return false;
    }
  }

  async acquireLock() {
    try {
      const lockData = {
        pid: process.pid,
        startTime: new Date().toISOString(),
        hostname: require('os').hostname()
      };
      await fs.writeFile(this.lockFile, JSON.stringify(lockData));
      logger.info(`Acquired vacuum lock (PID: ${process.pid})`);
    } catch (error) {
      logger.error('Failed to acquire lock:', error);
      throw error;
    }
  }

  async releaseLock() {
    try {
      await fs.unlink(this.lockFile);
      logger.info('Released vacuum lock');
    } catch (error) {
      // Lock file might not exist, that's okay
      logger.debug('Lock file already removed or not found');
    }
  }

  async getTableList() {
    try {
      // Simple table list - just the names
      const [tables] = await this.dbConnection.execute('SHOW TABLES');
      const tableNames = tables.map(row => Object.values(row)[0]);
      
      logger.info(`Found ${tableNames.length} tables in database`);
      return tableNames;
    } catch (error) {
      logger.error('Failed to get table list:', error);
      throw error;
    }
  }

  async getTableColumns(tableName) {
    try {
      const [columns] = await this.dbConnection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [tableName]);
      
      return columns;
    } catch (error) {
      logger.error(`Failed to get columns for table ${tableName}:`, error);
      return [];
    }
  }

  async hasTimestampColumn(tableName) {
    const columns = await this.getTableColumns(tableName);
    return columns.find(col => 
      col.COLUMN_NAME.includes('updated_at') || 
      col.COLUMN_NAME.includes('created_at') ||
      col.COLUMN_NAME.includes('timestamp') ||
      col.DATA_TYPE.includes('timestamp') ||
      col.DATA_TYPE.includes('datetime')
    );
  }

  async ingestTableData(tableName, lastRun) {
    try {
      const timestampCol = await this.hasTimestampColumn(tableName);
      
      let query;
      let params = [];
      
      if (timestampCol) {
        query = `SELECT * FROM ${tableName} WHERE ${timestampCol.COLUMN_NAME} > ? ORDER BY ${timestampCol.COLUMN_NAME} ASC`;
        params = [lastRun];
      } else {
        // If no timestamp, get all data (be careful with large tables)
        query = `SELECT * FROM ${tableName} LIMIT 1000`;
      }

      const [rows] = await this.dbConnection.execute(query, params);
      
      if (rows.length === 0) {
        logger.info(`No new data in table: ${tableName}`);
        return 0;
      }

      logger.info(`Found ${rows.length} new records in table: ${tableName}`);
      
      // Determine which collection to use based on table content
      const collectionName = this.determineCollection(tableName, rows[0]);
      
      // Process in batches
      let processed = 0;
      for (let i = 0; i < rows.length; i += this.batchSize) {
        const batch = rows.slice(i, i + this.batchSize);
        
        const documents = batch.map((row, index) => ({
          id: `${tableName}_${row.id || i + index}`,
          content: this.formatRowContent(tableName, row),
          metadata: this.sanitizeMetadata({
            source_table: tableName,
            ...row,
            original_id: row.id || (i + index)
          }),
          source: 'intelligent_vacuum'
        }));

        await this.vectorDB.addDocuments(collectionName, documents);
        processed += batch.length;
        
        logger.info(`Processed ${processed}/${rows.length} records from ${tableName}`);
        
        // Take a break for relationship formation
        if (i + this.batchSize < rows.length) {
          await new Promise(resolve => setTimeout(resolve, this.relationshipBreakMs));
        }
      }

      return processed;
    } catch (error) {
      logger.error(`Failed to ingest data from table ${tableName}:`, error);
      return 0;
    }
  }

  determineCollection(tableName, sampleRow) {
    // Intelligently determine which collection based on table name and content
    const tableLower = tableName.toLowerCase();
    
    if (tableLower.includes('product') || tableLower.includes('art') || tableLower.includes('item')) {
      return 'art_metadata';
    } else if (tableLower.includes('user') && tableLower.includes('interaction')) {
      return 'user_interactions';
    } else if (tableLower.includes('event')) {
      return 'event_data';
    } else if (tableLower.includes('feedback') || tableLower.includes('learning')) {
      return 'learning_feedback';
    } else {
      return 'site_content'; // Default collection
    }
  }

  calculateIntelligentBreak(recordsProcessed) {
    if (recordsProcessed === 0) {
      return 500; // Minimal break for empty tables
    }
    
    // Intelligent scaling based on data volume - NO ARBITRARY CAPS
    const baseBreakMs = 1000; // 1 second minimum
    const scalingFactor = recordsProcessed * 100; // 100ms per record for proper relationship formation
    
    // Let Leo take the time it needs - your business intelligence is worth it
    return baseBreakMs + scalingFactor;
  }

  sanitizeMetadata(metadata) {
    const sanitized = {};
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object') {
        sanitized[key] = JSON.stringify(value);
      } else {
        sanitized[key] = String(value);
      }
    });
    
    return sanitized;
  }

  formatRowContent(tableName, row) {
    const parts = [`Table: ${tableName}`];
    
    // Add all meaningful data dynamically
    Object.entries(row).forEach(([key, value]) => {
      if (value && typeof value === 'string' && key !== 'id' && value.length > 0) {
        parts.push(`${key}: ${value}`);
      } else if (value && typeof value === 'number' && key !== 'id') {
        parts.push(`${key}: ${value}`);
      }
    });

    return parts.join(' ').trim();
  }

  async runIntelligentVacuum() {
    // Check if already running from previous iteration
    if (await this.isAlreadyRunning()) {
      logger.info('⏭️ Vacuum already running from previous iteration, skipping this run');
      return { success: false, message: 'Already running', skipped: true };
    }

    try {
      // Acquire lock to prevent concurrent runs
      await this.acquireLock();
      
      logger.info('🧠 Starting intelligent vacuum ingestion...');
      
      const lastRun = await this.getLastRunTimestamp();
      logger.info(`Last run: ${lastRun}`);

      // Get simple table list
      const allTables = await this.getTableList();
      
      // Filter out excluded tables (handled by manual ingestion scripts)
      const tableNames = allTables.filter(table => !this.EXCLUDED_TABLES.includes(table));
      
      logger.info(`Found ${allTables.length} total tables`);
      logger.info(`Excluding ${this.EXCLUDED_TABLES.length} tables (handled by manual ingestion)`);
      logger.info(`Will process ${tableNames.length} tables with vacuum ingestion`);
      
      let totalProcessed = 0;
      const tableResults = {};
      
      // Process each table one by one with proper breaks
      logger.info(`Processing ${tableNames.length} tables one by one with relationship formation breaks`);
      
      for (const tableName of tableNames) {
        logger.info(`Processing table: ${tableName}`);
        
        const processed = await this.ingestTableData(tableName, lastRun);
        totalProcessed += processed;
        tableResults[tableName] = processed;
        
        // INTELLIGENT relationship formation pause based on data volume
        const intelligentBreakMs = this.calculateIntelligentBreak(processed);
        logger.info(`Taking ${intelligentBreakMs}ms intelligent break for relationship formation after ${tableName} (${processed} records)...`);
        await new Promise(resolve => setTimeout(resolve, intelligentBreakMs));
      }

      // Update last run timestamp
      await this.updateLastRunTimestamp();

      // Release lock
      await this.releaseLock();

      logger.info(`✅ Intelligent vacuum completed: ${totalProcessed} total records processed across ${tableNames.length} tables`);
      logger.info(`ℹ️  Excluded ${this.EXCLUDED_TABLES.length} tables handled by manual ingestion scripts`);
      return { 
        success: true, 
        totalProcessed, 
        tableResults, 
        tablesProcessed: tableNames.length,
        tablesExcluded: this.EXCLUDED_TABLES.length,
        excludedTables: this.EXCLUDED_TABLES
      };

    } catch (error) {
      logger.error('❌ Intelligent vacuum failed:', error);
      // Make sure to release lock even on failure
      await this.releaseLock();
      throw error;
    }
  }

  async cleanup() {
    if (this.dbConnection) {
      await this.dbConnection.end();
    }
  }
}

// Run vacuum if called directly
if (require.main === module) {
  const vacuum = new IntelligentVacuum();
  
  vacuum.initialize()
    .then(() => vacuum.runIntelligentVacuum())
    .then(result => {
      console.log('✅ Intelligent vacuum completed:', result);
      return vacuum.cleanup();
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Intelligent vacuum failed:', error);
      vacuum.cleanup().finally(() => process.exit(1));
    });
}

module.exports = IntelligentVacuum;
