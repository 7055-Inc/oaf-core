/**
 * Leo AI - User Similarity Discoverer
 * 
 * Discovers user-to-user similarities for:
 * - Look-alike audiences (marketing)
 * - "Customers like you also bought..."
 * - User segmentation
 * 
 * Compares users based on:
 * - Purchase history patterns (from user_interactions)
 * - Browsing behavior (from user_behavior)
 * - Profile attributes (user type, location, preferences)
 * 
 * This becomes more powerful as we add public data to profiles.
 */

const BaseDiscoverer = require('../BaseDiscoverer');
const logger = require('../../logger');

class UserSimilarityDiscoverer extends BaseDiscoverer {
  constructor() {
    super({
      name: 'user_similarity',
      description: 'Discovers similar users for look-alike audiences',
      targetCollection: 'truth_similarities',
      runInterval: 4 * 60 * 60 * 1000, // Every 4 hours
      batchSize: 50,
      priority: 'high'
    });
    
    this.similarityThreshold = 0.65; // Users need 65%+ similarity
    this.maxSimilaritiesPerUser = 15; // Top 15 similar users
  }

  /**
   * Main discovery logic
   */
  async discover() {
    const truths = [];
    
    try {
      // Get user profiles collection
      const userCollection = await this.vectorDB.getCollection('user_profiles');
      if (!userCollection) {
        logger.warn('user_profiles collection not found');
        return truths;
      }

      // Get all users with embeddings
      const users = await userCollection.get({
        include: ['embeddings', 'metadatas', 'documents'],
        limit: 500
      });

      if (!users.ids || users.ids.length < 2) {
        logger.info('Not enough users to compare');
        return truths;
      }

      logger.info(`Processing ${users.ids.length} users for similarity`);

      // Also get purchase data for behavioral comparison
      const purchasePatterns = await this.getPurchasePatterns();

      const processedPairs = new Set();

      for (let i = 0; i < users.ids.length; i++) {
        const userA = {
          id: users.ids[i],
          embedding: users.embeddings?.[i],
          metadata: users.metadatas?.[i] || {},
          purchases: purchasePatterns[users.ids[i]] || []
        };

        if (!userA.embedding) continue;

        // Find similar users using semantic search
        const similarResults = await userCollection.query({
          queryEmbeddings: [userA.embedding],
          nResults: this.maxSimilaritiesPerUser + 1,
          include: ['metadatas', 'distances']
        });

        if (!similarResults.ids?.[0]) continue;

        for (let j = 0; j < similarResults.ids[0].length; j++) {
          const userBId = similarResults.ids[0][j];
          
          if (userBId === userA.id) continue;
          
          const pairKey = [userA.id, userBId].sort().join(':');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          const distance = similarResults.distances?.[0]?.[j] || 1;
          const semanticSimilarity = 1 - distance;
          
          const userBMetadata = similarResults.metadatas?.[0]?.[j] || {};
          const userBPurchases = purchasePatterns[userBId] || [];

          // Calculate purchase overlap
          const purchaseOverlap = this.calculatePurchaseOverlap(
            userA.purchases,
            userBPurchases
          );

          // Calculate demographic similarity
          const demographicSimilarity = this.calculateDemographicSimilarity(
            userA.metadata,
            userBMetadata
          );

          // Combined score
          const combinedScore = (semanticSimilarity * 0.4) + 
                               (purchaseOverlap * 0.4) + 
                               (demographicSimilarity * 0.2);

          if (combinedScore >= this.similarityThreshold) {
            const truth = this.buildUserSimilarityTruth(
              userA.id,
              userBId,
              combinedScore,
              semanticSimilarity,
              purchaseOverlap,
              demographicSimilarity,
              userA.metadata,
              userBMetadata
            );
            truths.push(truth);
          }
        }

        this.stats.processed++;
        
        if ((i + 1) % 50 === 0) {
          logger.info(`Progress: ${i + 1}/${users.ids.length} users, ${truths.length} similarities found`);
        }
      }

      logger.info(`User similarity discovery complete: ${truths.length} truths`);
      return truths;

    } catch (error) {
      logger.error('User similarity discovery error:', error);
      throw error;
    }
  }

