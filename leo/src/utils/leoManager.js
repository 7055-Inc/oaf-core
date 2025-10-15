/**
 * Leo AI Platform - System Manager
 * Comprehensive management and initialization for Leo AI
 */

const VectorDatabase = require('../core/vectorDatabase');
const TruthVectorDatabase = require('../core/truthVectorDatabase');
const CentralBrain = require('../core/centralBrain');
const ContinuousTruthDiscovery = require('../services/continuousTruthDiscovery');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [LEO-MANAGER] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/manager.log') }),
    new winston.transports.Console()
  ]
});

class LeoManager {
  constructor() {
    this.vectorDB = new VectorDatabase();
    this.truthDB = new TruthVectorDatabase();
    this.centralBrain = new CentralBrain();
    this.continuousDiscovery = new ContinuousTruthDiscovery();
    this.isInitialized = false;
    this.services = {
      vector: false,
      truth: false,
      brain: false,
      discovery: false
    };
  }

  /**
   * Get Central Brain instance
   */
  get brain() {
    return this.centralBrain;
  }

  /**
   * Initialize all Leo AI services
   */
  async initialize() {
    try {
      logger.info('🎨 [LEO] Starting Leo AI Platform initialization...');

      // Check Python dependencies
      await this.checkPythonDependencies();

      // Initialize services in order
      await this.initializeVectorDatabase();
      await this.initializeTruthDatabase();
      await this.initializeCentralBrain();
      await this.initializeContinuousDiscovery();

      // Run initial health checks
      const health = await this.getSystemHealth();
      
      if (health.overall === 'healthy') {
        this.isInitialized = true;
        logger.info('🎨 [LEO] Leo AI Platform initialized successfully!', {
          services: this.services,
          collections: health.vector?.collections || 0,
          totalDocuments: health.vector?.totalDocuments || 0
        });
      } else {
        throw new Error('System health check failed after initialization');
      }

      return {
        success: true,
        services: this.services,
        health
      };

    } catch (error) {
      logger.error('🎨 [LEO] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize vector database
   */
  async initializeVectorDatabase() {
    try {
      logger.info('Initializing vector database...');
      await this.vectorDB.initialize();
      this.services.vector = true;
      logger.info('✅ Vector database initialized');
    } catch (error) {
      logger.error('❌ Vector database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize truth vector database
   */
  async initializeTruthDatabase() {
    try {
      logger.info('Initializing truth vector database...');
      await this.truthDB.initialize();
      this.services.truth = true;
      logger.info('✅ Truth vector database initialized');
    } catch (error) {
      logger.error('❌ Truth database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize central brain
   */
  async initializeCentralBrain() {
    try {
      logger.info('Initializing central brain...');
      await this.centralBrain.initialize();
      this.services.brain = true;
      logger.info('✅ Central brain initialized');
    } catch (error) {
      logger.error('❌ Central brain initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize continuous truth discovery
   */
  async initializeContinuousDiscovery() {
    try {
      logger.info('Initializing continuous truth discovery...');
      await this.continuousDiscovery.initialize();
      this.services.discovery = true;
      logger.info('✅ Continuous truth discovery initialized');
    } catch (error) {
      logger.error('❌ Continuous discovery initialization failed:', error);
      // Don't throw - discovery can be optional
      logger.warn('Continuing without continuous discovery');
    }
  }

  /**
   * Check Python dependencies
   */
  async checkPythonDependencies() {
    try {
      logger.info('Checking Python dependencies...');
      
      const { spawn } = require('child_process');
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../python/embedding_service.py'),
        'test'
      ]);

      return new Promise((resolve, reject) => {
        let result = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
          result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          error += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            logger.info('✅ Python dependencies verified');
            resolve(true);
          } else {
            logger.error('❌ Python dependency check failed:', error);
            reject(new Error(`Python dependencies not available: ${error}`));
          }
        });
      });

    } catch (error) {
      logger.error('Python dependency check failed:', error);
      throw error;
    }
  }

  /**
   * Start continuous truth discovery
   */
  async startContinuousDiscovery() {
    try {
      if (!this.services.discovery) {
        logger.warn('Continuous discovery service not available');
        return { success: false, message: 'Discovery service not initialized' };
      }

      logger.info('🎨 [LEO] Starting continuous truth discovery...');
      const result = await this.continuousDiscovery.startContinuousDiscovery();
      
      logger.info('🎨 [LEO] Continuous discovery started', result);
      return result;

    } catch (error) {
      logger.error('Failed to start continuous discovery:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start scheduled services
   */
  async startScheduledServices() {
    try {
      // Start continuous truth discovery if available
      if (this.services.discovery) {
        await this.startContinuousDiscovery();
        logger.info('🎨 [LEO] Continuous discovery started');
      }

      // Note: Data ingestion is handled by vacuum-ingestion.js script
      
      return { success: true };

    } catch (error) {
      logger.error('Failed to start scheduled services:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive system health
   */
  async getSystemHealth() {
    try {
      const health = {
        overall: 'healthy',
        timestamp: new Date().toISOString(),
        services: this.services,
        details: {}
      };

      // Check vector database
      if (this.services.vector) {
        health.details.vector = await this.vectorDB.healthCheck();
        if (!health.details.vector.healthy) {
          health.overall = 'degraded';
        }
      }

      // Check truth database
      if (this.services.truth) {
        health.details.truth = await this.truthDB.healthCheck();
        if (!health.details.truth.healthy) {
          health.overall = 'degraded';
        }
      }

      // Check central brain
      if (this.services.brain) {
        health.details.brain = await this.centralBrain.healthCheck();
        if (!health.details.brain.healthy) {
          health.overall = 'degraded';
        }
      }

      // Check continuous discovery
      if (this.services.discovery) {
        health.details.discovery = await this.continuousDiscovery.getDiscoveryStats();
        if (!health.details.discovery.system_status?.is_running) {
          health.overall = 'degraded';
        }
      }

      // Aggregate stats
      if (health.details.vector) {
        health.vector = {
          collections: health.details.vector.collections || 0,
          totalDocuments: health.details.vector.totalDocuments || 0
        };
      }

      if (health.details.brain) {
        health.brain = {
          initialized: health.details.brain.initialized || false
        };
      }

      if (health.details.truth) {
        health.truth = {
          collections: health.details.truth.collections || 0,
          totalTruths: health.details.truth.totalTruths || 0
        };
      }

      return health;

    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        overall: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate system status report
   */
  async generateStatusReport() {
    try {
      const health = await this.getSystemHealth();
      const stats = this.services.vector ? await this.vectorDB.getAllStats() : {};
      
      const report = {
        system: {
          name: 'Leo AI Platform',
          version: '1.0.0',
          status: health.overall,
          initialized: this.isInitialized,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        },
        services: this.services,
        health: health.details,
        vector_stats: stats,
        recommendations: []
      };

      // Add recommendations based on health
      if (health.overall !== 'healthy') {
        report.recommendations.push('System health is degraded - check service logs');
      }

      if (health.vector && health.vector.totalDocuments === 0) {
        report.recommendations.push('No documents in vector database - run data ingestion');
      }

      if (!this.services.brain) {
        report.recommendations.push('Central brain not available - check brain initialization');
      }

      if (!this.services.discovery) {
        report.recommendations.push('Continuous discovery not running - truth extraction may be limited');
      }

      return report;

    } catch (error) {
      logger.error('Failed to generate status report:', error);
      return {
        system: {
          name: 'Leo AI Platform',
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown() {
    try {
      logger.info('🎨 [LEO] Shutting down Leo AI Platform...');

      // Stop continuous discovery
      if (this.services.discovery) {
        await this.continuousDiscovery.stopContinuousDiscovery();
      }

      // Reset service states
      this.services = {
        vector: false,
        truth: false,
        brain: false,
        discovery: false
      };

      this.isInitialized = false;
      
      logger.info('🎨 [LEO] Leo AI Platform shutdown complete');

    } catch (error) {
      logger.error('Shutdown error:', error);
      throw error;
    }
  }

  /**
   * Quick test of all systems
   */
  async runSystemTest() {
    try {
      logger.info('🎨 [LEO] Running system test...');

      const testResults = {
        vector_db: false,
        truth_db: false,
        embeddings: false,
        search: false,
        brain: false,
        overall: false
      };

      // Test vector database
      try {
        const vectorHealth = await this.vectorDB.healthCheck();
        testResults.vector_db = vectorHealth.healthy;
      } catch (error) {
        logger.error('Vector DB test failed:', error);
      }

      // Test embeddings
      try {
        const testDoc = {
          id: 'test_doc',
          content: 'This is a test document for Leo AI system verification',
          metadata: { type: 'test', timestamp: new Date().toISOString() },
          source: 'system_test'
        };

        await this.vectorDB.addDocuments('site_content', [testDoc]);
        testResults.embeddings = true;
      } catch (error) {
        logger.error('Embeddings test failed:', error);
      }

      // Test search
      try {
        const searchResults = await this.vectorDB.semanticSearch(
          'test document verification',
          'site_content',
          { limit: 1 }
        );
        testResults.search = searchResults.length > 0;
      } catch (error) {
        logger.error('Search test failed:', error);
      }

      // Test truth database
      try {
        const truthHealth = await this.truthDB.healthCheck();
        testResults.truth_db = truthHealth.healthy;
      } catch (error) {
        logger.error('Truth database test failed:', error);
      }

      // Test central brain
      try {
        const brainHealth = await this.centralBrain.healthCheck();
        testResults.brain = brainHealth.healthy;
      } catch (error) {
        logger.error('Central brain test failed:', error);
      }

      // Overall test result
      testResults.overall = Object.values(testResults).every(result => result === true);

      logger.info('🎨 [LEO] System test completed', testResults);
      return testResults;

    } catch (error) {
      logger.error('System test failed:', error);
      return { overall: false, error: error.message };
    }
  }
}

module.exports = LeoManager;
