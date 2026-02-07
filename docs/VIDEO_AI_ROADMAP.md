# Video AI Features Roadmap

## Executive Summary

This document outlines the future AI-powered video features for the Leo Marketing System, building upon the foundational video processing capabilities (Phase A). The roadmap is organized into subscription tiers that align with feature access and expected costs.

**Document Version**: 1.0  
**Created**: 2026-02-07  
**Status**: Planning Phase

---

## Subscription Tiers

| Tier | Monthly | Features | Target Users |
|------|---------|----------|--------------|
| **Basic** | $20 | Phase A - Manual uploads, basic templates, captions | Small businesses, individual creators |
| **Pro** | $50 | + Runway ML editing, advanced auto-clip, 10 AI edits/month | Growing brands, agencies |
| **Enterprise** | $150 | + AI avatars, voiceovers, unlimited AI features | Large brands, enterprise marketing teams |

### Free Tier (Not Offered)
Video processing is resource-intensive and requires ongoing API costs. All video features require a paid subscription.

---

## Phase A: Foundation (✅ COMPLETE - Sprint C2)

### Implemented Features

**Video Processing (FFmpeg-based)**:
- Format conversion (MP4, WebM, MOV)
- Resizing and aspect ratio management
- Clip extraction and combination
- Audio extraction
- Thumbnail generation
- Platform-specific adaptation (Instagram, TikTok, YouTube, etc.)

**Captions (Whisper-based)**:
- Speech-to-text transcription (OpenAI API or self-hosted)
- SRT/VTT subtitle generation
- Caption burning (embed in video)
- Multi-language support

**Auto-Clipping**:
- Scene detection (visual changes)
- Audio analysis (peaks, silence, speech)
- Highlight detection (best moments)
- Smart splitting for long content

**Template System**:
- Pre-built video templates
- Intro/outro support
- Filter presets (vintage, warm, cool, B&W)
- Platform-optimized templates

### Cost Structure (Phase A)

**OpenAI Whisper API** (if using API vs self-hosted):
- $0.006 per minute of audio
- Average 5-minute video: $0.03
- Expected usage (Basic tier): ~20 videos/month = **$0.60/user/month**

**Server Costs**:
- CPU-intensive FFmpeg processing
- Storage for temp files and processed videos
- Estimated: **$5-10/user/month** in compute

**Total Cost (Basic Tier)**: ~$5-11/user/month  
**Revenue**: $20/month  
**Margin**: **$9-15/user/month**

---

## Phase B: AI Editing (Pro Tier)

### Objective
Enhance video editing with AI-powered capabilities for background removal, object manipulation, and style transfer.

### Runway ML Integration

**API**: https://runwayml.com/api  
**Documentation**: https://docs.runwayml.com/

#### Capabilities

1. **Background Removal (Green Screen Effect)**
   - Remove video backgrounds without green screen
   - Replace with custom backgrounds
   - API endpoint: `/v1/inferences/gen2/background-removal`
   - Cost: ~$0.05/second of video

2. **Motion Tracking**
   - Track objects/people in video
   - Add effects that follow motion
   - API endpoint: `/v1/inferences/tracking`
   - Cost: ~$0.03/second

3. **Inpainting (Remove Objects)**
   - Remove unwanted objects from video
   - Fill in background seamlessly
   - API endpoint: `/v1/inferences/inpainting`
   - Cost: ~$0.08/second

4. **Style Transfer**
   - Apply artistic styles to video
   - Convert to different visual styles
   - API endpoint: `/v1/inferences/style-transfer`
   - Cost: ~$0.04/second

#### Implementation Plan

**Service**: `/services/ai/RunwayService.js`

```javascript
class RunwayService {
  // API authentication
  constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY;
    this.baseUrl = 'https://api.runwayml.com/v1';
  }

  // Background removal
  async removeBackground(videoPath, options = {}) {
    // Upload video
    // Call inference API
    // Poll for completion
    // Download result
    // Return processed video path
  }

  // Object removal (inpainting)
  async removeObject(videoPath, maskData, options = {}) {
    // Similar flow to background removal
    // Requires mask definition (coordinates/frames)
  }

  // Style transfer
  async applyStyle(videoPath, style, options = {}) {
    // Apply artistic style to video
    // Styles: 'oil_painting', 'watercolor', 'sketch', etc.
  }

  // Motion tracking
  async trackMotion(videoPath, trackingData, options = {}) {
    // Track objects for adding effects
  }
}
```

