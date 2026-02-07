/**
 * Leo AI - Product Similarity Discoverer
 * 
 * Discovers product-to-product similarities by comparing:
 * - Semantic embeddings (from ChromaDB)
 * - Metadata similarities (category, price range, style, artist)
 * - Behavioral patterns (bought together, viewed together)
 * 
 * Outputs truths like:
 * "Product 123 and Product 456 have 87% similarity"
 * 
 * These truths power:
 * - "Similar Products" recommendations
 * - "You might also like..." suggestions
 * - "Frequently bought together" features
 */

const BaseDiscoverer = require('../BaseDiscoverer');
const logger = require('../../logger');

class ProductSimilarityDiscoverer extends BaseDiscoverer {
  constructor() {
    super({
      name: 'product_similarity',
      description: 'Discovers similar products based on embeddings and metadata',
      targetCollection: 'truth_similarities',
      runInterval: 4 * 60 * 60 * 1000, // Every 4 hours
      batchSize: 50,
      priority: 'high'
    });
    
    this.similarityThreshold = 0.7; // Only store similarities above 70%
    this.maxSimilaritiesPerProduct = 10; // Top 10 similar products
  }

  /**
   * Main discovery logic
   */
  async discover() {
    const truths = [];
    
    try {
      // Get product collection from main vector DB
      const productCollection = await this.vectorDB.getCollection('art_metadata');
      if (!productCollection) {
        logger.warn('art_metadata collection not found');
        return truths;
      }

      // Get all active products
      const products = await productCollection.get({
        where: { classification: '101' }, // Active products only
        include: ['embeddings', 'metadatas', 'documents'],
        limit: 500 // Process in chunks
      });

      if (!products.ids || products.ids.length < 2) {
        logger.info('Not enough products to compare');
        return truths;
      }

      logger.info(`Processing ${products.ids.length} products for similarity`);

      // Compare each product to find similarities
      // Using a smart sampling approach to avoid O(n²) on large datasets
      const processedPairs = new Set();
      
      for (let i = 0; i < products.ids.length; i++) {
        const productA = {
          id: products.ids[i],
          embedding: products.embeddings?.[i],
          metadata: products.metadatas?.[i] || {},
          document: products.documents?.[i]
        };

        // Skip if no embedding
        if (!productA.embedding) continue;

        // Find similar products using semantic search
        const similarResults = await productCollection.query({
          queryEmbeddings: [productA.embedding],
          nResults: this.maxSimilaritiesPerProduct + 1, // +1 to exclude self
          where: { classification: '101' },
          include: ['metadatas', 'distances']
        });

        if (!similarResults.ids?.[0]) continue;

        // Process similar products
        for (let j = 0; j < similarResults.ids[0].length; j++) {
          const productBId = similarResults.ids[0][j];
          
          // Skip self
          if (productBId === productA.id) continue;
          
          // Skip already processed pairs
          const pairKey = [productA.id, productBId].sort().join(':');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          // Calculate similarity score (distance to similarity)
          const distance = similarResults.distances?.[0]?.[j] || 1;
          const semanticSimilarity = 1 - distance;
          
          // Get metadata for product B
          const productBMetadata = similarResults.metadatas?.[0]?.[j] || {};
          
          // Calculate metadata similarity boost
          const metadataBoost = this.calculateMetadataBoost(
            productA.metadata,
            productBMetadata
          );
          
          // Combined similarity score
          const combinedScore = (semanticSimilarity * 0.7) + (metadataBoost * 0.3);
          
          // Only keep high-quality similarities
          if (combinedScore >= this.similarityThreshold) {
            const truth = this.buildSimilarityTruth(
              productA.id,
              productBId,
              combinedScore,
              semanticSimilarity,
              metadataBoost,
              productA.metadata,
              productBMetadata
            );
            truths.push(truth);
          }
        }

        this.stats.processed++;
        
        // Progress log
        if ((i + 1) % 50 === 0) {
          logger.info(`Progress: ${i + 1}/${products.ids.length} products, ${truths.length} similarities found`);
        }
      }

      logger.info(`Product similarity discovery complete: ${truths.length} truths`);
      return truths;

    } catch (error) {
      logger.error('Product similarity discovery error:', error);
      throw error;
    }
  }

