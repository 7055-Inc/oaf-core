/**
 * Leo AI - Meta Pattern Discoverer
 * 
 * Discovers patterns ACROSS other truths - the "pattern of patterns".
 * 
 * Examples of meta-patterns:
 * - "When color trends change, price sensitivity changes too"
 * - "Artists with high product similarity also have high customer overlap"
 * - "Seasonal patterns correlate with category popularity shifts"
 * 
 * This is the highest-level pattern discovery - it looks at the truths
 * themselves to find emergent patterns we didn't explicitly program.
 */

const BaseDiscoverer = require('../BaseDiscoverer');
const logger = require('../../logger');

class MetaPatternDiscoverer extends BaseDiscoverer {
  constructor() {
    super({
      name: 'meta_pattern',
      description: 'Discovers patterns across other truths (meta-analysis)',
      targetCollection: 'truth_meta',
      runInterval: 6 * 60 * 60 * 1000, // Every 6 hours
      batchSize: 100,
      priority: 'low' // Runs after other discoverers
    });
    
    this.minTruthsForPattern = 5; // Need at least 5 related truths to form a meta-pattern
    this.correlationThreshold = 0.6; // Minimum correlation to report
  }

  /**
   * Main discovery logic
   */
  async discover() {
    const truths = [];
    
    try {
      // Analyze patterns in similarity truths
      const similarityPatterns = await this.analyzeSimilarityPatterns();
      truths.push(...similarityPatterns);

      // Analyze truth clustering (which entities appear together often)
      const clusterPatterns = await this.analyzeEntityClusters();
      truths.push(...clusterPatterns);

      // Analyze temporal patterns in truth discovery
      const temporalPatterns = await this.analyzeTemporalPatterns();
      truths.push(...temporalPatterns);

      logger.info(`Meta pattern discovery complete: ${truths.length} meta-truths`);
      return truths;

    } catch (error) {
      logger.error('Meta pattern discovery error:', error);
      throw error;
    }
  }

  /**
   * Analyze patterns within similarity truths
   * E.g., "Products in category X tend to have higher similarity scores"
   */
  async analyzeSimilarityPatterns() {
    const patterns = [];
    
    try {
      // Get all similarity truths
      const similarities = await this.truthStore.queryTruths('truth_similarities', {
        filter: { is_active: true },
        limit: 500
      });

      if (similarities.length < this.minTruthsForPattern) {
        return patterns;
      }

      // Group by entity type
      const byEntityType = {};
      for (const truth of similarities) {
        const entityType = truth.metadata?.entity_type || 'unknown';
        if (!byEntityType[entityType]) {
          byEntityType[entityType] = [];
        }
        byEntityType[entityType].push(truth);
      }

      // Analyze each entity type
      for (const [entityType, entityTruths] of Object.entries(byEntityType)) {
        if (entityTruths.length < this.minTruthsForPattern) continue;

        // Calculate statistics
        const scores = entityTruths.map(t => parseFloat(t.metadata?.score) || 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);

        // Build meta-pattern truth
        patterns.push({
          type: 'similarity_distribution',
          entity_type: 'meta',
          entities: [entityType],
          score: avgScore,
          confidence: Math.min(entityTruths.length / 100, 0.95), // More truths = more confidence
          content: `${entityType} similarity distribution: avg=${avgScore.toFixed(2)}, range=[${minScore.toFixed(2)}, ${maxScore.toFixed(2)}], n=${entityTruths.length}`,
          evidence: {
            entity_type: entityType,
            count: entityTruths.length,
            avg_similarity: avgScore,
            max_similarity: maxScore,
            min_similarity: minScore,
            std_dev: this.standardDeviation(scores)
          },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });
      }

      return patterns;

    } catch (error) {
      logger.error('Error analyzing similarity patterns:', error);
      return patterns;
    }
  }

  /**
   * Analyze which entities cluster together in truths
   * E.g., "Artist 123 appears in 85% of high-similarity truths with Artist 456"
   */
  async analyzeEntityClusters() {
    const patterns = [];
    
    try {
      // Get all truths
      const allTruths = await this.truthStore.queryTruths('truth_similarities', {
        filter: { is_active: true },
        limit: 500
      });

      // Count entity co-occurrences
      const entityCounts = {};
      const pairCounts = {};

      for (const truth of allTruths) {
        const entities = (truth.metadata?.entities || '').split(',').filter(e => e);
        
        // Count individual entities
        for (const entity of entities) {
          entityCounts[entity] = (entityCounts[entity] || 0) + 1;
        }

        // Count pairs
        if (entities.length === 2) {
          const pairKey = entities.sort().join(':');
          pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
        }
      }

      // Find entities that appear frequently (hubs)
      const hubThreshold = Math.max(3, allTruths.length * 0.05); // Top 5% or at least 3
      const hubs = Object.entries(entityCounts)
        .filter(([_, count]) => count >= hubThreshold)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      if (hubs.length > 0) {
        patterns.push({
          type: 'entity_hub',
          entity_type: 'meta',
          entities: hubs.map(h => h[0]),
          score: hubs[0][1] / allTruths.length, // Normalized by total truths
          confidence: 0.8,
          content: `Top hub entities: ${hubs.slice(0, 5).map(h => `${h[0]}(${h[1]})`).join(', ')}`,
          evidence: {
            hub_count: hubs.length,
            top_hub: hubs[0][0],
            top_hub_connections: hubs[0][1],
            total_truths_analyzed: allTruths.length
          },
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
        });
      }

      return patterns;

    } catch (error) {
      logger.error('Error analyzing entity clusters:', error);
      return patterns;
    }
  }

  /**
   * Analyze temporal patterns in truth discovery
   * E.g., "More truths are discovered on weekdays vs weekends"
   */
  async analyzeTemporalPatterns() {
    const patterns = [];
    
    try {
      // Get recent truths with timestamps
      const recentTruths = await this.truthStore.queryTruths('truth_similarities', {
        filter: { is_active: true },
        limit: 200
      });

      if (recentTruths.length < this.minTruthsForPattern) {
        return patterns;
      }

      // Group by day of week
      const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
      const byHour = Array(24).fill(0);

      for (const truth of recentTruths) {
        const discovered = new Date(truth.metadata?.discovered_at);
        if (!isNaN(discovered.getTime())) {
          byDayOfWeek[discovered.getDay()]++;
          byHour[discovered.getHours()]++;
        }
      }

      // Find peak discovery time
      const peakHour = byHour.indexOf(Math.max(...byHour));
      const peakDay = byDayOfWeek.indexOf(Math.max(...byDayOfWeek));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      patterns.push({
        type: 'discovery_temporal',
        entity_type: 'meta',
        entities: ['system'],
        score: Math.max(...byHour) / recentTruths.length,
        confidence: Math.min(recentTruths.length / 50, 0.9),
        content: `Peak discovery: ${dayNames[peakDay]} at ${peakHour}:00`,
        evidence: {
          peak_hour: peakHour,
          peak_day: dayNames[peakDay],
          truths_analyzed: recentTruths.length,
          distribution_by_day: byDayOfWeek,
          distribution_by_hour: byHour
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      return patterns;

    } catch (error) {
      logger.error('Error analyzing temporal patterns:', error);
      return patterns;
    }
  }

  /**
   * Calculate standard deviation
   */
  standardDeviation(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}

module.exports = MetaPatternDiscoverer;
