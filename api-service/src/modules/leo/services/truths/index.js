/**
 * Leo AI - Truth Discovery System
 * 
 * Modular system for discovering patterns and correlations across data.
 * 
 * Components:
 * - TruthStore: Storage and retrieval of discovered truths
 * - TruthOrchestrator: Schedules and runs discoverers
 * - BaseDiscoverer: Base class for all pattern discoverers
 * - Discoverers: Pluggable modules for specific pattern types
 */

const { TruthStore, getTruthStore } = require('./TruthStore');
const { TruthOrchestrator, getTruthOrchestrator } = require('./TruthOrchestrator');
const BaseDiscoverer = require('./BaseDiscoverer');
const discoverers = require('./discoverers');

module.exports = {
  TruthStore,
  getTruthStore,
  TruthOrchestrator,
  getTruthOrchestrator,
  BaseDiscoverer,
  ...discoverers
};
