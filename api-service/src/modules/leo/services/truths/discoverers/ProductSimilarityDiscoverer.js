/**
 * Leo AI - Product Similarity Discoverer
 * 
 * Discovers product-to-product similarities by comparing semantic embeddings
 * and metadata. Truths are tiered by value:
 * 
 *   cross_artist  (high)   - Different artists, genuine aesthetic match
 *   same_artist   (low)    - Same artist, only kept when semantic similarity
 *                            is high enough to indicate a real stylistic link
 *                            rather than just being a product variant
 * 
 * Saves in batches of 50 products so partial runs are never lost and
 * progress is visible in the logs.
 */

const BaseDiscoverer = require('../BaseDiscoverer');
const logger = require('../../logger');

class ProductSimilarityDiscoverer extends BaseDiscoverer {
  constructor() {
    super({
      name: 'product_similarity',
      description: 'Discovers similar products based on embeddings and metadata',
      targetCollection: 'truth_similarities',
      runInterval: 4 * 60 * 60 * 1000,
      batchSize: 50,
      priority: 'high'
    });

    this.crossArtistThreshold = 0.60;
    this.sameArtistThreshold = 0.92;
    this.maxSimilaritiesPerProduct = 10;
  }

  /**
   * Classify the relationship between two products.
   *   variant      – same artist AND (names nearly identical OR embedding >= 0.97)
   *   same_artist  – same artist, genuinely different work
   *   cross_artist – different artists
   */
  classifyPair(metaA, metaB, semanticSim) {
    const sameArtist = metaA.vendor_id && metaB.vendor_id
      && metaA.vendor_id === metaB.vendor_id;

    if (!sameArtist) return 'cross_artist';

    if (semanticSim >= 0.97) return 'variant';

    const nameA = (metaA.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameB = (metaB.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nameA && nameB && (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA))) {
      return 'variant';
    }

    return 'same_artist';
  }

  async discover() {
    const truths = [];

    try {
      const productCollection = this.vectorDB.getCollection('art_metadata');
      if (!productCollection) {
        logger.warn('art_metadata collection not found');
        return truths;
      }

      const products = await productCollection.get({
        where: { classification: '101' },
        include: ['embeddings', 'metadatas'],
        limit: 500
      });

      if (!products.ids || products.ids.length < 2) {
        logger.info('Not enough products to compare');
        return truths;
      }

      logger.info(`Processing ${products.ids.length} products for similarity`);

      const processedPairs = new Set();
      const batchTruths = [];
      let batchCounts = { cross_artist: 0, same_artist: 0, variant_skipped: 0, below_threshold: 0 };

      for (let i = 0; i < products.ids.length; i++) {
        const productA = {
          id: products.ids[i],
          embedding: products.embeddings?.[i],
          metadata: products.metadatas?.[i] || {}
        };

        if (!productA.embedding) continue;

        const similarResults = await productCollection.query({
          queryEmbeddings: [productA.embedding],
          nResults: this.maxSimilaritiesPerProduct + 1,
          where: { classification: '101' },
          include: ['metadatas', 'distances']
        });

        if (!similarResults.ids?.[0]) continue;

        for (let j = 0; j < similarResults.ids[0].length; j++) {
          const productBId = similarResults.ids[0][j];
          if (productBId === productA.id) continue;

          const pairKey = [productA.id, productBId].sort().join(':');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          const distance = similarResults.distances?.[0]?.[j] || 1;
          const semanticSim = 1 - distance;
          const metaB = similarResults.metadatas?.[0]?.[j] || {};

          const tier = this.classifyPair(productA.metadata, metaB, semanticSim);

          if (tier === 'variant') {
            batchCounts.variant_skipped++;
            continue;
          }

          const threshold = tier === 'cross_artist'
            ? this.crossArtistThreshold
            : this.sameArtistThreshold;

          if (semanticSim < threshold) {
            batchCounts.below_threshold++;
            continue;
          }

          const metadataBoost = this.calculateMetadataBoost(productA.metadata, metaB, tier);
          const combinedScore = (semanticSim * 0.7) + (metadataBoost * 0.3);

          const truth = this.buildSimilarityTruth(
            productA.id, productBId, combinedScore, semanticSim,
            metadataBoost, productA.metadata, metaB, tier
          );
          batchTruths.push(truth);
          batchCounts[tier]++;
        }

        this.stats.processed++;

        // Every 50 products: save, log, reset batch
        if ((i + 1) % this.batchSize === 0 || i === products.ids.length - 1) {
          if (batchTruths.length > 0) {
            for (const t of batchTruths) {
              try {
                await this.truthStore.storeTruth(this.targetCollection, {
                  ...t, discoverer: this.name
                });
                this.stats.truthsFound++;
                this.totalTruthsDiscovered++;
              } catch (err) {
                logger.warn('Failed to store truth:', err.message);
                this.stats.errors++;
              }
            }
          }

          logger.info(
            `Batch ${Math.ceil((i + 1) / this.batchSize)}: ` +
            `${i + 1}/${products.ids.length} products | ` +
            `saved ${batchTruths.length} truths | ` +
            `cross-artist: ${batchCounts.cross_artist}, ` +
            `same-artist: ${batchCounts.same_artist}, ` +
            `variants skipped: ${batchCounts.variant_skipped}, ` +
            `below threshold: ${batchCounts.below_threshold}`
          );

          truths.push(...batchTruths);
          batchTruths.length = 0;
          batchCounts = { cross_artist: 0, same_artist: 0, variant_skipped: 0, below_threshold: 0 };

          // Brief pause between batches to keep system responsive
          await new Promise(r => setTimeout(r, 500));
        }
      }

      logger.info(`Product similarity complete: ${truths.length} truths (${this.stats.processed} products compared)`);
      return truths;

    } catch (error) {
      logger.error('Product similarity discovery error:', error);
      throw error;
    }
  }