### Advanced Auto-Clip

**ML-Based Highlight Detection**:
- Train model on engagement data (what clips perform well)
- Predict "viral" moments based on:
  - Visual composition
  - Audio patterns
  - Scene transitions
  - Face detection and emotion recognition
- Auto-select best clips with confidence scores

**Implementation**:
- Use TensorFlow.js or external ML API
- Train on historical performance data
- Continuously improve with feedback loop

**Cost**: Minimal (mostly compute for inference)

### Pro Tier Cost Analysis

**Runway ML Usage** (per user/month):
- Average: 50 AI edits @ 10 seconds each = 500 seconds
- At $0.05/second average: **$25/month**
- With 10 edits/month limit: **$5/month**

**Compute**:
- Additional CPU for ML inference: **$5-10/month**

**Total AI Cost (Pro Tier)**: ~$10-15/user/month  
**Revenue**: $50/month  
**Margin**: **$35-40/user/month**

### Success Metrics
- Background removal accuracy > 95%
- Style transfer processing time < 2 minutes per 30s clip
- User satisfaction with AI edits > 80%

---

## Phase C: Full Auto-Generation (Enterprise Tier)

### Objective
Enable complete script-to-video generation with AI avatars, voiceovers, and automated asset selection.

### AI Avatars (Synthesia / HeyGen)

