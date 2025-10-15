const VectorDatabase = require('../core/vectorDatabase');
const TruthVectorDatabase = require('../core/truthVectorDatabase');
const logger = require('../utils/logger');
const { spawn } = require('child_process');

class TruthExtractor {
  constructor() {
    this.mainDB = new VectorDatabase();
    this.truthDB = new TruthVectorDatabase();
    this.isRunning = false;
    this.extractionQueue = [];
    this.processedDocuments = new Set();
  }

  async initialize() {
    try {
      logger.info('🎨 [TRUTH-EXTRACTOR] Initializing truth extraction service...');
      
      // Initialize both databases
      await this.mainDB.initialize();
      await this.truthDB.initialize();
      
      logger.info('✅ Truth extraction service initialized');
      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to initialize truth extraction service:', error);
      throw error;
    }
  }

  /**
   * Extract truths from a batch of documents using Llama 3.2
   */
  async extractTruthsFromDocuments(documents, context = '') {
    try {
      if (!documents || documents.length === 0) {
        return { success: false, message: 'No documents provided' };
      }

      logger.info(`🎨 [TRUTH-EXTRACTOR] Processing ${documents.length} documents for truth extraction`);

      const extractedTruths = [];

      for (const doc of documents) {
        try {
          // Skip if already processed
          const docId = doc.id || doc.metadata?.id || 'unknown';
          if (this.processedDocuments.has(docId)) {
            continue;
          }

          // Prepare document content for analysis
          const content = doc.content || JSON.stringify(doc);
          const metadata = doc.metadata || {};
          
          // Create analysis prompt for Llama
          const analysisPrompt = this.createAnalysisPrompt(content, metadata, context);
          
          // Get truth extraction from Llama
          const llamaResponse = await this.queryLlama(analysisPrompt);
          
          if (llamaResponse && llamaResponse.truths) {
            // Process each extracted truth
            for (const truth of llamaResponse.truths) {
              const processedTruth = {
                content: truth.pattern,
                metadata: {
                  source_document: docId,
                  pattern_type: truth.type,
                  confidence_level: truth.confidence,
                  extracted_at: new Date().toISOString(),
                  source_collection: doc.collection || 'unknown',
                  ...metadata
                },
                confidence: truth.confidence,
                source: 'llama_extraction',
                type: truth.type
              };

              // Store truth in appropriate collection
              const collectionName = this.determineTruthCollection(truth.type);
              await this.truthDB.storeTruth(collectionName, processedTruth);
              
              extractedTruths.push(processedTruth);
            }
          }

          // Mark as processed
          this.processedDocuments.add(docId);

        } catch (error) {
          logger.warn(`Failed to extract truths from document ${doc.id}:`, error);
        }
      }

      logger.info(`✅ Extracted ${extractedTruths.length} truths from ${documents.length} documents`);
      
      return {
        success: true,
        truthsExtracted: extractedTruths.length,
        documentsProcessed: documents.length,
        truths: extractedTruths
      };

    } catch (error) {
      logger.error('Truth extraction failed:', error);
      throw error;
    }
  }

  /**
   * Create analysis prompt for Llama 3.2
   */
  createAnalysisPrompt(content, metadata, context) {
    return `You are Leo AI's truth extraction system. Analyze the following data and extract behavioral patterns, user preferences, and correlations.

CONTEXT: ${context || 'Art marketplace user data analysis'}

DATA TO ANALYZE:
${content}

METADATA:
${JSON.stringify(metadata, null, 2)}

INSTRUCTIONS:
1. Look for user behavior patterns (preferences, search patterns, interaction patterns)
2. Identify correlations between different data points
3. Extract actionable insights about user preferences
4. Focus on patterns that could improve search results or recommendations

RESPOND ONLY WITH VALID JSON in this exact format:
{
  "truths": [
    {
      "pattern": "Clear description of the pattern or truth discovered",
      "type": "user_preference|behavioral_pattern|content_correlation|temporal_pattern",
      "confidence": 0.1-1.0,
      "evidence": "What data supports this pattern",
      "actionable": "How this could be used to improve the system"
    }
  ]
}

Only extract patterns with confidence >= 0.3. Maximum 3 truths per analysis.`;
  }