  /**
   * Calculate metadata-based similarity boost
   */
  calculateMetadataBoost(metaA, metaB) {
    let boost = 0;
    let factors = 0;

    // Same category (+0.3)
    if (metaA.category_id && metaB.category_id) {
      factors++;
      if (metaA.category_id === metaB.category_id) {
        boost += 0.3;
      }
    }

    // Same artist (+0.2)
    if (metaA.vendor_id && metaB.vendor_id) {
      factors++;
      if (metaA.vendor_id === metaB.vendor_id) {
        boost += 0.2;
      }
    }

    // Similar price range (+0.2) - within 30%
    if (metaA.price && metaB.price) {
      factors++;
      const priceA = parseFloat(metaA.price);
      const priceB = parseFloat(metaB.price);
      const priceDiff = Math.abs(priceA - priceB) / Math.max(priceA, priceB);
      if (priceDiff <= 0.3) {
        boost += 0.2 * (1 - priceDiff);
      }
    }

    // Same product type (+0.15)
    if (metaA.product_type && metaB.product_type) {
      factors++;
      if (metaA.product_type === metaB.product_type) {
        boost += 0.15;
      }
    }

    // Both have good ratings (+0.15)
    if (metaA.avg_rating && metaB.avg_rating) {
      factors++;
      const ratingA = parseFloat(metaA.avg_rating);
      const ratingB = parseFloat(metaB.avg_rating);
      if (ratingA >= 4 && ratingB >= 4) {
        boost += 0.15;
      }
    }

    // Normalize by number of factors compared
    return factors > 0 ? boost : 0;
  }

  /**
   * Build a similarity truth object
   */
  buildSimilarityTruth(productAId, productBId, score, semanticScore, metadataBoost, metaA, metaB) {
    // Extract numeric IDs from vector DB IDs (e.g., "product_123" -> "123")
    const idA = productAId.replace('product_', '');
    const idB = productBId.replace('product_', '');

    return {
      type: 'product_similarity',
      entity_type: 'product',
      entities: [idA, idB],
      score: Math.round(score * 100) / 100, // Round to 2 decimals
      confidence: this.calculateConfidence(semanticScore, metadataBoost),
      content: `Products ${idA} and ${idB} are ${Math.round(score * 100)}% similar`,
      evidence: {
        semantic_similarity: Math.round(semanticScore * 100) / 100,
        metadata_boost: Math.round(metadataBoost * 100) / 100,
        shared_category: metaA.category_id === metaB.category_id,
        shared_artist: metaA.vendor_id === metaB.vendor_id,
        price_range_match: this.priceRangeMatch(metaA.price, metaB.price)
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
  }

  /**
   * Calculate confidence based on evidence quality
   */
  calculateConfidence(semanticScore, metadataBoost) {
    // Higher confidence when both semantic and metadata agree
    const agreement = Math.min(semanticScore, metadataBoost * 3); // Scale metadata boost
    const baseConfidence = (semanticScore * 0.6) + (agreement * 0.4);
    return Math.round(Math.min(baseConfidence + 0.2, 1) * 100) / 100;
  }

  /**
   * Check if prices are in similar range
   */
  priceRangeMatch(priceA, priceB) {
    if (!priceA || !priceB) return false;
    const a = parseFloat(priceA);
    const b = parseFloat(priceB);
    return Math.abs(a - b) / Math.max(a, b) <= 0.3;
  }

  /**
   * Validate an existing similarity truth
   */
  async validate(truth) {
    try {
      // Re-check if both products still exist and are active
      const entities = truth.metadata?.entities?.split(',') || [];
      if (entities.length !== 2) {
        return null; // Invalid truth
      }

      const productCollection = await this.vectorDB.getCollection('art_metadata');
      
      // Check if both products still exist
      const results = await productCollection.get({
        ids: [`product_${entities[0]}`, `product_${entities[1]}`],
        include: ['metadatas']
      });

      if (!results.ids || results.ids.length !== 2) {
        return null; // One or both products no longer exist
      }

      // Check if both are still active
      const bothActive = results.metadatas.every(m => m.classification === '101');
      if (!bothActive) {
        return null; // One or both products are no longer active
      }

      // Truth is still valid
      return {
        ...truth,
        validated_at: new Date().toISOString(),
        validation_count: (truth.validation_count || 0) + 1,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

    } catch (error) {
      logger.error('Failed to validate product similarity truth:', error);
      return null;
    }
  }
}

module.exports = ProductSimilarityDiscoverer;