**Primary Choice**: Synthesia  
**API**: https://www.synthesia.io/api  
**Alternative**: HeyGen (https://www.heygen.com/)

#### Capabilities

1. **Talking Head Videos from Script**
   - Generate professional presenters from text
   - 150+ AI avatars available
   - 120+ languages and accents
   - Custom avatar creation (enterprise)

2. **Use Cases**
   - Product explainer videos
   - Company announcements
   - Tutorial videos
   - Personalized marketing messages

3. **Technical Details**
   - API endpoint: `/v2/videos`
   - Input: Script text, avatar selection, voice settings
   - Output: Rendered video (typically 1-5 minutes processing)
   - Cost: **$1-2 per minute of video**

#### Implementation Plan

**Service**: `/services/ai/AvatarService.js`

```javascript
class AvatarService {
  constructor() {
    this.apiKey = process.env.SYNTHESIA_API_KEY;
    this.baseUrl = 'https://api.synthesia.io/v2';
  }

  // List available avatars
  async listAvatars() {
    // GET /avatars
    // Returns array of avatar IDs and previews
  }

  // Create video with avatar
  async createVideo(script, avatarId, options = {}) {
    // POST /videos
    // Body: { script, avatar, voice, background, title }
    // Returns video ID
  }

  // Check video status
  async getVideoStatus(videoId) {
    // GET /videos/{id}
    // Returns: { status: 'processing' | 'complete', url }
  }

  // Download completed video
  async downloadVideo(videoId, outputPath) {
    // Download from CDN URL
    // Save to local storage
  }

  // Full workflow
  async generateAvatarVideo(script, avatarId, options = {}) {
    const videoId = await this.createVideo(script, avatarId, options);
    
    // Poll for completion (typically 2-5 minutes)
    while (true) {
      const status = await this.getVideoStatus(videoId);
      if (status.status === 'complete') {
        return await this.downloadVideo(videoId, options.outputPath);
      }
      await sleep(10000); // Check every 10 seconds
    }
  }
}
```

### AI Voiceovers (ElevenLabs)

**API**: https://elevenlabs.io/api  
**Documentation**: https://docs.elevenlabs.io/

#### Capabilities

1. **Natural Text-to-Speech**
   - Ultra-realistic voice generation
   - 29+ languages
   - Emotion and tone control
   - Voice cloning (premium)

2. **Use Cases**
   - Video narration
   - Product descriptions
   - Tutorial voiceovers
   - Accessibility (audio descriptions)

3. **Technical Details**
   - API endpoint: `/v1/text-to-speech/{voice_id}`
   - Input: Text (up to 5,000 characters per request)
   - Output: MP3 audio file
   - Cost: **$0.30 per 1,000 characters** (~$0.18 per minute of audio)

#### Implementation Plan

**Service**: `/services/ai/ElevenLabsService.js`

```javascript
class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  // List available voices
  async listVoices() {
    // GET /voices
    // Returns array of voice IDs and samples
  }

  // Generate speech from text
  async textToSpeech(text, voiceId, options = {}) {
    // POST /text-to-speech/{voice_id}
    // Body: { text, model_id, voice_settings }
    // Returns audio stream
  }

  // Save audio to file
  async generateVoiceover(text, voiceId, outputPath, options = {}) {
    const audioStream = await this.textToSpeech(text, voiceId, options);
    // Save to file
    return outputPath;
  }

  // Clone voice (premium)
  async cloneVoice(audioSamples, name) {
    // POST /voices/add
    // Upload audio samples of voice to clone
    // Returns new voice ID
  }
}
```

### Script-to-Video Pipeline

**Complete Automation Workflow**:

1. **Input**: User provides text brief (e.g., "Create a 30-second product video for our new coffee maker")

2. **Script Generation** (Leo Brain + Claude):
   - Analyze brief
   - Generate full video script
   - Break into scenes/segments
   - Suggest visuals for each segment

3. **Asset Selection**:
   - Match script segments to:
     - User's media library
     - Stock footage (Pexels/Unsplash API)
     - Product images/videos
   - Intelligent selection based on context

4. **Voiceover Generation** (ElevenLabs):
   - Convert script to natural speech
   - Select appropriate voice
   - Generate audio track

5. **Video Assembly** (FFmpeg):
   - Combine visual assets
   - Sync with voiceover
   - Add transitions
   - Apply template styling

6. **Caption Addition** (Whisper):
   - Generate captions from voiceover
   - Burn into video

7. **Platform Optimization**:
   - Adapt for target platform
   - Apply platform-specific best practices

#### Implementation Plan

**Service**: `/services/ai/ScriptToVideoService.js`

```javascript
class ScriptToVideoService {
  constructor() {
    this.brain = getCentralBrain();
    this.avatarService = new AvatarService();
    this.voiceService = new ElevenLabsService();
    this.videoService = getVideoService();
    this.captionService = getCaptionService();
  }

  // Full pipeline
  async generateVideo(brief, options = {}) {
    // 1. Generate script
    const script = await this.generateScript(brief);
    
    // 2. Select assets
    const assets = await this.selectAssets(script, options);
    
    // 3. Generate voiceover or avatar video
    let audioTrack;
    if (options.useAvatar) {
      // Generate avatar video (includes voice)
      return await this.avatarService.generateAvatarVideo(
        script.text, 
        options.avatarId
      );
    } else {
      // Generate voiceover only
      audioTrack = await this.voiceService.generateVoiceover(
        script.text,
        options.voiceId
      );
    }
    
    // 4. Assemble video
    const videoPath = await this.assembleVideo(assets, audioTrack);
    
    // 5. Add captions
    const finalVideo = await this.captionService.addCaptionsToVideo(videoPath);
    
    // 6. Optimize for platform
    if (options.platform) {
      return await this.videoService.adaptForPlatform(
        finalVideo, 
        options.platform
      );
    }
    
    return finalVideo;
  }

  async generateScript(brief) {
    // Use Leo Brain + Claude to generate script
    // Parse into scenes with timestamps and visuals
  }

  async selectAssets(script, options) {
    // Search user's library
    // Search stock footage APIs
    // Match to script segments
  }

  async assembleVideo(assets, audioTrack) {
    // Combine assets with FFmpeg
    // Sync to audio timing
    // Add transitions
  }
}
```

### Stock Media Integration

**Pexels API** (Free):
- https://www.pexels.com/api/
- Free high-quality stock videos and images
- Rate limit: 200 requests/hour
- No cost

**Unsplash API** (Free):
- https://unsplash.com/developers
- Free high-quality stock images
- Rate limit: 50 requests/hour
- No cost

### Enterprise Tier Cost Analysis

**AI Avatars** (per user/month):
- Average usage: 20 videos @ 1 minute each = 20 minutes
- At $1.50/minute: **$30/month**
- Actual average (lighter usage): **$20-25/month**

**Voiceovers** (per user/month):
- Average usage: 50 videos @ 30 seconds each = 25 minutes
- Text: ~4,000 characters per minute × 25 = 100,000 chars
- At $0.30/1,000 chars: **$30/month**
- Actual average (some use avatars): **$10-15/month**

**Runway ML** (per user/month):
- Similar to Pro tier: **$10-15/month**

**Compute & Storage**:
- Additional processing: **$10-15/month**

**Total AI Cost (Enterprise Tier)**: ~$50-70/user/month  
**Revenue**: $150/month  
**Margin**: **$80-100/user/month**

### Success Metrics
- Script-to-video generation time < 10 minutes
- Avatar video quality rated > 4/5 stars
- Voiceover naturalness > 90%
- Complete automation rate > 80%

---

## Implementation Timeline

### Phase B (Pro Features)
**Estimated Duration**: 2-3 weeks
**Complexity**: Medium

1. **Week 1**: Runway ML integration
   - API authentication
   - Background removal
   - Object inpainting
   - Testing and optimization

2. **Week 2**: Advanced auto-clip
   - ML model training setup
   - Engagement data integration
   - Prediction algorithm
   - Testing

3. **Week 3**: Integration & UI
   - Add to existing video routes
   - User interface for AI features
   - Usage tracking and limits
   - Documentation

### Phase C (Enterprise Features)
**Estimated Duration**: 3-4 weeks
**Complexity**: High

1. **Week 1**: Avatar & Voice services
   - Synthesia integration
   - ElevenLabs integration
   - Voice/avatar selection UI
   - Testing

2. **Week 2**: Script generation
   - Leo Brain script generation
   - Scene parsing
   - Asset matching algorithm

3. **Week 3**: Video assembly pipeline
   - Asset combination
   - Audio sync
   - Transition generation
   - Template application

4. **Week 4**: Testing & optimization
   - End-to-end testing
   - Performance optimization
   - Quality assurance
   - Documentation

---

## Stub Services (To Be Implemented)

Create placeholder services with documented interfaces:

### /services/ai/RunwayService.js
```javascript
/**
 * RunwayService - Runway ML API Integration
 * 
 * Provides AI video editing capabilities:
 * - Background removal
 * - Object inpainting
 * - Style transfer
 * - Motion tracking
 * 
 * API: https://api.runwayml.com/v1
 * Docs: https://docs.runwayml.com/
 */
class RunwayService {
  constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY;
    this.baseUrl = 'https://api.runwayml.com/v1';
  }

  async removeBackground(videoPath, options = {}) {
    throw new Error('Premium feature - not implemented (Phase B)');
  }

  async removeObject(videoPath, maskData, options = {}) {
    throw new Error('Premium feature - not implemented (Phase B)');
  }

  async applyStyle(videoPath, style, options = {}) {
    throw new Error('Premium feature - not implemented (Phase B)');
  }

  async trackMotion(videoPath, trackingData, options = {}) {
    throw new Error('Premium feature - not implemented (Phase B)');
  }
}
```

### /services/ai/ElevenLabsService.js
```javascript
/**
 * ElevenLabsService - ElevenLabs API Integration
 * 
 * Provides AI voice generation:
 * - Text-to-speech
 * - Voice cloning
 * - Emotion control
 * 
 * API: https://api.elevenlabs.io/v1
 * Docs: https://docs.elevenlabs.io/
 */
class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  async listVoices() {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async textToSpeech(text, voiceId, options = {}) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async generateVoiceover(text, voiceId, outputPath, options = {}) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async cloneVoice(audioSamples, name) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }
}
```

### /services/ai/AvatarService.js
```javascript
/**
 * AvatarService - Synthesia/HeyGen API Integration
 * 
 * Provides AI avatar video generation:
 * - Talking head videos from script
 * - Multiple avatars and languages
 * - Custom avatar creation
 * 
 * API: https://api.synthesia.io/v2
 * Docs: https://docs.synthesia.io/
 */
class AvatarService {
  constructor() {
    this.apiKey = process.env.SYNTHESIA_API_KEY;
    this.baseUrl = 'https://api.synthesia.io/v2';
  }

  async listAvatars() {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async createVideo(script, avatarId, options = {}) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async getVideoStatus(videoId) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async downloadVideo(videoId, outputPath) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async generateAvatarVideo(script, avatarId, options = {}) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }
}
```

### /services/ai/ScriptToVideoService.js
```javascript
/**
 * ScriptToVideoService - Complete Script-to-Video Pipeline
 * 
 * Orchestrates full video generation:
 * - Script generation from brief
 * - Asset selection (library + stock)
 * - Voiceover or avatar generation
 * - Video assembly
 * - Caption addition
 * - Platform optimization
 */
class ScriptToVideoService {
  constructor() {
    // Service dependencies loaded lazily
  }

  async generateVideo(brief, options = {}) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async generateScript(brief) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async selectAssets(script, options) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }

  async assembleVideo(assets, audioTrack) {
    throw new Error('Enterprise feature - not implemented (Phase C)');
  }
}
```

---

## Environment Variables

### Phase A (Already Configured)
```env
# OpenAI (for Whisper)
OPENAI_API_KEY=sk-...

# FFmpeg paths
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

### Phase B (Pro Tier)
```env
# Runway ML
RUNWAY_API_KEY=your_runway_api_key
```

### Phase C (Enterprise Tier)
```env
# Synthesia (AI Avatars)
SYNTHESIA_API_KEY=your_synthesia_api_key

# ElevenLabs (AI Voice)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional: HeyGen (Alternative to Synthesia)
# HEYGEN_API_KEY=your_heygen_api_key

# Stock Media APIs (Free)
# PEXELS_API_KEY=your_pexels_api_key
# UNSPLASH_ACCESS_KEY=your_unsplash_key
```

---

## Risk Analysis

### Technical Risks

1. **API Reliability**
   - Mitigation: Implement retry logic, fallback providers
   - Status check endpoints for user visibility

2. **Processing Time**
   - AI generation can take several minutes
   - Mitigation: Async job queue, progress tracking, user notifications

3. **Quality Consistency**
   - AI outputs may vary in quality
   - Mitigation: Quality checks, user review before publishing

### Business Risks

1. **Cost Overruns**
   - Users may exceed expected usage
   - Mitigation: Hard limits per tier, usage monitoring, alerts

2. **Pricing Changes**
   - AI API providers may increase prices
   - Mitigation: Build buffer into margins, annual contracts when possible

3. **Competition**
   - Other platforms may offer similar features
   - Mitigation: Focus on integration with existing Leo ecosystem

---

## Success Metrics (KPIs)

### User Adoption
- % of Pro users using AI editing features: Target > 60%
- % of Enterprise users using script-to-video: Target > 40%
- Average AI features used per user/month: Target > 5

### Technical Performance
- Video processing success rate: Target > 99%
- Average generation time: Target < 5 minutes
- User satisfaction rating: Target > 4.5/5

### Financial
- Gross margin (Pro tier): Target > 70%
- Gross margin (Enterprise tier): Target > 60%
- Churn rate: Target < 5%/month

---

## Competitive Analysis

### Competitors

1. **Descript**
   - AI video editing, transcription, voice cloning
   - Pricing: $24-50/month
   - Strength: Excellent editor UI
   - Weakness: No marketing automation integration

2. **Runway ML**
   - Direct AI video generation platform
   - Pricing: $15-95/month
   - Strength: Cutting-edge AI models
   - Weakness: Steeper learning curve, no marketing features

3. **Synthesia**
   - Avatar video generation
   - Pricing: $30-90/month
   - Strength: Professional avatars
   - Weakness: Limited editing, no marketing automation

### Leo's Competitive Advantage

1. **Integration**: Seamlessly integrated with marketing automation
2. **Intelligence**: Leo Brain provides context-aware generation
3. **Full Stack**: End-to-end from generation to publishing
4. **Personalization**: Uses business data for relevant content

---

## Conclusion

The Video AI roadmap provides a clear path from foundational video processing (Phase A - complete) to advanced AI editing (Phase B - Pro tier) and full automation (Phase C - Enterprise tier).

**Key Takeaways**:
- Phase A foundations are solid and cost-effective
- Phase B adds meaningful AI editing with healthy margins
- Phase C enables true automation with premium pricing
- All tiers maintain positive unit economics
- Implementation is incremental and low-risk

**Next Steps**:
1. Monitor Phase A adoption and usage patterns
2. Gather user feedback on desired AI features
3. Evaluate API partnerships (Runway, Synthesia, ElevenLabs)
4. Begin Phase B development when user demand warrants

---

*Document maintained by Leo Marketing Team*  
*Last updated: 2026-02-07*
