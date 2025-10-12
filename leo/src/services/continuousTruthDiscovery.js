const TruthExtractor = require('./truthExtractor');
const VectorDatabase = require('../core/vectorDatabase');
const TruthVectorDatabase = require('../core/truthVectorDatabase');
const logger = require('../utils/logger');

class ContinuousTruthDiscovery {
  constructor() {
    this.truthExtractor = new TruthExtractor();
    this.mainDB = new VectorDatabase();
    this.truthDB = new TruthVectorDatabase();
    
    // Discovery state
    this.isRunning = false;
    this.lastProcessedTimestamp = null;
    this.processedDocuments = new Set();
    this.truthValidityCache = new Map();
    
    // Configuration
    this.config = {
      primaryCrawlInterval: 30000,    // 30 seconds - check for new data
      truthValidationInterval: 300000, // 5 minutes - retest existing truths
      metaTruthInterval: 600000,      // 10 minutes - find patterns in truths
      batchSize: 5,                   // Process 5 documents at a time
      truthConfidenceThreshold: 0.4,  // Minimum confidence to store
      truthValidityThreshold: 0.3,    // Minimum confidence to keep existing truth
      maxTruthAge: 7 * 24 * 60 * 60 * 1000, // 7 days before forced revalidation
      
      // Resource management
      resourceCheckInterval: 60000,   // 1 minute - check system resources
      maxCpuUsage: 80,                // Pause if CPU > 80%
      maxMemoryUsage: 85,             // Pause if memory > 85%
      pauseDuration: 120000,          // 2 minutes pause when overloaded
      adaptiveThrottling: true,       // Adjust intervals based on load
      emergencyStopCpu: 95,           // Emergency stop if CPU > 95%
      emergencyStopMemory: 95         // Emergency stop if memory > 95%
    };

    // Resource monitoring
    this.resourceMonitor = null;
    this.isPaused = false;
    this.pauseReason = null;
    this.resourceStats = {
      cpu: 0,
      memory: 0,
      lastCheck: null,
      pauseCount: 0,
      emergencyStops: 0
    };

    // Discovery loops
    this.primaryLoop = null;
    this.validationLoop = null;
    this.metaTruthLoop = null;
  }

  async initialize() {
    try {
      logger.info('🎨 [CONTINUOUS-DISCOVERY] Initializing continuous truth discovery system...');
      
      await this.truthExtractor.initialize();
      this.lastProcessedTimestamp = new Date().toISOString();
      
      logger.info('✅ Continuous truth discovery system initialized');
      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to initialize continuous discovery:', error);
      throw error;
    }
  }

  /**
   * Start all discovery loops
   */
  async startContinuousDiscovery() {
    if (this.isRunning) {
      return { success: false, message: 'Discovery already running' };
    }

    try {
      this.isRunning = true;
      logger.info('🎨 [CONTINUOUS-DISCOVERY] Starting continuous truth discovery...');

      // Start primary data crawling loop
      this.primaryLoop = setInterval(async () => {
        try {
          await this.primaryDataCrawl();
        } catch (error) {
          logger.error('Primary crawl error:', error);
        }
      }, this.config.primaryCrawlInterval);

      // Start truth validation loop
      this.validationLoop = setInterval(async () => {
        try {
          await this.validateExistingTruths();
        } catch (error) {
          logger.error('Truth validation error:', error);
        }
      }, this.config.truthValidationInterval);

      // Start meta-truth discovery loop
      this.metaTruthLoop = setInterval(async () => {
        try {
          await this.discoverMetaTruths();
        } catch (error) {
          logger.error('Meta-truth discovery error:', error);
        }
      }, this.config.metaTruthInterval);

      // Start resource monitoring loop
      this.resourceMonitor = setInterval(async () => {
        try {
          await this.checkSystemResources();
        } catch (error) {
          logger.error('Resource monitoring error:', error);
        }
      }, this.config.resourceCheckInterval);

      logger.info('✅ All discovery loops started with resource monitoring');
      return { success: true, message: 'Continuous discovery started with resource protection' };

    } catch (error) {
      this.isRunning = false;
      logger.error('Failed to start continuous discovery:', error);
      throw error;
    }
  }

