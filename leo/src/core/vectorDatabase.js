const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger');

class VectorDatabase {
  constructor() {
    this.client = null;
    this.collections = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        host: "localhost",
        port: 8000
      });

      await this.initializeCollections();
      this.isInitialized = true;
      logger.info('Vector database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize vector database:', error);
      throw error;
    }
  }

  async initializeCollections() {
    const collectionConfigs = [
      { name: 'art_metadata', description: 'Art and product metadata' },
      { name: 'user_interactions', description: 'User behavior and preferences' },
      { name: 'site_content', description: 'Website content and pages' },
      { name: 'event_data', description: 'Event and activity data' },
      { name: 'learning_feedback', description: 'AI learning and feedback data' }
    ];

    for (const config of collectionConfigs) {
      try {
        const collection = await this.client.getOrCreateCollection({
          name: config.name,
          metadata: { description: config.description }
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

      const ids = documents.map((_, index) => `doc_${Date.now()}_${index}`);
      const texts = documents.map(doc => doc.content || JSON.stringify(doc));
      const metadatas = documents.map(doc => doc.metadata || {});

      await collection.add({
        ids: ids,
        documents: texts,
        metadatas: metadatas
      });

      logger.info(`Added ${documents.length} documents to collection '${collectionName}'`);
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

      const formattedResults = results.documents[0].map((doc, index) => ({
        content: doc,
        metadata: results.metadatas[0][index],
        similarity: 1 - results.distances[0][index],
        id: results.ids[0][index]
      }));

      logger.info(`Semantic search completed: ${formattedResults.length} results for query "${query}"`);
      return formattedResults;

    } catch (error) {
      logger.error(`Semantic search failed:`, error);
      throw error;
    }
  }

  async multiSearch(query, collections = [], options = {}) {
    try {
      const searchCollections = collections.length > 0 
        ? collections 
        : ['art_metadata', 'site_content', 'user_interactions'];

      const searchPromises = searchCollections.map(async (collectionName) => {
        try {
          const results = await this.semanticSearch(query, collectionName, {
            limit: options.limitPerCollection || 5,
            filter: options.filter
          });
          return results.map(result => ({
            ...result,
            collection: collectionName
          }));
        } catch (error) {
          logger.warn(`Search failed for collection '${collectionName}':`, error);
          return [];
        }
      });

      const allResults = await Promise.all(searchPromises);
      const flatResults = allResults.flat();

      // Sort by similarity and limit total results
      const sortedResults = flatResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options.totalLimit || 15);

      logger.info(`Multi-search completed: ${sortedResults.length} total results across ${searchCollections.length} collections`);
      return sortedResults;

    } catch (error) {
      logger.error('Multi-search failed:', error);
      throw error;
    }
  }
}

module.exports = VectorDatabase;
