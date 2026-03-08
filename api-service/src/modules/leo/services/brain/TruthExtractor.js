/**
 * Truth Extractor - Llama-Powered Pattern Discovery
 * 
 * Extracts behavioral patterns, preferences, and correlations from documents
 * This feeds the truth discovery system with Llama's intelligence
 * 
 * Different from the discovery system - this is for ad-hoc extraction
 */

const logger = require('../logger');

class TruthExtractor {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  /**
   * Extract truths from a batch of documents
   * 
   * @param {Array} documents - Documents to analyze
   * @param {Object} context - Context for extraction
   * @returns {Promise<Object>} Extracted truths
   */
  async extractTruths(documents, context = {}) {
    try {
      if (!documents || documents.length === 0) {
        return {
          success: false,
          message: 'No documents provided',
          truths: []
        };
      }

      logger.info(`[TruthExtractor] Processing ${documents.length} documents`);

      const {
        contextDescription = 'User behavior analysis',
        minConfidence = 0.3,
        maxTruthsPerDoc = 3
      } = context;

      const allTruths = [];

      // Process documents in batches to avoid overwhelming Llama
      const batchSize = 5;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchTruths = await this.extractBatchTruths(batch, contextDescription, minConfidence, maxTruthsPerDoc);
        allTruths.push(...batchTruths);
      }

      logger.info(`[TruthExtractor] Extracted ${allTruths.length} truths from ${documents.length} documents`);

      return {
        success: true,
        truths_extracted: allTruths.length,
        documents_processed: documents.length,
        truths: allTruths
      };

    } catch (error) {
      logger.error('[TruthExtractor] Extraction failed:', error);
      return {
        success: false,
        error: error.message,
        truths: []
      };
    }
  }

  /**
   * Extract truths from a batch of documents
   */
  async extractBatchTruths(documents, contextDescription, minConfidence, maxTruthsPerDoc) {
    const truths = [];

    for (const doc of documents) {
      try {
        const docTruths = await this.extractDocumentTruths(doc, contextDescription, minConfidence, maxTruthsPerDoc);
        truths.push(...docTruths);
      } catch (error) {
        logger.warn(`Failed to extract truths from document ${doc.id}:`, error);
      }
    }

    return truths;
  }

  /**
   * Extract truths from a single document
   */
  async extractDocumentTruths(doc, contextDescription, minConfidence, maxTruths) {
    try {
      const extractionPrompt = this.createExtractionPrompt(doc, contextDescription, minConfidence, maxTruths);
      
      const llamaResponse = await this.queryLlama(extractionPrompt);
      
      if (!llamaResponse || !llamaResponse.truths) {
        return [];
      }

      // Filter and format truths
      const truths = llamaResponse.truths
        .filter(truth => truth.confidence >= minConfidence)
        .map(truth => ({
          content: truth.pattern,
          type: truth.type,
          confidence: truth.confidence,
          evidence: truth.evidence,
          actionable: truth.actionable,
          metadata: {
            source_document: doc.id || 'unknown',
            extracted_at: new Date().toISOString(),
            extractor_version: '1.0.0',
            ...doc.metadata
          }
        }));

      return truths;

    } catch (error) {
      logger.warn(`Failed to extract truths from document:`, error);
      return [];
    }
  }

  /**
   * Create extraction prompt for Llama
   */
  createExtractionPrompt(doc, contextDescription, minConfidence, maxTruths) {
    const content = doc.content || JSON.stringify(doc.metadata || doc);
    const metadata = JSON.stringify(doc.metadata || {}, null, 2);

    return `You are Leo AI's truth extraction system. Analyze the following data and extract behavioral patterns, user preferences, and correlations.

CONTEXT: ${contextDescription}

DOCUMENT DATA:
${content.substring(0, 1000)} ${content.length > 1000 ? '...(truncated)' : ''}

METADATA:
${metadata}

INSTRUCTIONS:
1. Look for user behavior patterns (preferences, search patterns, interaction patterns)
2. Identify correlations between different data points
3. Extract actionable insights about user preferences
4. Focus on patterns that could improve search results or recommendations
5. Only extract patterns with confidence >= ${minConfidence}
6. Maximum ${maxTruths} truths per document

RESPOND WITH VALID JSON ONLY:
{
  "truths": [
    {
      "pattern": "Clear description of the pattern or truth discovered",
      "type": "user_preference|behavioral_pattern|content_correlation|temporal_pattern",
      "confidence": 0.3-1.0,
      "evidence": "What data supports this pattern",
      "actionable": "How this could be used to improve the system"
    }
  ]
}

IMPORTANT: Return only valid JSON with truths array (can be empty if no patterns found), no other text.`;
  }

  /**
   * Query Llama via Ollama HTTP API
   */
  async queryLlama(prompt) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
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
            num_predict: 500
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
   * Extract truths from user interaction data
   * Specialized extraction for user behavior
   */
  async extractUserInteractionTruths(userId, interactions, context = {}) {
    try {
      logger.info(`[TruthExtractor] Extracting truths for user ${userId} from ${interactions.length} interactions`);

      // Summarize interactions for Llama
      const interactionSummary = this.summarizeInteractions(interactions);
      
      const prompt = this.createUserInteractionPrompt(userId, interactionSummary);
      
      const llamaResponse = await this.queryLlama(prompt);
      
      if (!llamaResponse || !llamaResponse.truths) {
        return {
          success: false,
          truths: []
        };
      }

      const truths = llamaResponse.truths.map(truth => ({
        ...truth,
        metadata: {
          user_id: userId,
          interaction_count: interactions.length,
          extracted_at: new Date().toISOString(),
          extractor_version: '1.0.0'
        }
      }));

      logger.info(`[TruthExtractor] Extracted ${truths.length} user-specific truths`);

      return {
        success: true,
        user_id: userId,
        truths: truths
      };

    } catch (error) {
      logger.error('[TruthExtractor] User interaction extraction failed:', error);
      return {
        success: false,
        error: error.message,
        truths: []
      };
    }
  }

  /**
   * Summarize interactions for Llama analysis
   */
  summarizeInteractions(interactions) {
    const summary = {
      total_count: interactions.length,
      types: {},
      products: [],
      temporal_patterns: {}
    };

    interactions.forEach(interaction => {
      // Count by type
      const type = interaction.type || 'unknown';
      summary.types[type] = (summary.types[type] || 0) + 1;

      // Track products
      if (interaction.product_id) {
        summary.products.push({
          id: interaction.product_id,
          type: interaction.type,
          timestamp: interaction.timestamp
        });
      }

      // Track temporal patterns
      if (interaction.timestamp) {
        const hour = new Date(interaction.timestamp).getHours();
        const dayOfWeek = new Date(interaction.timestamp).getDay();
        
        summary.temporal_patterns[`hour_${hour}`] = (summary.temporal_patterns[`hour_${hour}`] || 0) + 1;
        summary.temporal_patterns[`day_${dayOfWeek}`] = (summary.temporal_patterns[`day_${dayOfWeek}`] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * Create prompt for user interaction analysis
   */
  createUserInteractionPrompt(userId, interactionSummary) {
    return `You are Leo AI's user behavior analysis system. Analyze the following user interaction data and extract behavioral patterns.

USER ID: ${userId}

INTERACTION SUMMARY:
${JSON.stringify(interactionSummary, null, 2)}

INSTRUCTIONS:
Analyze the interaction patterns and extract:
1. User preferences (what they like/dislike)
2. Behavioral patterns (when they shop, what they click)
3. Purchase patterns (price sensitivity, category preferences)
4. Temporal patterns (time of day, day of week preferences)

RESPOND WITH VALID JSON ONLY:
{
  "truths": [
    {
      "pattern": "Description of discovered pattern",
      "type": "user_preference|behavioral_pattern|temporal_pattern",
      "confidence": 0.3-1.0,
      "evidence": "Data supporting this pattern",
      "actionable": "How to use this pattern"
    }
  ]
}

IMPORTANT: Return only valid JSON, no other text.`;
  }

  /**
   * Health check for extractor
   */
  async healthCheck() {
    try {
      const testPrompt = `Respond with valid JSON only: {"truths": []}`;
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

module.exports = TruthExtractor;