  /**
   * PRIMARY LAYER: Crawl for new data and extract immediate truths
   */
  async primaryDataCrawl() {
    try {
      // Check if system is paused due to resource constraints
      if (this.isPaused) {
        logger.info('⏸️ [PRIMARY-CRAWL] Skipping - system paused due to resource constraints');
        return;
      }

      logger.info('🔍 [PRIMARY-CRAWL] Scanning for new data...');

      // Get recent documents from all collections
      const collections = ['site_content', 'user_interactions', 'art_metadata', 'event_data'];
      let newDataFound = false;

      for (const collectionName of collections) {
        // Get recent documents (this is a simplified approach - in reality you'd track timestamps)
        const recentDocs = await this.mainDB.semanticSearch('*', collectionName, { 
          limit: this.config.batchSize 
        });

        if (recentDocs.length > 0) {
          // Filter out already processed documents
          const unprocessedDocs = recentDocs.filter(doc => 
            !this.processedDocuments.has(doc.id)
          );

          if (unprocessedDocs.length > 0) {
            logger.info(`📊 Found ${unprocessedDocs.length} new documents in ${collectionName}`);
            
            // Extract truths from new data
            const result = await this.truthExtractor.extractTruthsFromDocuments(
              unprocessedDocs, 
              `Real-time analysis of ${collectionName} data`
            );

            if (result.success && result.truthsExtracted > 0) {
              logger.info(`✨ Extracted ${result.truthsExtracted} new truths from ${collectionName}`);
              newDataFound = true;

              // Mark documents as processed
              unprocessedDocs.forEach(doc => {
                this.processedDocuments.add(doc.id);
              });

              // Trigger immediate meta-truth analysis if significant new truths found
              if (result.truthsExtracted >= 3) {
                logger.info('🧠 Triggering immediate meta-truth analysis due to significant new truths');
                setTimeout(() => this.discoverMetaTruths(), 5000);
              }
            }
          }
        }
      }

      if (!newDataFound) {
        logger.info('📊 No new data found in primary crawl');
      }

    } catch (error) {
      logger.error('Primary data crawl failed:', error);
    }
  }

  /**
   * VALIDATION LAYER: Retest existing truths for continued validity
   */
  async validateExistingTruths() {
    try {
      // Check if system is paused
      if (this.isPaused) {
        logger.info('⏸️ [TRUTH-VALIDATION] Skipping - system paused due to resource constraints');
        return;
      }

      logger.info('🔬 [TRUTH-VALIDATION] Validating existing truths...');

      // Get all existing truths
      const allTruths = await this.truthDB.searchAllTruths('*', { totalLimit: 50 });
      
      if (allTruths.length === 0) {
        logger.info('📊 No existing truths to validate');
        return;
      }

      let validatedCount = 0;
      let invalidatedCount = 0;

      for (const truth of allTruths) {
        try {
          // Check if truth needs revalidation (age or cache miss)
          const needsValidation = this.needsRevalidation(truth);
          
          if (needsValidation) {
            // Re-analyze the truth against current data
            const isStillValid = await this.revalidateTruth(truth);
            
            if (isStillValid) {
              validatedCount++;
              this.truthValidityCache.set(truth.truthId, {
                valid: true,
                lastChecked: new Date().toISOString(),
                confidence: truth.confidence
              });
            } else {
              invalidatedCount++;
              logger.info(`❌ Truth invalidated: ${truth.content.substring(0, 100)}...`);
              
              // Mark as invalid (in a real system, you might archive rather than delete)
              this.truthValidityCache.set(truth.truthId, {
                valid: false,
                lastChecked: new Date().toISOString(),
                reason: 'Failed revalidation'
              });
            }
          }
        } catch (error) {
          logger.warn(`Failed to validate truth ${truth.truthId}:`, error);
        }
      }

      logger.info(`✅ Truth validation complete: ${validatedCount} valid, ${invalidatedCount} invalidated`);

    } catch (error) {
      logger.error('Truth validation failed:', error);
    }
  }