  /**
   * Query Llama 3.2 via Ollama using HTTP API
   */
  async queryLlama(prompt) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 500
          }
        })
      });

      if (!response.ok) {
        logger.error('Ollama API request failed:', response.status);
        return null;
      }

      const data = await response.json();
      const llamaResponse = data.response;

      if (!llamaResponse) {
        logger.warn('Empty response from Llama');
        return null;
      }

      try {
        // Clean up the response and parse JSON
        const cleanResponse = llamaResponse.replace(/[^\x20-\x7E\n]/g, '').trim();
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          return parsedResponse;
        } else {
          logger.warn('No valid JSON found in Llama response:', cleanResponse.substring(0, 200));
          return null;
        }
      } catch (parseError) {
        logger.warn('Failed to parse Llama response as JSON:', parseError);
        return null;
      }

    } catch (error) {
      logger.error('Failed to query Llama via HTTP API:', error);
      return null;
    }
  }

  /**
   * Determine which truth collection to use based on truth type
   */
  determineTruthCollection(truthType) {
    const typeMap = {
      'user_preference': 'user_truths',
      'behavioral_pattern': 'behavioral_truths',
      'content_correlation': 'content_truths',
      'temporal_pattern': 'temporal_truths',
      'pattern_correlation': 'pattern_truths'
    };

    return typeMap[truthType] || 'behavioral_truths';
  }

  /**
   * Start automated truth discovery process
   */
  async startAutomatedDiscovery(options = {}) {
    if (this.isRunning) {
      return { success: false, message: 'Truth discovery already running' };
    }

    try {
      this.isRunning = true;
      logger.info('🎨 [TRUTH-EXTRACTOR] Starting automated truth discovery...');

      const batchSize = options.batchSize || 10;
      const collections = options.collections || ['site_content', 'user_interactions', 'art_metadata'];
      
      for (const collectionName of collections) {
        logger.info(`Processing collection: ${collectionName}`);
        
        // Get documents from main database
        const searchResults = await this.mainDB.semanticSearch('*', collectionName, { limit: batchSize });
        
        if (searchResults.length > 0) {
          await this.extractTruthsFromDocuments(searchResults, `Analysis of ${collectionName} collection`);
        }
      }

      this.isRunning = false;
      logger.info('✅ Automated truth discovery completed');
      
      return { success: true, message: 'Truth discovery completed' };

    } catch (error) {
      this.isRunning = false;
      logger.error('Automated truth discovery failed:', error);
      throw error;
    }
  }

  /**
   * Get truth extraction statistics
   */
  async getExtractionStats() {
    try {
      const truthStats = await this.truthDB.getAllStats();
      const mainStats = await this.mainDB.healthCheck();

      return {
        main_database: {
          total_documents: mainStats.totalDocuments,
          collections: mainStats.collections
        },
        truth_database: {
          total_truths: truthStats.totalTruths,
          collections: truthStats.collections,
          collection_breakdown: truthStats.collectionStats
        },
        extraction_status: {
          is_running: this.isRunning,
          processed_documents: this.processedDocuments.size,
          queue_size: this.extractionQueue.length
        }
      };
    } catch (error) {
      logger.error('Failed to get extraction stats:', error);
      throw error;
    }
  }

  /**
   * Health check for truth extraction service
   */
  async healthCheck() {
    try {
      const mainHealth = await this.mainDB.healthCheck();
      const truthHealth = await this.truthDB.healthCheck();

      return {
        healthy: mainHealth.healthy && truthHealth.healthy,
        main_database: mainHealth,
        truth_database: truthHealth,
        extractor_status: {
          is_running: this.isRunning,
          processed_count: this.processedDocuments.size
        },
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
