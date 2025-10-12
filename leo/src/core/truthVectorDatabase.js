const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger');

class TruthVectorDatabase {
  constructor() {
    this.client = null;
    this.collections = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        host: "localhost",
        port: 8001,  // Different port for truth database
        ssl: false
      });

      await this.initializeCollections();
      this.isInitialized = true;
      logger.info('Truth Vector database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize truth vector database:', error);
      throw error;
    }
  }

  async initializeCollections() {
    const truthCollectionConfigs = [
      { name: 'user_truths', description: 'User preference patterns and truths' },
      { name: 'behavioral_truths', description: 'User behavior patterns and correlations' },
      { name: 'content_truths', description: 'Content preference and interaction truths' },
      { name: 'pattern_truths', description: 'Cross-pattern correlations and meta-patterns' },
      { name: 'temporal_truths', description: 'Time-based patterns and seasonal truths' }
    ];

    for (const config of truthCollectionConfigs) {
      try {
        const collection = await this.client.getOrCreateCollection({
          name: config.name,
          metadata: { description: config.description, type: 'truth_storage' }
        });
        this.collections.set(config.name, collection);
        logger.info(`Truth collection '${config.name}' initialized`);
      } catch (error) {
        logger.error(`Failed to initialize truth collection '${config.name}':`, error);
      }
    }
  }

  async storeTruth(collectionName, truth) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Truth collection '${collectionName}' not found`);
      }

      const truthId = `truth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const truthText = typeof truth.content === 'string' ? truth.content : JSON.stringify(truth.content);
      
      await collection.add({
        ids: [truthId],
        documents: [truthText],
        metadatas: [{
          ...truth.metadata,
          confidence: truth.confidence || 0.5,
          source: truth.source || 'llama_extraction',
          timestamp: new Date().toISOString(),
          truth_type: truth.type || 'pattern'
        }]
      });

      logger.info(`Stored truth in collection '${collectionName}': ${truthId}`);
      return { success: true, truthId };

    } catch (error) {
      logger.error(`Failed to store truth in collection '${collectionName}':`, error);
      throw error;
    }
  }

  async searchTruths(query, collectionName, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Truth collection '${collectionName}' not found`);
      }

      const queryOptions = {
        queryTexts: [query],
        nResults: options.limit || 10,
        include: ['documents', 'metadatas', 'distances']
      };
      
      if (options.filter && Object.keys(options.filter).length > 0) {
        queryOptions.where = options.filter;
      }
      
      const results = await collection.query(queryOptions);

      const formattedResults = results.documents[0].map((doc, index) => ({
        content: doc,
        metadata: results.metadatas[0][index],
        confidence: results.metadatas[0][index].confidence || 0.5,
        similarity: 1 - results.distances[0][index],
        truthId: results.ids[0][index]
      }));

      logger.info(`Truth search completed: ${formattedResults.length} results for query "${query}"`);
      return formattedResults;

    } catch (error) {
      logger.error(`Truth search failed:`, error);
      throw error;
    }
  }

  async searchAllTruths(query, options = {}) {
    try {
      const truthCollections = ['user_truths', 'behavioral_truths', 'content_truths', 'pattern_truths', 'temporal_truths'];

      const searchPromises = truthCollections.map(async (collectionName) => {
        try {
          const results = await this.searchTruths(query, collectionName, {
            limit: options.limitPerCollection || 3,
            filter: options.filter
          });
          return results.map(result => ({
            ...result,
            collection: collectionName
          }));
        } catch (error) {
          logger.warn(`Truth search failed for collection '${collectionName}':`, error);
          return [];
        }
      });

      const allResults = await Promise.all(searchPromises);
      const flatResults = allResults.flat();

      // Sort by confidence and similarity
      const sortedResults = flatResults
        .sort((a, b) => (b.confidence * b.similarity) - (a.confidence * a.similarity))
        .slice(0, options.totalLimit || 10);

      logger.info(`Multi-truth search completed: ${sortedResults.length} total results across ${truthCollections.length} collections`);
      return sortedResults;

    } catch (error) {
      logger.error('Multi-truth search failed:', error);
      throw error;
    }
  }

  /**
   * Health check for truth vector database
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return {
          healthy: false,
          error: 'Truth vector database not initialized',
          collections: 0,
          totalTruths: 0
        };
      }

      // Check if we can connect to Truth ChromaDB
      const collections = Array.from(this.collections.keys());
      let totalTruths = 0;

      // Count truths in each collection
      for (const collectionName of collections) {
        try {
          const collection = this.collections.get(collectionName);
          const count = await collection.count();
          totalTruths += count;
        } catch (error) {
          logger.warn(`Failed to count truths in collection '${collectionName}':`, error);
        }
      }

      return {
        healthy: true,
        collections: collections.length,
        totalTruths,
        collectionNames: collections,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Truth vector database health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        collections: 0,
        totalTruths: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all truth statistics
   */
  async getAllStats() {
    try {
      const health = await this.healthCheck();
      if (!health.healthy) {
        return health;
      }

      const stats = {
        ...health,
        collectionStats: {}
      };

      // Get detailed stats for each collection
      for (const collectionName of health.collectionNames) {
        try {
          const collection = this.collections.get(collectionName);
          const count = await collection.count();
          
          stats.collectionStats[collectionName] = {
            truthCount: count,
            lastUpdated: new Date().toISOString()
          };
        } catch (error) {
          logger.warn(`Failed to get stats for truth collection '${collectionName}':`, error);
          stats.collectionStats[collectionName] = {
            truthCount: 0,
            error: error.message
          };
        }
      }

      return stats;

    } catch (error) {
      logger.error('Failed to get truth database stats:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = TruthVectorDatabase;