  /**
   * META-TRUTH LAYER: Find patterns within truths themselves
   */
  async discoverMetaTruths() {
    try {
      // Check if system is paused
      if (this.isPaused) {
        logger.info('⏸️ [META-TRUTH] Skipping - system paused due to resource constraints');
        return;
      }

      logger.info('🧠 [META-TRUTH] Discovering patterns within truths...');

      // Get all valid truths
      const allTruths = await this.truthDB.searchAllTruths('*', { totalLimit: 100 });
      
      if (allTruths.length < 5) {
        logger.info('📊 Not enough truths for meta-pattern analysis');
        return;
      }

      // Group truths by type and collection
      const truthGroups = this.groupTruthsForAnalysis(allTruths);
      
      let metaTruthsFound = 0;

      for (const [groupType, truths] of Object.entries(truthGroups)) {
        if (truths.length >= 3) {
          // Analyze patterns within this group of truths
          const metaTruths = await this.analyzeMetaPatterns(truths, groupType);
          
          if (metaTruths && metaTruths.length > 0) {
            // Store meta-truths in pattern_truths collection
            for (const metaTruth of metaTruths) {
              await this.truthDB.storeTruth('pattern_truths', {
                content: metaTruth.pattern,
                metadata: {
                  meta_truth: true,
                  source_truths: truths.map(t => t.truthId),
                  pattern_type: 'meta_pattern',
                  group_type: groupType,
                  extracted_at: new Date().toISOString()
                },
                confidence: metaTruth.confidence,
                source: 'meta_analysis',
                type: 'meta_pattern'
              });
              
              metaTruthsFound++;
            }
          }
        }
      }

      logger.info(`🧠 Meta-truth discovery complete: ${metaTruthsFound} meta-patterns found`);

    } catch (error) {
      logger.error('Meta-truth discovery failed:', error);
    }
  }

  /**
   * Check if a truth needs revalidation
   */
  needsRevalidation(truth) {
    const cached = this.truthValidityCache.get(truth.truthId);
    
    if (!cached) return true;
    
    const lastChecked = new Date(cached.lastChecked);
    const now = new Date();
    const age = now - lastChecked;
    
    return age > this.config.maxTruthAge;
  }

  /**
   * Revalidate a specific truth against current data
   */
  async revalidateTruth(truth) {
    try {
      // Create a validation prompt for Llama
      const validationPrompt = `You are validating an existing truth. Analyze current data to determine if this pattern still holds.

EXISTING TRUTH: ${truth.content}
ORIGINAL CONFIDENCE: ${truth.confidence}
ORIGINAL SOURCE: ${truth.metadata?.source_collection || 'unknown'}

INSTRUCTIONS:
1. Consider if this pattern would still be valid with current data
2. Look for counter-evidence or supporting evidence
3. Determine if confidence should increase, decrease, or stay the same

RESPOND ONLY WITH VALID JSON:
{
  "still_valid": true/false,
  "new_confidence": 0.1-1.0,
  "reasoning": "Why this truth is still valid or invalid",
  "evidence_strength": "weak|moderate|strong"
}`;

      const llamaResponse = await this.truthExtractor.queryLlama(validationPrompt);
      
      if (llamaResponse && llamaResponse.still_valid !== undefined) {
        return llamaResponse.still_valid && llamaResponse.new_confidence >= this.config.truthValidityThreshold;
      }
      
      // If Llama doesn't respond, assume truth is still valid
      return true;

    } catch (error) {
      logger.warn('Truth revalidation failed:', error);
      return true; // Conservative approach - keep truth if validation fails
    }
  }

  /**
   * Group truths for meta-pattern analysis
   */
  groupTruthsForAnalysis(truths) {
    const groups = {
      user_behavior: [],
      content_patterns: [],
      temporal_patterns: [],
      correlation_patterns: []
    };

    truths.forEach(truth => {
      const type = truth.metadata?.pattern_type || truth.type;
      
      if (type.includes('user') || type.includes('behavioral')) {
        groups.user_behavior.push(truth);
      } else if (type.includes('content') || type.includes('correlation')) {
        groups.content_patterns.push(truth);
      } else if (type.includes('temporal') || type.includes('time')) {
        groups.temporal_patterns.push(truth);
      } else {
        groups.correlation_patterns.push(truth);
      }
    });

    return groups;
  }

