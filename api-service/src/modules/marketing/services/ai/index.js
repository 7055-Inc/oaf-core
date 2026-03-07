/**
 * AI Services Index
 * 
 * Active services:
 * - ClaudeService: Anthropic Claude API for creative content generation
 * - ContentGenerationService: Orchestrator (Leo context + Claude creative + media pipeline)
 * - MediaMatcherService: Leo searches user's media library + catalog for matching assets
 * - MediaComposerService: Creates platform-ready media (resize, overlays, clips)
 * 
 * Stub services (Phase B & C):
 * - RunwayService: AI video editing (Pro tier)
 * - ElevenLabsService: AI voice generation (Enterprise tier)
 * - AvatarService: AI avatar videos (Enterprise tier)
 * - ScriptToVideoService: Full script-to-video pipeline (Enterprise tier)
 */

const { getClaudeService } = require('./ClaudeService');
const { getContentGenerationService } = require('./ContentGenerationService');
const { getBlogGenerationService } = require('./BlogGenerationService');
const { getMediaMatcherService } = require('./MediaMatcherService');
const { getMediaComposerService } = require('./MediaComposerService');
const { getRunwayService } = require('./RunwayService');
const { getElevenLabsService } = require('./ElevenLabsService');
const { getAvatarService } = require('./AvatarService');
const { getScriptToVideoService } = require('./ScriptToVideoService');

module.exports = {
  // Active - AI Content Generation
  getClaudeService,
  getContentGenerationService,
  getBlogGenerationService,

  // Active - Media Intelligence
  getMediaMatcherService,
  getMediaComposerService,

  // Phase B - Pro tier
  getRunwayService,
  
  // Phase C - Enterprise tier
  getElevenLabsService,
  getAvatarService,
  getScriptToVideoService
};
