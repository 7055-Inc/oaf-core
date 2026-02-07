/**
 * Response Organizer - Llama-Powered Result Organization
 * 
 * Organizes search results into a coherent response:
 * - Groups results by type
 * - Prioritizes based on relevance and user context
 * - Adds explanations and reasoning
 * - Formats for different display modes
 * 
 * This is the "presentation" part of Leo Brain
 */

const logger = require('../logger');

class ResponseOrganizer {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  /**
   * Organize search results into structured response
   * 
   * @param {Array} results - Raw search results
   * @param {Object} analysis - Query analysis from QueryAnalyzer
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Organized response
   */
  async organizeResponse(results, analysis, context = {}) {
    try {
      const {
        userId = 'anonymous',
        displayMode = 'standard',
        includeExplanations = true
      } = context;

      logger.info(`[ResponseOrganizer] Organizing ${results.length} results (mode: ${displayMode})`);

      // Create organization prompt for Llama
      const organizationPrompt = this.createOrganizationPrompt(results, analysis, context);
      
      // Query Llama for organization
      const llamaResponse = await this.queryLlama(organizationPrompt);
      
      if (!llamaResponse) {
        logger.warn('Llama organization failed, using fallback');
        return this.createFallbackOrganization(results, analysis, context);
      }

      // Validate and enrich the organization
      const organized = this.enrichOrganization(llamaResponse, results, analysis, context);
      
      logger.info(`[ResponseOrganizer] Organized into ${Object.keys(organized.organized_results).length} categories`);
      
      return organized;

    } catch (error) {
      logger.error('[ResponseOrganizer] Organization failed:', error);
      return this.createFallbackOrganization(results, analysis, context);
    }
  }

  /**
   * Create organization prompt for Llama
   */
  createOrganizationPrompt(results, analysis, context) {
    const { displayMode, includeExplanations, limit = 20 } = context;

    // Sample results for Llama (don't send all data)
    const resultSample = results.slice(0, 20).map((r, i) => ({
      index: i,
      id: r.id || r.metadata?.original_id,
      type: r.collection || r.metadata?.type,
      relevance: r.similarity || r.scoring?.final_score,
      personalized: r.scoring?.personalized,
      metadata: {
        name: r.metadata?.name || r.metadata?.title,
        price: r.metadata?.price,
        status: r.metadata?.status
      }
    }));

    return `You are Leo AI's result organization engine. Organize the following search results into a structured response.

QUERY ANALYSIS:
${JSON.stringify(analysis, null, 2)}

SEARCH RESULTS (sample of ${results.length} total):
${JSON.stringify(resultSample, null, 2)}

CONTEXT:
- Display Mode: ${displayMode} (standard, modal, feed)
- Include Explanations: ${includeExplanations}
- Requested Limit: ${limit}

INSTRUCTIONS:
Organize the results by:
1. Grouping by type (products, artists, articles, events, etc.)
2. Prioritizing based on relevance and personalization
3. Applying display mode limits (modal: fewer results, feed: more results)
4. Providing brief explanations for why results are included
5. Calculating overall confidence in the results

RESPOND WITH VALID JSON ONLY:
{
  "organized_results": {
    "products": [
      {
        "id": "product_id",
        "relevance": 0.95,
        "reason": "Perfect match for user's color preferences",
        "rank": 1
      }
    ],
    "artists": [],
    "articles": [],
    "events": []
  },
  "truths_applied": ["User prefers blue colors", "Price sensitivity: $300-$500"],
  "confidence": 0.85,
  "reasoning": "Results are highly relevant with strong personalization signals",
  "display_mode_applied": "standard"
}

IMPORTANT: Return only valid JSON, no other text.`;
  }

  /**
   * Query Llama via Ollama HTTP API
   */
  async queryLlama(prompt) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
      