  /**
   * Metadata-based similarity boost.
   * Same-artist is NOT boosted (it inflates scores for obvious matches).
   * Cross-artist gets a boost when they share category/price/type,
   * because those are genuinely interesting cross-catalog connections.
   */
  calculateMetadataBoost(metaA, metaB, tier) {
    let boost = 0;
    let factors = 0;

    if (metaA.category_id && metaB.category_id) {
      factors++;
      if (metaA.category_id === metaB.category_id) boost += 0.3;
    }

    if (metaA.price && metaB.price) {
      factors++;
      const priceDiff = Math.abs(parseFloat(metaA.price) - parseFloat(metaB.price))
        / Math.max(parseFloat(metaA.price), parseFloat(metaB.price));
      if (priceDiff <= 0.3) boost += 0.2 * (1 - priceDiff);
    }

    if (metaA.product_type && metaB.product_type) {
      factors++;
      if (metaA.product_type === metaB.product_type) boost += 0.15;
    }

    if (metaA.avg_rating && metaB.avg_rating) {
      factors++;
      if (parseFloat(metaA.avg_rating) >= 4 && parseFloat(metaB.avg_rating) >= 4) boost += 0.15;
    }

    // Same-artist matches: halve the boost so it doesn't dominate
    if (tier === 'same_artist') boost *= 0.5;

    return factors > 0 ? boost : 0;
  }

  buildSimilarityTruth(productAId, productBId, score, semanticScore, metadataBoost, metaA, metaB, tier) {
    const idA = productAId.replace('product_', '');
    const idB = productBId.replace('product_', '');
    const nameA = metaA.name || idA;
    const nameB = metaB.name || idB;

    const ttl = tier === 'cross_artist' ? 14 : 7; // cross-artist truths live longer

    return {
      type: 'product_similarity',
      entity_type: 'product',
      entities: [idA, idB],
      score: Math.round(score * 100) / 100,
      confidence: this.calculateConfidence(semanticScore, metadataBoost, tier),
      content: `[${tier}] "${nameA}" and "${nameB}" are ${Math.round(score * 100)}% similar`,
      evidence: {
        semantic_similarity: Math.round(semanticScore * 100) / 100,
        metadata_boost: Math.round(metadataBoost * 100) / 100,
        tier,
        shared_category: metaA.category_id === metaB.category_id,
        shared_artist: metaA.vendor_id === metaB.vendor_id,
        price_range_match: this.priceRangeMatch(metaA.price, metaB.price),
        artist_a: metaA.artist_username || '',
        artist_b: metaB.artist_username || '',
        category_a: metaA.category_name || '',
        category_b: metaB.category_name || ''
      },
      expires_at: new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  calculateConfidence(semanticScore, metadataBoost, tier) {
    const base = (semanticScore * 0.6) + (Math.min(semanticScore, metadataBoost * 3) * 0.4);
    const tierBonus = tier === 'cross_artist' ? 0.1 : 0;
    return Math.round(Math.min(base + 0.2 + tierBonus, 1) * 100) / 100;
  }

  priceRangeMatch(priceA, priceB) {
    if (!priceA || !priceB) return false;
    const a = parseFloat(priceA);
    const b = parseFloat(priceB);
    return Math.abs(a - b) / Math.max(a, b) <= 0.3;
  }

  async validate(truth) {
    try {
      const entities = truth.metadata?.entities?.split(',') || [];
      if (entities.length !== 2) return null;

      const productCollection = this.vectorDB.getCollection('art_metadata');
      const results = await productCollection.get({
        ids: [`product_${entities[0]}`, `product_${entities[1]}`],
        include: ['metadatas']
      });

      if (!results.ids || results.ids.length !== 2) return null;
      if (!results.metadatas.every(m => m.classification === '101')) return null;

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
