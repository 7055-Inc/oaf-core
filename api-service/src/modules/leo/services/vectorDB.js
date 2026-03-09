/**
 * Leo VectorDB Service
 * 
 * Handles ChromaDB connection for vector storage and semantic search
 * Part of the Leo AI module within api-service
 */

const { ChromaClient } = require('chromadb');
const { DefaultEmbeddingFunction } = require('@chroma-core/default-embed');
const logger = require('./logger');

class VectorDatabase {
  constructor() {
    this.client = null;
    this.collections = new Map();
    this.isInitialized = false;
    this.embeddingFunction = null;
  }

  async initialize() {
    try {
      const host = process.env.CHROMA_HOST || 'localhost';
      const port = process.env.CHROMA_PORT || 8000;
      
      this.client = new ChromaClient({
        host,
        port: parseInt(port),
        ssl: false
      });

      // Initialize embedding function
      this.embeddingFunction = new DefaultEmbeddingFunction();

      await this.initializeCollections();
      this.isInitialized = true;
      logger.info('Vector database initialized successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize vector database:', error);
      throw error;
    }
  }

  async initializeCollections() {
    const collectionConfigs = [
      { name: 'art_metadata', description: 'Art and product metadata' },
      { name: 'user_profiles', description: 'User profiles and preferences' },
      { name: 'user_behavior', description: 'User behavioral patterns from ClickHouse analytics' },
      { name: 'user_interactions', description: 'User purchase history and order data' },
      { name: 'site_content', description: 'Website content and pages' },
      { name: 'event_data', description: 'Event and activity data' },
      { name: 'reviews', description: 'Reviews for events, products, artists, and promoters' },
      { name: 'learning_feedback', description: 'AI learning and feedback data' }
    ];

    for (const config of collectionConfigs) {
      try {
        const collection = await this.client.getOrCreateCollection({
          name: config.name,
          metadata: { description: config.description },
          embeddingFunction: this.embeddingFunction
        });
        this.collections.set(config.name, collection);
        logger.info(`Collection '${config.name}' initialized`);
      } catch (error) {
        logger.error(`Failed to initialize collection '${config.name}':`, error);
      }
    }
  }

  async addDocuments(collectionName, documents) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection '${collectionName}' not found`);
      }

      const ids = documents.map((doc, index) => doc.id || `doc_${Date.now()}_${index}`);
      const texts = documents.map(doc => doc.content || JSON.stringify(doc));
      const metadatas = documents.map(doc => doc.metadata || {});

      // Use upsert for idempotent operations (safe re-runs)
      await collection.upsert({
        ids: ids,
        documents: texts,
        metadatas: metadatas
      });

      logger.info(`Upserted ${documents.length} documents to collection '${collectionName}'`);
      return { success: true, count: documents.length };

    } catch (error) {
      logger.error(`Failed to add documents to collection '${collectionName}':`, error);
      throw error;
    }
  }

  async semanticSearch(query, collectionName, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection '${collectionName}' not found`);
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

      if (!results.documents[0] || results.documents[0].length === 0) {
        return [];
      }

      const formattedResults = results.documents[0].map((doc, index) => ({
        content: doc,
        metadata: results.metadatas[0][index],
        similarity: 1 - results.distances[0][index],
        id: results.ids[0][index]
      }));

      logger.info(`Semantic search completed: ${formattedResults.length} results for query "${query.substring(0, 50)}..."`);
      return formattedResults;

    } catch (error) {
      logger.error(`Semantic search failed:`, error);
      throw error;
    }
  }

  async updateDocumentMetadata(collectionName, documentId, newMetadata) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection '${collectionName}' not found`);
      }

      const existing = await collection.get({
        ids: [documentId],
        include: ['metadatas', 'documents']
      });

      if (!existing.ids || !existing.ids.length) {
        return { success: false, reason: 'Document not found' };
      }

      const mergedMetadata = {
        ...(existing.metadatas[0] || {}),
        ...newMetadata
      };

      await collection.update({
        ids: [documentId],
        metadatas: [mergedMetadata]
      });

      logger.info(`Updated metadata for '${documentId}' in '${collectionName}'`);
      return { success: true };

    } catch (error) {
      logger.error(`Failed to update metadata for '${documentId}' in '${collectionName}':`, error);
      throw error;
    }
  }

  getCollection(name) {
    return this.collections.get(name) || null;
  }

  async getCollectionStats() {
    const stats = {};
    for (const [name, collection] of this.collections) {
      try {
        const count = await collection.count();
        stats[name] = { count };
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }
    return stats;
  }

  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { healthy: false, reason: 'Not initialized' };
      }
      
      // Try to get heartbeat
      const heartbeat = await this.client.heartbeat();
      const stats = await this.getCollectionStats();
      
      return {
        healthy: true,
        heartbeat,
        collections: stats
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
let instance = null;

function getVectorDB() {
  if (!instance) {
    instance = new VectorDatabase();
  }
  return instance;
}

module.exports = {
  VectorDatabase,
  getVectorDB
};
