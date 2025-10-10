/**
 * Leo AI Platform - System Manager
 * Comprehensive management and initialization for Leo AI
 */

const VectorDatabase = require('../core/vectorDatabase');
const DataIngestionService = require('../tools/dataIngestion');
const AILearningSystem = require('../learning/aiLearningSystem');
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
    this.ingestionService = new DataIngestionService();
    this.learningSystem = new AILearningSystem();
    this.isInitialized = false;
    this.services = {
      vector: false,
      ingestion: false,
      learning: false
    };
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
      await this.initializeLearningSystem();
      await this.initializeIngestionService();

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
   * Initialize learning system
   */
  async initializeLearningSystem() {
    try {
      logger.info('Initializing AI learning system...');
      await this.learningSystem.initialize();
      this.services.learning = true;
      logger.info('✅ AI learning system initialized');
    } catch (error) {
      logger.error('❌ Learning system initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize data ingestion service
   */
  async initializeIngestionService() {
    try {
      logger.info('Initializing data ingestion service...');
      await this.ingestionService.initialize();
      this.services.ingestion = true;
      logger.info('✅ Data ingestion service initialized');
    } catch (error) {
      logger.error('❌ Data ingestion initialization failed:', error);
      // Don't throw - ingestion can be optional
      logger.warn('Continuing without data ingestion service');
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
   * Run initial data ingestion
   */
  async runInitialIngestion() {
    try {
      if (!this.services.ingestion) {
        logger.warn('Data ingestion service not available');
        return { success: false, message: 'Ingestion service not initialized' };
      }

      logger.info('🎨 [LEO] Running initial data ingestion...');
      const result = await this.ingestionService.runFullIngestion();
      
      logger.info('🎨 [LEO] Initial ingestion completed', result.summary);
      return result;

    } catch (error) {
      logger.error('Initial ingestion failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start scheduled services
   */
  async startScheduledServices() {
    try {
      if (this.services.ingestion) {
        this.ingestionService.startScheduledIngestion();
        logger.info('🎨 [LEO] Scheduled ingestion started');
      }

      // Add other scheduled services here as needed
      
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

      // Check learning system
      if (this.services.learning) {
        health.details.learning = await this.learningSystem.getSystemHealth();
        if (health.details.learning.status !== 'healthy') {
          health.overall = 'degraded';
        }
      }

      // Check ingestion service
      if (this.services.ingestion) {
        health.details.ingestion = await this.ingestionService.healthCheck();
        if (health.details.ingestion.status !== 'healthy') {
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

      if (health.details.learning) {
        health.learning = {
          metrics: health.details.learning.metrics || {}
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

      if (!this.services.ingestion) {
        report.recommendations.push('Data ingestion service not available - check database connection');
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

      // Close database connections
      if (this.ingestionService.dbConnection) {
        await this.ingestionService.dbConnection.end();
      }

      // Reset service states
      this.services = {
        vector: false,
        ingestion: false,
        learning: false
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
        embeddings: false,
        search: false,
        learning: false,
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

      // Test learning system
      try {
        const learningHealth = await this.learningSystem.getSystemHealth();
        testResults.learning = learningHealth.status === 'healthy';
      } catch (error) {
        logger.error('Learning system test failed:', error);
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
