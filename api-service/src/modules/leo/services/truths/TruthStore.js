/**
 * Leo AI - Truth Store
 * 
 * Manages storage and retrieval of discovered truths in ChromaDB.
 * Uses dedicated truth_* collections in the main ChromaDB instance.
 * 
 * Collections:
 * - truth_similarities: Entity similarity scores (products, users, artists, events)
 * - truth_patterns: Behavioral and preference patterns
 * - truth_correlations: Cross-entity correlations
 * - truth_meta: Meta-patterns (patterns across patterns)
 * - truth_temporal: Time-based patterns and seasonality
 * 
 * Each truth has:
 * - type: What kind of truth (similarity, pattern, correlation, meta)
 * - entities: What it relates to (IDs, types)
 * - score: The truth value (0-1 for similarity, etc.)
 * - confidence: How confident we are (0-1)
 * - evidence: Supporting data
 * - discoverer: Which module discovered it
 * - timestamps: discovered_at, validated_at, expires_at
 */

const { ChromaClient } = require('chromadb');
const logger = require('../logger');

class TruthStore {
  constructor() {
    this.client = null;
    this.collections = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Truth Store...');
      
      this.client = new ChromaClient({
        path: 'http://localhost:8000'
      });

      await this.initializeCollections();
      this.isInitialized = true;
      
      logger.info('Truth Store initialized successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize Truth Store:', error);
      throw error;
    }
  }

  async initializeCollections() {
    const collectionConfigs = [
      { 
        name: 'truth_similarities', 
        description: 'Entity similarity scores (products, users, artists, events)' 
      },
      { 
        name: 'truth_patterns', 
        description: 'Behavioral and preference patterns' 
      },
      { 
        name: 'truth_correlations', 
        description: 'Cross-entity correlations (e.g., color trends affect price)' 
      },
      { 
        name: 'truth_meta', 
        description: 'Meta-patterns discovered across other truths' 
      },
      { 
        name: 'truth_temporal', 
        description: 'Time-based patterns and seasonal truths' 
      }
    ];

    for (const config of collectionConfigs) {
      try {
        const collection = await this.client.getOrCreateCollection({
          name: config.name,
          metadata: { 
            description: config.description,
            type: 'truth_storage',
            created_at: new Date().toISOString()
          }
        });
        this.collections.set(config.name, collection);
        logger.info(`Truth collection '${config.name}' initialized`);
      } catch (error) {
        logger.error(`Failed to initialize truth collection '${config.name}':`, error);
      }
    }
  }

  /**
   * Generate a unique truth ID
   */
  generateTruthId(type, entities) {
    const entityStr = Array.isArray(entities) ? entities.sort().join('_') : entities;
    return `truth_${type}_${entityStr}`;
  }

  /**
   * Store a truth (upsert - will update if exists)
   * 
   * @param {string} collectionName - Which truth collection
   * @param {object} truth - The truth to store
   * @param {string} truth.type - Truth type (e.g., 'product_similarity', 'user_segment')
   * @param {array|string} truth.entities - Related entity IDs
   * @param {number} truth.score - The truth value (0-1)
   * @param {number} truth.confidence - Confidence level (0-1)
   * @param {object} truth.evidence - Supporting data
   * @param {string} truth.content - Searchable text description
   * @param {string} truth.discoverer - Which discoverer found this
   */
  async storeTruth(collectionName, truth) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Truth collection '${collectionName}' not found`);
      }

      const truthId = truth.id || this.generateTruthId(truth.type, truth.entities);
      
      // Build searchable content
      const content = truth.content || this.buildTruthContent(truth);
      
      // Build metadata (must be scalar values)
      const metadata = this.sanitizeMetadata({
        truth_type: truth.type,
        entities: Array.isArray(truth.entities) ? truth.entities.join(',') : String(truth.entities),
        entity_type: truth.entity_type || 'unknown',
        score: parseFloat(truth.score) || 0,
        confidence: parseFloat(truth.confidence) || 0.5,
        evidence_summary: typeof truth.evidence === 'object' ? JSON.stringify(truth.evidence) : String(truth.evidence || ''),
        discoverer: truth.discoverer || 'unknown',
        discovered_at: new Date().toISOString(),
        validated_at: new Date().toISOString(),
        expires_at: truth.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
        validation_count: parseInt(truth.validation_count) || 1,
        is_active: true
      });

      // Upsert the truth
      await collection.upsert({
        ids: [truthId],
        documents: [content],
        metadatas: [metadata]
      });

      logger.info(`Stored truth: ${truthId} (score: ${truth.score}, confidence: ${truth.confidence})`);
      return { success: true, truthId };

    } catch (error) {
      logger.error(`Failed to store truth in '${collectionName}':`, error);
      throw error;
    }
  }

  /**
   * Build searchable content from truth data
   */
  buildTruthContent(truth) {
    const parts = [];
    
    parts.push(`${truth.type} truth`);
    
    if (truth.entity_type) {
      parts.push(`Entity type: ${truth.entity_type}`);
    }
    
    if (truth.description) {
      parts.push(truth.description);
    }
    
    parts.push(`Score: ${truth.score}`);
    parts.push(`Confidence: ${truth.confidence}`);
    
    return parts.join(' | ');
  }

  /**
   * Sanitize metadata for ChromaDB (only scalar values)
   */
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

  /**
   * Query truths by type and entity
   */
  async queryTruths(collectionName, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Truth collection '${collectionName}' not found`);
      }

      const queryOptions = {
        nResults: options.limit || 10,
        include: ['documents', 'metadatas', 'distances']
      };

      // Build where filter
      if (options.filter) {
        queryOptions.where = options.filter;
      }

      // Semantic search if query provided
      if (options.query) {
        queryOptions.queryTexts = [options.query];
        const results = await collection.query(queryOptions);
        return this.formatQueryResults(results);
      }

      // Otherwise get all with filter
      const results = await collection.get({
        where: options.filter,
        limit: options.limit || 100,
        include: ['documents', 'metadatas']
      });

      return this.formatGetResults(results);

    } catch (error) {
      logger.error(`Failed to query truths from '${collectionName}':`, error);
      throw error;
    }
  }

  /**
   * Get similarity truths for an entity
   */
  async getSimilarities(entityType, entityId, limit = 10) {
    try {
      const results = await this.queryTruths('truth_similarities', {
        filter: {
          $and: [
            { entity_type: entityType },
            { is_active: true }
          ]
        },
        limit: 100
      });

      // Filter to truths involving this entity and sort by score
      const entityStr = String(entityId);
      const relevant = results
        .filter(t => t.metadata.entities.includes(entityStr))
        .sort((a, b) => b.metadata.score - a.metadata.score)
        .slice(0, limit);

      return relevant;

    } catch (error) {
      logger.error(`Failed to get similarities for ${entityType}:${entityId}:`, error);
      return [];
    }
  }

  /**
   * Format query results (semantic search)
   */
  formatQueryResults(results) {
    if (!results.documents || !results.documents[0]) {
      return [];
    }

    return results.documents[0].map((doc, index) => ({
      content: doc,
      metadata: results.metadatas[0][index],
      similarity: results.distances ? (1 - results.distances[0][index]) : null,
      id: results.ids[0][index]
    }));
  }

  /**
   * Format get results (filter-based)
   */
  formatGetResults(results) {
    if (!results.documents) {
      return [];
    }

    return results.documents.map((doc, index) => ({
      content: doc,
      metadata: results.metadatas[index],
      id: results.ids[index]
    }));
  }

  /**
   * Mark a truth as expired/invalid
   */
  async expireTruth(collectionName, truthId) {
    try {
      const collection = this.collections.get(collectionName);
      if (!collection) return false;

      await collection.update({
        ids: [truthId],
        metadatas: [{ is_active: false, expired_at: new Date().toISOString() }]
      });

      logger.info(`Expired truth: ${truthId}`);
      return true;

    } catch (error) {
      logger.error(`Failed to expire truth ${truthId}:`, error);
      return false;
    }
  }

  /**
   * Get statistics for all truth collections
   */
  async getStats() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const stats = {
        healthy: true,
        collections: {},
        totalTruths: 0,
        timestamp: new Date().toISOString()
      };

      for (const [name, collection] of this.collections) {
        try {
          const count = await collection.count();
          stats.collections[name] = { count };
          stats.totalTruths += count;
        } catch (error) {
          stats.collections[name] = { count: 0, error: error.message };
        }
      }

      return stats;

    } catch (error) {
      logger.error('Failed to get truth stats:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up expired truths
   */
  async cleanupExpired() {
    try {
      const now = new Date().toISOString();
      let cleaned = 0;

      for (const [name, collection] of this.collections) {
        try {
          // Get expired truths
          const expired = await collection.get({
            where: {
              $or: [
                { is_active: false },
                { expires_at: { $lt: now } }
              ]
            },
            include: ['metadatas']
          });

          if (expired.ids && expired.ids.length > 0) {
            await collection.delete({ ids: expired.ids });
            cleaned += expired.ids.length;
            logger.info(`Cleaned ${expired.ids.length} expired truths from ${name}`);
          }
        } catch (error) {
          logger.warn(`Error cleaning ${name}:`, error.message);
        }
      }

      return { cleaned, timestamp: now };

    } catch (error) {
      logger.error('Failed to cleanup expired truths:', error);
      return { cleaned: 0, error: error.message };
    }
  }
}

// Singleton
let instance = null;

function getTruthStore() {
  if (!instance) {
    instance = new TruthStore();
  }
  return instance;
}

module.exports = {
  TruthStore,
  getTruthStore
};