  /**
   * Analyze meta-patterns within a group of truths
   */
  async analyzeMetaPatterns(truths, groupType) {
    try {
      const truthSummaries = truths.map(t => ({
        pattern: t.content,
        confidence: t.confidence,
        type: t.type
      }));

      const metaAnalysisPrompt = `You are analyzing patterns WITHIN patterns. Look for meta-patterns across these related truths.

GROUP TYPE: ${groupType}

EXISTING TRUTHS TO ANALYZE:
${JSON.stringify(truthSummaries, null, 2)}

INSTRUCTIONS:
1. Look for overarching patterns that connect these individual truths
2. Find correlations between the truths themselves
3. Identify higher-level insights that emerge from combining these patterns
4. Focus on actionable meta-insights

RESPOND ONLY WITH VALID JSON:
{
  "meta_patterns": [
    {
      "pattern": "Description of the meta-pattern found",
      "confidence": 0.1-1.0,
      "connects_truths": ["brief description of which truths this connects"],
      "actionable_insight": "How this meta-pattern could be used"
    }
  ]
}

Maximum 2 meta-patterns. Only include patterns with confidence >= 0.4.`;

      const llamaResponse = await this.truthExtractor.queryLlama(metaAnalysisPrompt);
      
      if (llamaResponse && llamaResponse.meta_patterns) {
        return llamaResponse.meta_patterns.filter(mp => mp.confidence >= 0.4);
      }
      
      return [];

    } catch (error) {
      logger.warn('Meta-pattern analysis failed:', error);
      return [];
    }
  }

  /**
   * RESOURCE MONITORING: Check system resources and pause if needed
   */
  async checkSystemResources() {
    try {
      const resources = await this.getSystemResources();
      this.resourceStats = {
        ...resources,
        lastCheck: new Date().toISOString()
      };

      const { cpu, memory } = resources;

      // Emergency stop conditions
      if (cpu > this.config.emergencyStopCpu || memory > this.config.emergencyStopMemory) {
        logger.error(`🚨 [RESOURCE-MONITOR] EMERGENCY STOP - CPU: ${cpu}%, Memory: ${memory}%`);
        this.resourceStats.emergencyStops++;
        await this.emergencyStop();
        return;
      }

      // Check if we need to pause
      const shouldPause = cpu > this.config.maxCpuUsage || memory > this.config.maxMemoryUsage;
      
      if (shouldPause && !this.isPaused) {
        this.pauseReason = `High resource usage - CPU: ${cpu}%, Memory: ${memory}%`;
        logger.warn(`⏸️ [RESOURCE-MONITOR] Pausing discovery - ${this.pauseReason}`);
        
        this.isPaused = true;
        this.resourceStats.pauseCount++;
        
        // Auto-resume after pause duration
        setTimeout(() => {
          if (this.isPaused) {
            logger.info('▶️ [RESOURCE-MONITOR] Auto-resuming after pause duration');
            this.isPaused = false;
            this.pauseReason = null;
          }
        }, this.config.pauseDuration);

      } else if (!shouldPause && this.isPaused) {
        // Resources are good, resume if paused
        logger.info(`▶️ [RESOURCE-MONITOR] Resuming discovery - CPU: ${cpu}%, Memory: ${memory}%`);
        this.isPaused = false;
        this.pauseReason = null;
      }

      // Adaptive throttling based on resource usage
      if (this.config.adaptiveThrottling) {
        await this.adjustIntervalsBasedOnLoad(cpu, memory);
      }

      // Log resource status periodically
      if (this.resourceStats.pauseCount % 10 === 0 || cpu > 70 || memory > 70) {
        logger.info(`📊 [RESOURCE-MONITOR] CPU: ${cpu}%, Memory: ${memory}%, Paused: ${this.isPaused}`);
      }

    } catch (error) {
      logger.error('Resource monitoring failed:', error);
    }
  }

  /**
   * Get current system resource usage
   */
  async getSystemResources() {
    try {
      const os = require('os');
      const process = require('process');

      // CPU usage calculation
      const cpuUsage = process.cpuUsage();
      const totalCpuTime = cpuUsage.user + cpuUsage.system;
      const cpuPercent = Math.min(100, (totalCpuTime / 1000000) / os.cpus().length); // Rough estimate

      // Memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryPercent = (usedMemory / totalMemory) * 100;

      // Process-specific memory
      const processMemory = process.memoryUsage();
      const processMemoryMB = processMemory.rss / 1024 / 1024;

      return {
        cpu: Math.round(cpuPercent),
        memory: Math.round(memoryPercent),
        processMemoryMB: Math.round(processMemoryMB),
        totalMemoryGB: Math.round(totalMemory / 1024 / 1024 / 1024),
        freeMemoryGB: Math.round(freeMemory / 1024 / 1024 / 1024)
      };

    } catch (error) {
      logger.error('Failed to get system resources:', error);
      return { cpu: 0, memory: 0, processMemoryMB: 0, totalMemoryGB: 0, freeMemoryGB: 0 };
    }
  }

