/**
 * AI Services Index - Phase B & C Features (STUBS)
 * 
 * Premium AI-powered video features for Pro and Enterprise tiers
 * 
 * All services in this directory are STUBS - they throw errors
 * indicating that the features require upgraded subscriptions.
 * 
 * Implementation timeline:
 * - Phase B (Pro): Runway ML integration
 * - Phase C (Enterprise): Avatars, voiceovers, script-to-video
 */

const { getRunwayService } = require('./RunwayService');
const { getElevenLabsService } = require('./ElevenLabsService');
const { getAvatarService } = require('./AvatarService');
const { getScriptToVideoService } = require('./ScriptToVideoService');

module.exports = {
  // Phase B - Pro tier
  getRunwayService,
  
  // Phase C - Enterprise tier
  getElevenLabsService,
  getAvatarService,
  getScriptToVideoService
};
