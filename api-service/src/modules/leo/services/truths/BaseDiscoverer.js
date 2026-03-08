/**
 * Leo AI - Base Discoverer
 * 
 * Abstract base class for all truth discoverers.
 * Each discoverer implements pattern-seeking logic for a specific domain.
 * 
 * Discoverers must implement:
 * - discover() - Main discovery logic, returns array of truths
 * - validate(truth) - Re-validate an existing truth (optional)
 * 
 * Configuration:
 * - name: Unique identifier
 * - description: What this discoverer finds
 * - targetCollection: Which truth collection to store in
 * - runInterval: How often to run (ms)
 * - batchSize: How many items to process per run
 * - priority: 'high', 'medium', 'low'
 */

const logger = require('../logger');

class BaseDiscoverer {
  constructor(config = {}) {
    this.name = config.name || 'base_discoverer';
    this.description = config.description || 'Base truth discoverer';
    this.targetCollection = config.targetCollection || 'truth_patterns';
    this.runInterval = config.runInterval || 3600000; // 1 hour default
    this.batchSize = config.batchSize || 100;
    this.priority = config.priority || 'medium';
    
    // Runtime state
    this.isRunning = false;
    this.lastRun = null;
    this.lastRunDuration = null;
    this.totalTruthsDiscovered = 0;
    this.truthStore = null;
    this.vectorDB = null;
    
    // Stats for this run
    this.stats = {
      processed: 0,
      truthsFound: 0,
      errors: 0
    };
  }

  /**
   * Initialize the discoverer with dependencies
   */
  async initialize(dependencies = {}) {
    this.truthStore = dependencies.truthStore;
    this.vectorDB = dependencies.vectorDB;
    
    if (!this.truthStore) {
      throw new Error(`${this.name}: TruthStore dependency required`);
    }
    
    logger.info(`${this.name} initialized`);
  }

  /**
   * Main discovery method - MUST be implemented by subclasses
   * @returns {Promise<Array>} Array of discovered truths
   */
  async discover() {
    throw new Error(`${this.name}: discover() must be implemented by subclass`);
  }

  /**
   * Validate an existing truth - override in subclass if needed
   * @param {object} truth - The truth to validate
   * @returns {Promise<object>} Updated truth with new confidence, or null if invalid
   */
  async validate(truth) {
    // Default: truth is still valid
    return {
      ...truth,
      validated_at: new Date().toISOString(),
      validation_count: (truth.validation_count || 0) + 1
    };
  }

  /**
   * Run the discoverer
   */
  async run() {
    if (this.isRunning) {
      logger.warn(`${this.name} is already running, skipping`);
      return { skipped: true, reason: 'already_running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    // Reset stats
    this.stats = {
      processed: 0,
      truthsFound: 0,
      errors: 0
    };

    try {
      logger.info(`${this.name} starting discovery...`);
      
      // Run the discovery logic
      const truths = await this.discover();
      
      // Store discovered truths
      for (const truth of truths) {
        try {
          await this.truthStore.storeTruth(this.targetCollection, {
            ...truth,
            discoverer: this.name
          });
          this.stats.truthsFound++;
          this.totalTruthsDiscovered++;
        } catch (error) {
          logger.error(`${this.name}: Failed to store truth:`, error.message);
          this.stats.errors++;
        }
      }

      this.lastRunDuration = Date.now() - startTime;
      this.lastRun = new Date().toISOString();
      
      logger.info(`${this.name} completed: ${this.stats.truthsFound} truths in ${this.lastRunDuration}ms`);
      
      return {
        success: true,
        discoverer: this.name,
        stats: this.stats,
        duration: this.lastRunDuration
      };

    } catch (error) {
      logger.error(`${this.name} discovery failed:`, error);
      this.lastRunDuration = Date.now() - startTime;
      
      return {
        success: false,
        discoverer: this.name,
        error: error.message,
        stats: this.stats,
        duration: this.lastRunDuration
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get discoverer status
   */
  getStatus() {
    return {
      name: this.name,
      description: this.description,
      targetCollection: this.targetCollection,
      priority: this.priority,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      lastRunDuration: this.lastRunDuration,
      totalTruthsDiscovered: this.totalTruthsDiscovered,
      runInterval: this.runInterval
    };
  }

  /**
   * Calculate similarity between two vectors using cosine similarity
   * Utility method for discoverers
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Helper to batch process items with delay
   */
  async processBatch(items, processor, delayMs = 100) {
    const results = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await processor(items[i], i);
        if (result) results.push(result);
        this.stats.processed++;
      } catch (error) {
        logger.warn(`${this.name}: Error processing item ${i}:`, error.message);
        this.stats.errors++;
      }
      
      // Small delay to prevent overwhelming
      if (delayMs > 0 && i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return results;
  }
}

module.exports = BaseDiscoverer;