  /**
   * Adjust discovery intervals based on system load
   */
  async adjustIntervalsBasedOnLoad(cpu, memory) {
    try {
      const avgLoad = (cpu + memory) / 2;
      let multiplier = 1;

      if (avgLoad > 70) {
        multiplier = 2; // Slow down significantly
      } else if (avgLoad > 50) {
        multiplier = 1.5; // Slow down moderately
      } else if (avgLoad < 30) {
        multiplier = 0.8; // Speed up slightly
      }

      // Only adjust if multiplier has changed significantly
      if (Math.abs(multiplier - (this.currentMultiplier || 1)) > 0.2) {
        this.currentMultiplier = multiplier;
        
        logger.info(`⚙️ [ADAPTIVE-THROTTLING] Adjusting intervals by ${multiplier}x due to ${avgLoad}% avg load`);
        
        // Note: In a production system, you'd restart the intervals with new timing
        // For now, we just log the adjustment
      }

    } catch (error) {
      logger.error('Failed to adjust intervals:', error);
    }
  }

  /**
   * Emergency stop all discovery processes
   */
  async emergencyStop() {
    try {
      logger.error('🚨 [EMERGENCY-STOP] Stopping all discovery processes due to resource exhaustion');
      
      // Stop all loops immediately
      if (this.primaryLoop) clearInterval(this.primaryLoop);
      if (this.validationLoop) clearInterval(this.validationLoop);
      if (this.metaTruthLoop) clearInterval(this.metaTruthLoop);
      if (this.resourceMonitor) clearInterval(this.resourceMonitor);

      this.isRunning = false;
      this.isPaused = true;
      this.pauseReason = 'Emergency stop due to resource exhaustion';

      // Wait 5 minutes before allowing restart
      setTimeout(() => {
        logger.info('🔄 [EMERGENCY-STOP] Emergency stop cooldown complete - system can be restarted');
        this.isPaused = false;
        this.pauseReason = null;
      }, 300000); // 5 minutes

    } catch (error) {
      logger.error('Emergency stop failed:', error);
    }
  }

  /**
   * Stop all discovery loops
   */
  stopContinuousDiscovery() {
    if (!this.isRunning) {
      return { success: false, message: 'Discovery not running' };
    }

    try {
      if (this.primaryLoop) clearInterval(this.primaryLoop);
      if (this.validationLoop) clearInterval(this.validationLoop);
      if (this.metaTruthLoop) clearInterval(this.metaTruthLoop);
      if (this.resourceMonitor) clearInterval(this.resourceMonitor);

      this.isRunning = false;
      this.isPaused = false;
      this.pauseReason = null;
      logger.info('🛑 Continuous truth discovery stopped');
      
      return { success: true, message: 'Discovery stopped' };

    } catch (error) {
      logger.error('Failed to stop discovery:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive discovery statistics
   */
  async getDiscoveryStats() {
    try {
      const truthStats = await this.truthDB.getAllStats();
      const mainStats = await this.mainDB.healthCheck();

      return {
        system_status: {
          is_running: this.isRunning,
          is_paused: this.isPaused,
          pause_reason: this.pauseReason,
          last_processed: this.lastProcessedTimestamp,
          processed_documents: this.processedDocuments.size,
          cached_validations: this.truthValidityCache.size
        },
        resource_status: this.resourceStats,
        databases: {
          main_db: {
            total_documents: mainStats.totalDocuments,
            collections: mainStats.collections
          },
          truth_db: {
            total_truths: truthStats.totalTruths,
            collections: truthStats.collections,
            breakdown: truthStats.collectionStats
          }
        },
        discovery_config: this.config,
        loops_active: {
          primary_crawl: !!this.primaryLoop,
          truth_validation: !!this.validationLoop,
          meta_truth_discovery: !!this.metaTruthLoop,
          resource_monitor: !!this.resourceMonitor
        }
      };
    } catch (error) {
      logger.error('Failed to get discovery stats:', error);
      throw error;
    }
  }
}

module.exports = ContinuousTruthDiscovery;
