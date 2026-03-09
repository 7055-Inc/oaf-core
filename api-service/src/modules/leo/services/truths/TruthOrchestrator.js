/**
 * Leo AI - Truth Orchestrator
 * 
 * The "switchboard" that schedules and runs all truth discoverers.
 * 
 * Features:
 * - Registers and manages discoverers
 * - Schedules runs based on each discoverer's interval
 * - Prevents overlapping runs ("skip if still running")
 * - Tracks statistics and health
 * - Provides manual trigger API
 * 
 * Run Modes:
 * - Scheduled: Each discoverer runs on its own interval
 * - Manual: Trigger specific discoverers via API
 * - Full: Run all discoverers sequentially
 */

const { getTruthStore } = require('./TruthStore');
const { getVectorDB } = require('../vectorDB');
const logger = require('../logger');
const db = require('../../../../../config/db');

// Import discoverers
const ProductSimilarityDiscoverer = require('./discoverers/ProductSimilarityDiscoverer');
const UserSimilarityDiscoverer = require('./discoverers/UserSimilarityDiscoverer');
const MetaPatternDiscoverer = require('./discoverers/MetaPatternDiscoverer');
const BehavioralPatternDiscoverer = require('./discoverers/BehavioralPatternDiscoverer');
const EventPerformanceDiscoverer = require('./discoverers/EventPerformanceDiscoverer');

class TruthOrchestrator {
  constructor() {
    this.discoverers = new Map();
    this.schedules = new Map(); // Interval timers
    this.isInitialized = false;
    this.isRunning = false;
    this.lastFullRun = null;
    
    this.stats = {
      totalRuns: 0,
      totalTruthsDiscovered: 0,
      lastRun: null,
      errors: 0
    };
  }

  /**
   * Initialize the orchestrator and all discoverers
   */
  async initialize() {
    try {
      logger.info('Initializing Truth Orchestrator...');

      // Get dependencies
      const truthStore = getTruthStore();
      const vectorDB = getVectorDB();

      // Initialize truth store
      if (!truthStore.isInitialized) {
        await truthStore.initialize();
      }

      // Initialize vector DB
      if (!vectorDB.isInitialized) {
        await vectorDB.initialize();
      }

      // Register all discoverers
      await this.registerDiscoverer(new ProductSimilarityDiscoverer(), { truthStore, vectorDB });
      await this.registerDiscoverer(new UserSimilarityDiscoverer(), { truthStore, vectorDB });
      await this.registerDiscoverer(new MetaPatternDiscoverer(), { truthStore, vectorDB });
      await this.registerDiscoverer(new BehavioralPatternDiscoverer(), { truthStore, vectorDB, db });
      await this.registerDiscoverer(new EventPerformanceDiscoverer(), { truthStore, vectorDB, db });

      this.isInitialized = true;
      logger.info(`Truth Orchestrator initialized with ${this.discoverers.size} discoverers`);
      
      return { success: true, discoverers: this.getDiscovererList() };

    } catch (error) {
      logger.error('Failed to initialize Truth Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Register a discoverer
   */
  async registerDiscoverer(discoverer, dependencies) {
    try {
      await discoverer.initialize(dependencies);
      this.discoverers.set(discoverer.name, discoverer);
      logger.info(`Registered discoverer: ${discoverer.name}`);
    } catch (error) {
      logger.error(`Failed to register discoverer ${discoverer.name}:`, error);
    }
  }

  /**
   * Start scheduled discovery (runs in background)
   */
  startScheduled() {
    if (this.isRunning) {
      logger.warn('Orchestrator is already running');
      return { success: false, reason: 'already_running' };
    }

    logger.info('Starting scheduled truth discovery...');
    this.isRunning = true;

    for (const [name, discoverer] of this.discoverers) {
      // Set up interval for each discoverer
      const interval = setInterval(async () => {
        // Skip if discoverer is already running
        if (discoverer.isRunning) {
          logger.info(`Skipping ${name} - still running from previous invocation`);
          return;
        }

        try {
          await discoverer.run();
          this.stats.totalRuns++;
          this.stats.totalTruthsDiscovered += discoverer.stats.truthsFound;
          this.stats.lastRun = new Date().toISOString();
        } catch (error) {
          logger.error(`Scheduled run of ${name} failed:`, error);
          this.stats.errors++;
        }
      }, discoverer.runInterval);

      this.schedules.set(name, interval);
      logger.info(`Scheduled ${name} to run every ${discoverer.runInterval / 1000 / 60} minutes`);
    }

    return { success: true, message: 'Scheduled discovery started' };
  }

  /**
   * Stop scheduled discovery
   */
  stopScheduled() {
    logger.info('Stopping scheduled truth discovery...');
    
    for (const [name, interval] of this.schedules) {
      clearInterval(interval);
      logger.info(`Stopped schedule for ${name}`);
    }
    
    this.schedules.clear();
    this.isRunning = false;
    
    return { success: true, message: 'Scheduled discovery stopped' };
  }

  /**
   * Run a specific discoverer manually
   */
  async runDiscoverer(name) {
    const discoverer = this.discoverers.get(name);
    
    if (!discoverer) {
      return { success: false, error: `Discoverer '${name}' not found` };
    }

    if (discoverer.isRunning) {
      return { success: false, error: `Discoverer '${name}' is already running` };
    }

    try {
      logger.info(`Manually triggering ${name}...`);
      const result = await discoverer.run();
      
      this.stats.totalRuns++;
      this.stats.totalTruthsDiscovered += discoverer.stats.truthsFound;
      this.stats.lastRun = new Date().toISOString();
      
      return result;

    } catch (error) {
      this.stats.errors++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all discoverers sequentially
   */
  async runAll() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    logger.info('Running all discoverers...');
    const results = {};

    // Sort by priority (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...this.discoverers.entries()]
      .sort((a, b) => priorityOrder[a[1].priority] - priorityOrder[b[1].priority]);

    for (const [name, discoverer] of sorted) {
      try {
        logger.info(`Running ${name}...`);
        results[name] = await discoverer.run();
        
        this.stats.totalRuns++;
        this.stats.totalTruthsDiscovered += discoverer.stats.truthsFound;
      } catch (error) {
        logger.error(`Discoverer ${name} failed:`, error);
        results[name] = { success: false, error: error.message };
        this.stats.errors++;
      }
    }

    this.lastFullRun = new Date().toISOString();
    this.stats.lastRun = this.lastFullRun;

    return {
      success: true,
      results,
      totalTruthsDiscovered: Object.values(results)
        .reduce((sum, r) => sum + (r.stats?.truthsFound || 0), 0),
      timestamp: this.lastFullRun
    };
  }

  /**
   * Get list of registered discoverers
   */
  getDiscovererList() {
    return [...this.discoverers.values()].map(d => d.getStatus());
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      scheduledRunning: this.isRunning,
      discoverers: this.getDiscovererList(),
      stats: this.stats,
      lastFullRun: this.lastFullRun,
      scheduledCount: this.schedules.size
    };
  }

  /**
   * Clean up expired truths
   */
  async cleanup() {
    try {
      const truthStore = getTruthStore();
      return await truthStore.cleanupExpired();
    } catch (error) {
      logger.error('Cleanup failed:', error);
      return { cleaned: 0, error: error.message };
    }
  }
}

// Singleton
let instance = null;

function getTruthOrchestrator() {
  if (!instance) {
    instance = new TruthOrchestrator();
  }
  return instance;
}

module.exports = {
  TruthOrchestrator,
  getTruthOrchestrator
};