  /**
   * Get purchase patterns from user_interactions collection
   */
  async getPurchasePatterns() {
    const patterns = {};
    
    try {
      const interactionsCollection = await this.vectorDB.getCollection('user_interactions');
      if (!interactionsCollection) return patterns;

      const interactions = await interactionsCollection.get({
        include: ['metadatas'],
        limit: 1000
      });

      if (!interactions.ids) return patterns;

      // Group by user
      for (let i = 0; i < interactions.ids.length; i++) {
        const meta = interactions.metadatas[i] || {};
        const userId = meta.user_id;
        const productIds = (meta.product_ids || '').split(',').filter(p => p);

        if (userId) {
          if (!patterns[`user_${userId}`]) {
            patterns[`user_${userId}`] = [];
          }
          patterns[`user_${userId}`].push(...productIds);
        }
      }

      // Deduplicate
      for (const userId in patterns) {
        patterns[userId] = [...new Set(patterns[userId])];
      }

      return patterns;

    } catch (error) {
      logger.warn('Error fetching purchase patterns:', error.message);
      return patterns;
    }
  }

  /**
   * Calculate overlap in purchased products
   */
  calculatePurchaseOverlap(purchasesA, purchasesB) {
    if (purchasesA.length === 0 || purchasesB.length === 0) {
      return 0;
    }

    const setA = new Set(purchasesA);
    const setB = new Set(purchasesB);
    
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }

    // Jaccard similarity
    const union = new Set([...purchasesA, ...purchasesB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calculate demographic/attribute similarity
   */
  calculateDemographicSimilarity(metaA, metaB) {
    let score = 0;
    let factors = 0;

    // Same user type
    if (metaA.user_type && metaB.user_type) {
      factors++;
      if (metaA.user_type === metaB.user_type) {
        score += 0.3;
      }
    }

    // Same region/location
    if (metaA.state && metaB.state) {
      factors++;
      if (metaA.state === metaB.state) {
        score += 0.25;
      } else if (metaA.country === metaB.country) {
        score += 0.1;
      }
    }

    // Similar account age
    if (metaA.created_at && metaB.created_at) {
      factors++;
      const ageA = new Date() - new Date(metaA.created_at);
      const ageB = new Date() - new Date(metaB.created_at);
      const ageDiff = Math.abs(ageA - ageB) / Math.max(ageA, ageB);
      if (ageDiff < 0.3) {
        score += 0.2 * (1 - ageDiff);
      }
    }

    // Has subscription
    if (metaA.has_subscription !== undefined && metaB.has_subscription !== undefined) {
      factors++;
      if (metaA.has_subscription === metaB.has_subscription) {
        score += 0.15;
      }
    }

    // Verified status
    if (metaA.is_verified !== undefined && metaB.is_verified !== undefined) {
      factors++;
      if (metaA.is_verified === metaB.is_verified) {
        score += 0.1;
      }
    }

    return factors > 0 ? score : 0;
  }

  /**
   * Build a user similarity truth
   */
  buildUserSimilarityTruth(userAId, userBId, score, semanticScore, purchaseOverlap, demographicScore, metaA, metaB) {
    const idA = userAId.replace('user_', '');
    const idB = userBId.replace('user_', '');

    return {
      type: 'user_similarity',
      entity_type: 'user',
      entities: [idA, idB],
      score: Math.round(score * 100) / 100,
      confidence: this.calculateConfidence(semanticScore, purchaseOverlap, demographicScore),
      content: `Users ${idA} and ${idB} are ${Math.round(score * 100)}% similar (look-alike)`,
      evidence: {
        semantic_similarity: Math.round(semanticScore * 100) / 100,
        purchase_overlap: Math.round(purchaseOverlap * 100) / 100,
        demographic_similarity: Math.round(demographicScore * 100) / 100,
        same_user_type: metaA.user_type === metaB.user_type,
        same_region: metaA.state === metaB.state
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Calculate confidence
   */
  calculateConfidence(semanticScore, purchaseOverlap, demographicScore) {
    // Higher confidence when multiple signals agree
    const signals = [semanticScore, purchaseOverlap, demographicScore].filter(s => s > 0.3);
    const agreement = signals.length / 3;
    const avgStrength = signals.length > 0 ? signals.reduce((a, b) => a + b, 0) / signals.length : 0;
    
    return Math.round(Math.min((agreement * 0.4) + (avgStrength * 0.6), 0.95) * 100) / 100;
  }
}

module.exports = UserSimilarityDiscoverer;