      const response = await fetch(`${this.ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 500 // More tokens needed for organization
          }
        })
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error(`Ollama API request failed: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      const cleanResponse = data.response?.replace(/[^\x20-\x7E\n]/g, '').trim();
      
      // Extract JSON from response
      const jsonMatch = cleanResponse?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        logger.warn('No valid JSON found in Llama response');
        return null;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn('Llama query timeout');
      } else {
        logger.error('Failed to query Llama:', error);
      }
      return null;
    }
  }

  /**
   * Enrich and validate Llama's organization
   */
  enrichOrganization(llamaResponse, results, analysis, context) {
    const { displayMode = 'standard', limit = 20 } = context;

    // Apply display mode limits to Llama's organization
    const organized = this.applyDisplayModeLimits(
      llamaResponse.organized_results || {},
      displayMode,
      limit
    );

    return {
      organized_results: organized,
      truths_applied: llamaResponse.truths_applied || [],
      confidence: llamaResponse.confidence || 0.5,
      reasoning: llamaResponse.reasoning || 'Results organized by relevance',
      display_mode_applied: llamaResponse.display_mode_applied || displayMode,
      intelligence_applied: true,
      timestamp: new Date().toISOString(),
      organizer_version: '1.0.0'
    };
  }

  /**
   * Apply display mode specific limits
   */
  applyDisplayModeLimits(organizedResults, displayMode, requestedLimit) {
    const limits = {
      modal: { products: 5, artists: 3, articles: 2, events: 2, reviews: 3 },
      standard: { products: 20, artists: 10, articles: 5, events: 5, reviews: 5 },
      feed: { products: 50, artists: 20, articles: 10, events: 10, reviews: 10 }
    };

    const modeLimits = limits[displayMode] || limits.standard;
    const limited = {};

    for (const [category, results] of Object.entries(organizedResults)) {
      const categoryLimit = modeLimits[category] || 10;
      limited[category] = (results || []).slice(0, categoryLimit);
    }

    return limited;
  }

  /**
   * Create fallback organization when Llama fails
   */
  createFallbackOrganization(results, analysis, context) {
    const { displayMode = 'standard', limit = 20 } = context;

    // Simple categorization by collection
    const organized = {
      products: [],
      artists: [],
      articles: [],
      events: [],
      reviews: [],
      other: []
    };

    results.forEach(result => {
      const collection = result.collection || result.metadata?.type || 'other';
      const id = result.id || result.metadata?.original_id || result.metadata?.product_id;
      const relevance = result.scoring?.final_score || result.similarity || 0.5;
      
      const item = {
        id: id,
        relevance: relevance,
        reason: result.scoring?.personalized ? 'Personalized match' : 'Similarity match',
        rank: 0 // Will be set after sorting
      };

      // Map collection to category
      if (collection === 'art_metadata' || collection === 'products') {
        organized.products.push(item);
      } else if (collection === 'user_profiles' || collection === 'artists') {
        organized.artists.push(item);
      } else if (collection === 'site_content' || collection === 'articles') {
        organized.articles.push(item);
      } else if (collection === 'event_data' || collection === 'events') {
        organized.events.push(item);
      } else if (collection === 'reviews') {
        organized.reviews.push(item);
      } else {
        organized.other.push(item);
      }
    });

    // Sort by relevance and assign ranks
    for (const category of Object.keys(organized)) {
      organized[category].sort((a, b) => b.relevance - a.relevance);
      organized[category].forEach((item, index) => {
        item.rank = index + 1;
      });
    }

    // Apply display mode limits
    const limited = this.applyDisplayModeLimits(organized, displayMode, limit);

    return {
      organized_results: limited,
      truths_applied: [],
      confidence: 0.3,
      reasoning: 'Fallback organization by similarity (Llama unavailable)',
      display_mode_applied: displayMode,
      intelligence_applied: false,
      fallback: true,
      timestamp: new Date().toISOString(),
      organizer_version: '1.0.0'
    };
  }

  /**
   * Add explanations to results (for transparency)
   */
  addExplanations(organizedResults, analysis) {
    const withExplanations = {};

    for (const [category, results] of Object.entries(organizedResults)) {
      withExplanations[category] = results.map(result => ({
        ...result,
        explanation: this.generateExplanation(result, analysis, category)
      }));
    }

    return withExplanations;
  }

  /**
   * Generate human-readable explanation for a result
   */
  generateExplanation(result, analysis, category) {
    const parts = [];

    if (result.relevance > 0.8) {
      parts.push('Highly relevant to your search');
    } else if (result.relevance > 0.6) {
      parts.push('Good match');
    } else {
      parts.push('Related to your search');
    }

    if (result.reason) {
      parts.push(result.reason.toLowerCase());
    }

    if (analysis.personalization && result.personalized) {
      parts.push('personalized for you');
    }

    return parts.join(', ');
  }

  /**
   * Health check for organizer
   */
  async healthCheck() {
    try {
      const testPrompt = `Respond with valid JSON only: {"status": "ok"}`;
      const response = await this.queryLlama(testPrompt);
      
      return {
        healthy: response !== null,
        ollama_host: this.ollamaHost,
        model: this.model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = ResponseOrganizer;
