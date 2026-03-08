/**
 * Leo Brain Module - Intelligence Layer
 * 
 * Exports all brain components:
 * - CentralBrain: Main orchestrator (use getBrain() singleton)
 * - QueryAnalyzer: Llama-powered query understanding
 * - ResponseOrganizer: Llama-powered result formatting
 * - TruthExtractor: Pattern discovery from documents
 */

const CentralBrain = require('./CentralBrain');
const QueryAnalyzer = require('./QueryAnalyzer');
const ResponseOrganizer = require('./ResponseOrganizer');
const TruthExtractor = require('./TruthExtractor');

// Export singleton getter
const { getBrain } = require('./CentralBrain');

module.exports = {
  CentralBrain,
  getBrain,
  QueryAnalyzer,
  ResponseOrganizer,
  TruthExtractor
};
