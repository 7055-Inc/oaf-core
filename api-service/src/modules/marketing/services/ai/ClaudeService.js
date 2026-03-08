/**
 * ClaudeService - Anthropic Claude API Integration for Creative Content Generation
 * 
 * Claude handles the CREATIVE side of the Leo + Claude partnership:
 * - Leo (Llama/local): Knows the business data, orchestrates, schedules
 * - Claude (Anthropic API): Generates creative content - copy, captions, strategies
 * 
 * This service wraps the Anthropic SDK and provides marketing-specific methods.
 */

const Anthropic = require('@anthropic-ai/sdk');

// Singleton instance
let instance = null;

class ClaudeService {
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes('your-key-here')) {
      console.warn('[ClaudeService] ANTHROPIC_API_KEY not configured - AI generation will be unavailable');
      this.client = null;
    } else {
      this.client = new Anthropic({ apiKey });
    }
    this.model = 'claude-sonnet-4-20250514';
    this.maxRetries = 2;
  }

  /**
   * Check if Claude is available
   */
  isAvailable() {
    return !!this.client;
  }

  /**
   * Send a message to Claude with retry logic
   * @param {string} systemPrompt - System instructions
   * @param {string} userMessage - User message / prompt
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Claude's response text
   */
  async _sendMessage(systemPrompt, userMessage, options = {}) {
    if (!this.client) {
      throw new Error('Claude API not configured. Add ANTHROPIC_API_KEY to .env');
    }

    const {
      maxTokens = 2000,
      temperature = 0.7,
    } = options;

    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        return response.content[0]?.text || '';
      } catch (error) {
        lastError = error;
        if (error.status === 429 || error.status >= 500) {
          // Rate limit or server error — wait and retry
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error; // Don't retry client errors
      }
    }
    throw lastError;
  }

  /**
   * Generate a social media caption for given content/media
   * 
   * @param {Object} params
   * @param {string} params.platform - Target platform (instagram, facebook, twitter, tiktok, pinterest)
   * @param {string} params.mediaDescription - Description of the image/video
   * @param {Object} params.brandContext - User/brand info (name, style, audience)
   * @param {string} [params.tone] - Desired tone (professional, casual, playful, bold)
   * @param {string} [params.goal] - Post goal (engagement, traffic, awareness, sales)
   * @param {string} [params.additionalNotes] - Any extra instructions from user
   * @returns {Promise<Object>} { caption, hashtags, callToAction }
   */
  async generateCaption(params) {
    const { platform, mediaDescription, brandContext = {}, tone = 'engaging', goal = 'engagement', additionalNotes = '' } = params;

    const platformLimits = {
      twitter: { charLimit: 280, hashtagCount: '2-3', notes: 'Keep it concise. No more than 280 characters total including hashtags.' },
      instagram: { charLimit: 2200, hashtagCount: '10-15', notes: 'Can be longer. Hashtags at the end or in first comment.' },
      facebook: { charLimit: 2000, hashtagCount: '3-5', notes: 'Conversational tone works best. Minimal hashtags.' },
      tiktok: { charLimit: 2200, hashtagCount: '4-6', notes: 'Trendy, casual. Use trending hashtags when relevant.' },
      pinterest: { charLimit: 500, hashtagCount: '5-10', notes: 'Descriptive and searchable. Include keywords naturally.' },
    };

    const platformInfo = platformLimits[platform] || platformLimits.instagram;

    const systemPrompt = `You are a social media marketing expert within the Leo AI Marketing System.
You have access to deep brand intelligence gathered by Leo's pattern recognition engine.
Use the artist's visual identity, catalog, and discovered truths to write highly personalized captions.

QUALITY RULES:
- NEVER use generic filler ("Don't miss out", "Exciting news", "Link in bio", "Stay tuned", "We're thrilled", "Something special").
- The caption MUST reference a specific brand detail — product name, color, technique, material, or price point.
- Write as the artist/creator would speak — authentic and human, not like a marketing template.
- Hashtags must be niche and specific, not just #art #beautiful #love.

Always respond in valid JSON format with exactly these keys: "caption", "hashtags" (array of strings without #), "callToAction" (short CTA string or empty).
Do not wrap in markdown code blocks. Return only the JSON object.`;

    // Build rich brand context for captions too
    let brandInfo = `BRAND CONTEXT:
- Name: ${brandContext.name || 'Not specified'}
- Style: ${brandContext.style || 'Not specified'}  
- Target Audience: ${brandContext.audience || 'General'}
- Industry: ${brandContext.industry || 'Not specified'}`;

    if (brandContext.bio) brandInfo += `\n- Bio: ${brandContext.bio}`;
    if (brandContext.dominantColors && brandContext.dominantColors !== 'Not yet analyzed') {
      brandInfo += `\n- Visual Identity: Dominant colors are ${brandContext.dominantColors}`;
      if (brandContext.styleTendencies?.length > 0) {
        brandInfo += `, style leans ${brandContext.styleTendencies.slice(0, 2).map(s => s.style).join(' and ')}`;
      }
    }
    if (brandContext.catalogHighlights) brandInfo += `\n- Catalog: ${brandContext.catalogHighlights}`;
    if (brandContext.brandTruths?.length > 0) {
      brandInfo += `\n- Leo Insights: ${brandContext.brandTruths.slice(0, 3).map(t => t.insight).join('; ')}`;
    }

    const userMessage = `Generate a ${platform} post caption.

${brandInfo}

MEDIA BEING POSTED:
${mediaDescription || 'No specific media description provided'}

POST REQUIREMENTS:
- Platform: ${platform}
- Character limit: ${platformInfo.charLimit}
- Tone: ${tone}
- Goal: ${goal}
- Hashtag count: ${platformInfo.hashtagCount}
- Platform notes: ${platformInfo.notes}
${additionalNotes ? `- Additional instructions: ${additionalNotes}` : ''}

Respond with JSON only.`;

    const response = await this._sendMessage(systemPrompt, userMessage, { temperature: 0.8 });

    try {
      // Strip any markdown code blocks if Claude wraps it
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      // Fallback: return raw text as caption
      return { caption: response.trim(), hashtags: [], callToAction: '' };
    }
  }

  /**
   * Generate multiple post concepts for a campaign
   * 
   * @param {Object} params
   * @param {string} params.campaignName - Campaign name
   * @param {string} params.campaignGoal - What the campaign should achieve
   * @param {string[]} params.platforms - Target platforms
   * @param {string} params.startDate - Campaign start
   * @param {string} params.endDate - Campaign end
   * @param {Object} params.brandContext - User/brand info
   * @param {string[]} [params.availableMediaDescriptions] - Descriptions of available media assets
   * @param {Object} [params.pastMetrics] - Past performance data for optimization
   * @param {number} [params.postCount] - How many posts to generate
   * @returns {Promise<Object[]>} Array of post concepts
   */
  async generateCampaignPosts(params) {
    const {
      campaignName,
      campaignGoal,
      platforms,
      startDate,
      endDate,
      brandContext = {},
      availableMediaDescriptions = [],
      pastMetrics = null,
      postCount = 5,
      crmEmailEnabled = false,
      dripEnabled = false,
      dripContext = null,
      collectionEnabled = false,
      collectionContext = null,
    } = params;

    const emailInstructions = crmEmailEnabled ? `

IMPORTANT — EMAIL CONTENT: The user has connected their CRM email system. In addition to social posts, generate 1–2 email marketing pieces as part of the campaign.
For email posts, set "platform" to "email" and "type" to one of: "newsletter", "announcement", "promotion", "event-invitation", "product-showcase".
Email post objects should include these ADDITIONAL fields:
- "subjectLine" (compelling email subject, max 60 chars)
- "previewText" (email preview snippet, max 120 chars)
- "emailBody" (the email content in plain text, 2–4 paragraphs)
- "ctaButtonText" (call-to-action button label, e.g. "Shop Now", "Learn More")
- "ctaButtonUrl" (placeholder URL like "{{product_url}}" or "{{store_url}}")
Email posts should complement and reinforce the social posts — coordinated messaging across channels.` : '';

    const dripInstructions = dripEnabled && dripContext ? `

DRIP CAMPAIGN INTEGRATION: The organization has active automated drip email sequences. Social posts should COMPLEMENT — not duplicate — these drip campaigns.
Active drip campaigns: ${dripContext.summary}
When generating social posts, consider:
- Reinforce messaging from active drip sequences (e.g., if a welcome series is running, social posts can echo that welcoming tone)
- Time social posts to land between drip emails for coordinated multi-touch exposure
- Reference the same offers/themes the drip sequences cover so the audience sees consistent messaging
- For each post, add a "dripAlignment" field (string) explaining which drip campaign it aligns with (or "none" if independent)` : '';

    const collectionInstructions = collectionEnabled && collectionContext ? `

PRODUCT COLLECTION DATA: The campaign should leverage the organization's product catalog and collections for specific, product-aware content.
Collections: ${collectionContext.summary}
${collectionContext.featuredProducts?.length > 0 ? `Featured products: ${collectionContext.featuredProducts.slice(0, 8).map(p => `"${p.name}" ($${p.price}, ${p.collection})`).join('; ')}` : ''}
When generating posts:
- Reference SPECIFIC products by name and price where relevant
- Organize showcase posts around collections/categories
- Include product-specific CTAs ("Shop ${collectionContext.collections?.[0]?.name || 'the collection'}")
- For product-focused posts, add a "featuredProductName" field (string) with the product name being highlighted` : '';

    // --- Brand voice injection (if configured) ---
    let brandVoiceRules = '';
    if (brandContext.brandVoice) {
      const bv = brandContext.brandVoice;
      const voiceParts = [];
      if (bv.voice_tone) voiceParts.push(`TONE: Write in a ${bv.voice_tone} voice.`);
      if (bv.writing_style) voiceParts.push(`STYLE: ${bv.writing_style}.`);
      if (bv.brand_personality) voiceParts.push(`PERSONALITY: ${bv.brand_personality}`);
      if (bv.emoji_usage) voiceParts.push(`EMOJI: Use emojis ${bv.emoji_usage === 'none' ? 'never' : bv.emoji_usage + 'ly'}.`);
      if (bv.banned_phrases?.length > 0) voiceParts.push(`NEVER use these phrases: "${bv.banned_phrases.join('", "')}".`);
      if (bv.example_posts?.length > 0) {
        voiceParts.push(`Here are example posts the brand likes (match this voice):`);
        bv.example_posts.slice(0, 3).forEach((ex, i) => voiceParts.push(`  Example ${i + 1}: "${ex}"`));
      }
      brandVoiceRules = `\n\nBRAND VOICE CONFIGURATION:\n${voiceParts.join('\n')}`;
    }

    const systemPrompt = `You are a social media marketing strategist and content creator working within the Leo AI Marketing System.
You have access to deep intelligence about this artist/brand gathered by Leo's pattern recognition engine.
Use ALL the contextual data provided to create highly personalized, on-brand content.
If Leo has identified color palettes, style tendencies, or discovered truths about the brand, weave those into your creative decisions.

CRITICAL QUALITY RULES:
1. NEVER use generic marketing filler. Banned phrases include: "Don't miss out", "Exciting news", "Link in bio", "Stay tuned", "We're thrilled", "Something special", "You won't want to miss", "Check it out", "Big announcement", "Game changer", "Level up", "Drop everything". If you catch yourself writing something a generic marketing bot would write, rewrite it.
2. Each post MUST reference a specific detail from the brand context — a product name, a color from their palette, a technique, a material, a price point. No post should be possible to copy-paste for a different brand.
3. Captions should feel like they were written by the artist/creator themselves — authentic, specific, human. NOT like a marketing agency template.
4. Vary sentence structure and opening across ALL posts. No two posts should start the same way. Avoid starting with emojis. Mix short punchy lines with longer flowing sentences.
5. Hashtags must include niche/specific tags (not just #art #love #beautiful). Include technique, material, or style-specific hashtags.
6. "suggestedMediaDescription" must describe a SPECIFIC image/video from the available media library (if provided), referencing its visual qualities. Do NOT invent hypothetical media — match to what exists.
7. "visualDirection" should give concrete art direction — specific colors, composition style, overlay text, mood. Not vague like "eye-catching" or "vibrant".
${brandVoiceRules}

Always respond in valid JSON format. Do not wrap in markdown code blocks.
The response should be a JSON object with a "posts" array.
Each post object should have: "title" (short internal name), "platform", "type" (post/story/reel/video), "caption", "hashtags" (array without #), "callToAction", "suggestedMediaDescription" (what image/video to use — reference specific products or visual style when possible), "suggestedDay" (day number from campaign start, 1-indexed), "suggestedTime" (HH:MM in 24h format), "rationale" (brief explanation of why this post and timing), "visualDirection" (brief art direction note for graphics/media creation referencing the brand's visual identity).${emailInstructions}${dripInstructions}${collectionInstructions}`;

    // Build the rich brand context section
    let brandSection = `BRAND IDENTITY:
- Name: ${brandContext.name || 'Not specified'}
- Style: ${brandContext.style || 'Not specified'}
- Audience: ${brandContext.audience || 'General'}
- Industry: ${brandContext.industry || 'Not specified'}`;

    if (brandContext.bio) brandSection += `\n- Bio: ${brandContext.bio}`;
    if (brandContext.tagline) brandSection += `\n- Tagline: ${brandContext.tagline}`;
    if (brandContext.specialty) brandSection += `\n- Specialty: ${brandContext.specialty}`;

    // Visual identity from Leo
    let visualSection = '';
    if (brandContext.dominantColors && brandContext.dominantColors !== 'Not yet analyzed') {
      visualSection += `\nVISUAL IDENTITY (learned by Leo AI from pattern analysis):`;
      visualSection += `\n- Dominant Colors: ${brandContext.dominantColors}`;
      if (brandContext.colorPalette?.length > 0) {
        visualSection += `\n- Full Color Palette: ${brandContext.colorPalette.map(c => `${c.color} (${c.strength}%)`).join(', ')}`;
      }
      if (brandContext.styleTendencies?.length > 0) {
        visualSection += `\n- Style Tendencies: ${brandContext.styleTendencies.map(s => `${s.style} (${s.strength}%)`).join(', ')}`;
      }
      if (brandContext.mediumPreferences?.length > 0) {
        visualSection += `\n- Medium Preferences: ${brandContext.mediumPreferences.map(m => `${m.medium} (${m.strength}%)`).join(', ')}`;
      }
    }

    // Catalog intelligence
    let catalogSection = '';
    if (brandContext.catalogHighlights) {
      catalogSection += `\nPRODUCT CATALOG:`;
      catalogSection += `\n- ${brandContext.catalogHighlights}`;
      if (brandContext.topProducts?.length > 0) {
        catalogSection += `\n- Featured Products:`;
        brandContext.topProducts.slice(0, 6).forEach((p, i) => {
          catalogSection += `\n  ${i + 1}. "${p.name}" — $${p.price}${p.category ? ` (${p.category})` : ''}${p.description ? ` — ${p.description}` : ''}`;
        });
      }
    }

    // Discovered truths from Leo
    let truthsSection = '';
    if (brandContext.brandTruths?.length > 0) {
      truthsSection += `\nLEO AI DISCOVERED INSIGHTS (patterns learned from data analysis):`;
      brandContext.brandTruths.forEach((t, i) => {
        truthsSection += `\n  ${i + 1}. ${t.insight} (confidence: ${Math.round(t.confidence * 100)}%)`;
      });
    }
    if (brandContext.temporalPatterns?.length > 0) {
      truthsSection += `\nTIMING PATTERNS:`;
      brandContext.temporalPatterns.forEach(t => {
        truthsSection += `\n  - ${t.insight}`;
      });
    }

    // Engagement intelligence
    let engagementSection = '';
    if (brandContext.engagementScore || brandContext.peakActivityHour) {
      engagementSection += `\nENGAGEMENT INTELLIGENCE:`;
      if (brandContext.engagementScore) engagementSection += `\n- Engagement Score: ${brandContext.engagementScore}`;
      if (brandContext.peakActivityHour) engagementSection += `\n- Peak Activity Hour: ${brandContext.peakActivityHour}:00`;
      if (brandContext.peakActivityDay) engagementSection += `\n- Peak Activity Day: ${brandContext.peakActivityDay}`;
      if (brandContext.topViewedCategories?.length > 0) engagementSection += `\n- Top Viewed Categories: ${brandContext.topViewedCategories.join(', ')}`;
    }

    const platformsList = crmEmailEnabled && !platforms.includes('email') ? [...platforms, 'email'] : platforms;

    // Build enabled-systems summary
    const enabledSystems = [];
    if (crmEmailEnabled) enabledSystems.push('CRM email marketing');
    if (dripEnabled && dripContext) enabledSystems.push(`drip campaigns (${dripContext.totalActiveCampaigns} active sequences)`);
    if (collectionEnabled && collectionContext) enabledSystems.push(`product collections (${collectionContext.totalCollections || collectionContext.collections?.length || 0} collections, ${collectionContext.totalFeaturedProducts || 0} featured products)`);
    const channelLabel = enabledSystems.length > 0 ? 'integrated multi-channel marketing' : (crmEmailEnabled ? 'multi-channel marketing' : 'social media');

    // Drip campaign context section
    let dripSection = '';
    if (dripEnabled && dripContext?.activeCampaigns?.length > 0) {
      dripSection += `\nACTIVE DRIP CAMPAIGNS (coordinate social posts with these email sequences):`;
      dripContext.activeCampaigns.forEach((c, i) => {
        dripSection += `\n  ${i + 1}. "${c.name}" — ${c.category || 'general'}, ${c.steps} email steps, ${c.enrolled} currently enrolled${c.description ? ` — ${c.description}` : ''}`;
      });
    }

    // Collection context section
    let collectionSection = '';
    if (collectionEnabled && collectionContext) {
      collectionSection += `\nPRODUCT COLLECTIONS (use for product-focused posts):`;
      (collectionContext.collections || []).forEach((c, i) => {
        collectionSection += `\n  ${i + 1}. "${c.name}" — ${c.productCount} products${c.description ? ` — ${c.description}` : ''}`;
      });
      if (collectionContext.featuredProducts?.length > 0) {
        collectionSection += `\nFEATURED PRODUCTS:`;
        collectionContext.featuredProducts.slice(0, 10).forEach((p, i) => {
          collectionSection += `\n  ${i + 1}. "${p.name}" — $${p.price} (${p.collection})${p.description ? ` — ${p.description}` : ''}`;
        });
      }
    }

    const userMessage = `Create a ${channelLabel} campaign content plan.

CAMPAIGN:
- Name: ${campaignName}
- Goal: ${campaignGoal}
- Platforms: ${platformsList.join(', ')}${crmEmailEnabled ? ' (email = CRM email marketing system)' : ''}
- Duration: ${startDate} to ${endDate}
- Number of posts to create: ${postCount}${crmEmailEnabled ? ' (include 1-2 email pieces in addition to social posts)' : ''}
${enabledSystems.length > 0 ? `- Integrated Systems: ${enabledSystems.join(', ')}` : ''}

${brandSection}
${visualSection}
${catalogSection}
${dripSection}
${collectionSection}
${truthsSection}
${engagementSection}

AVAILABLE MEDIA LIBRARY (these are REAL images/videos the user has — reference them by description in your suggestedMediaDescription):
${availableMediaDescriptions.length > 0 ? availableMediaDescriptions.map((d, i) => `${i + 1}. ${d}`).join('\n') : 'No pre-analyzed media available. Suggest what types of media would work best for each post, referencing their visual identity and product catalog.'}
${availableMediaDescriptions.length > 0 ? '\nIMPORTANT: Your "suggestedMediaDescription" for each post MUST describe one of the above images specifically (by style, colors, mood, or subject). Each post should reference a DIFFERENT image. Do NOT invent hypothetical media.' : ''}

${pastMetrics ? `PAST PERFORMANCE DATA (use to optimize timing and content type):
- Best performing day(s): ${pastMetrics.bestDays || 'Unknown'}
- Best performing time(s): ${pastMetrics.bestTimes || 'Unknown'}
- Top content types: ${pastMetrics.topTypes || 'Unknown'}
- Average engagement rate: ${pastMetrics.avgEngagement || 'Unknown'}
` : ''}

DATA RICHNESS: ${brandContext.dataRichness || 0}/100 — ${(brandContext.dataRichness || 0) > 60 ? 'Rich data available. Leverage all insights for highly personalized content.' : (brandContext.dataRichness || 0) > 30 ? 'Moderate data. Use what\'s available, supplement with platform best practices.' : 'Limited data. Use industry best practices with the available brand info.'}

Generate exactly ${postCount} posts distributed across the campaign duration and platforms. Vary content types (post, story, reel, video). Reference specific products and visual style when possible. Optimize timing based on ${pastMetrics ? 'past performance data and ' : ''}${brandContext.peakActivityHour ? 'Leo engagement intelligence and ' : ''}platform best practices.

QUALITY CHECKLIST (review each post before finalizing):
- Does the caption mention a specific product, technique, color, or brand detail? (required)
- Would this caption only make sense for THIS brand? (if not, rewrite)
- Is the opening different from every other post in the campaign? (required)
- Are hashtags niche and specific, not just generic? (required)
- Does the suggestedMediaDescription reference actual available media? (required if media provided)

Respond with JSON only.`;

    const response = await this._sendMessage(systemPrompt, userMessage, {
      maxTokens: 4000,
      temperature: 0.8,
    });

    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed.posts || parsed;
    } catch {
      return [{ title: 'Error parsing AI response', caption: response, platform: platforms[0], type: 'post', hashtags: [], suggestedDay: 1 }];
    }
  }

  /**
   * Revise a post based on user feedback
   * 
   * @param {Object} params
   * @param {Object} params.originalPost - The original post content
   * @param {string} params.feedback - User's revision instructions
   * @param {string} params.platform - Target platform
   * @param {Object} [params.brandContext] - Brand context
   * @returns {Promise<Object>} Revised post { caption, hashtags, callToAction }
   */
  async revisePost(params) {
    const { originalPost, feedback, platform, brandContext = {} } = params;

    const systemPrompt = `You are a social media content editor. Revise the given post based on user feedback.
Maintain the same platform and brand voice. Respond in valid JSON: { "caption", "hashtags" (array without #), "callToAction" }.
Do not wrap in markdown code blocks.`;

    const userMessage = `Revise this ${platform} post based on feedback.

ORIGINAL POST:
Caption: ${originalPost.caption || originalPost.content?.caption || ''}
Hashtags: ${(originalPost.hashtags || originalPost.content?.hashtags || []).join(', ')}

USER FEEDBACK:
${feedback}

BRAND: ${brandContext.name || 'Not specified'} (${brandContext.style || 'general'} style)

Respond with revised JSON only.`;

    const response = await this._sendMessage(systemPrompt, userMessage, { temperature: 0.7 });

    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { caption: response.trim(), hashtags: [], callToAction: '' };
    }
  }

  /**
   * Suggest optimal posting time based on platform and past metrics
   * 
   * @param {Object} params
   * @param {string} params.platform - Target platform
   * @param {Object} [params.pastMetrics] - Historical engagement data
   * @param {string} [params.contentType] - Type of content (post, reel, story)
   * @param {string} [params.timezone] - User's timezone
   * @returns {Promise<Object>} { suggestedTime, suggestedDay, rationale }
   */
  async suggestPostingTime(params) {
    const { platform, pastMetrics = null, contentType = 'post', timezone = 'UTC' } = params;

    const systemPrompt = `You are a social media analytics expert. Suggest the best time to post.
Respond in valid JSON: { "suggestedTime" (HH:MM 24h), "suggestedDay" (day of week), "rationale" (brief explanation) }.
Do not wrap in markdown code blocks.`;

    const userMessage = `Suggest the best time to publish a ${contentType} on ${platform}.

${pastMetrics ? `HISTORICAL DATA:
- Best days: ${pastMetrics.bestDays || 'Unknown'}
- Best times: ${pastMetrics.bestTimes || 'Unknown'}
- Avg engagement by hour: ${JSON.stringify(pastMetrics.engagementByHour || {})}
` : 'No historical data available — use platform best practices.'}

Timezone: ${timezone}

Respond with JSON only.`;

    const response = await this._sendMessage(systemPrompt, userMessage, { temperature: 0.3 });

    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { suggestedTime: '10:00', suggestedDay: 'Tuesday', rationale: 'Default recommendation' };
    }
  }

  /**
   * Generate a full blog article in Editor.js JSON block format
   * 
   * @param {Object} params
   * @param {string} params.magazine - Target magazine (artist-news, promoter-news, community-news)
   * @param {string} params.topic - Article topic
   * @param {string} params.contentType - Content type (how-to, faq, listicle, pillar, news, spotlight, comparison, roundup)
   * @param {string} [params.angle] - Specific angle or hook
   * @param {Object} [params.context] - Platform context (recent articles, products, events)
   * @param {Array} [params.linkableEntities] - Entities to link to: [{ name, url, type }]
   * @param {string} [params.tone] - Desired tone
   * @param {number} [params.targetWordCount] - Target word count
   * @param {string[]} [params.existingTitles] - Recent titles for dedup
   * @returns {Promise<Object>} { title, slug, content, excerpt, seoTitle, seoDescription, focusKeyword, suggestedTags, faqPairs, howToSteps }
   */
  async generateBlogArticle(params) {
    const {
      magazine,
      topic,
      contentType = 'how-to',
      angle = '',
      context = {},
      linkableEntities = [],
      tone = 'informative and engaging',
      targetWordCount = 1000,
      existingTitles = [],
    } = params;

    const magazineAudience = {
      'artist-news': 'artists, makers, and creators who sell at art shows, craft fairs, and online. They care about growing their art business, selling more work, and presenting professionally.',
      'promoter-news': 'event organizers and promoters who manage art shows, craft fairs, and festivals. They care about event logistics, vendor recruitment, marketing, and revenue.',
      'community-news': 'art enthusiasts, collectors, and community members who attend events and buy art. They care about discovering art, finding events, collecting tips, and trends.',
    };

    const contentTypeInstructions = {
      'how-to': `Write a step-by-step guide. Use numbered steps as separate header+paragraph block pairs. Structure: Plan > Setup > Execute > Validate. Each step should be actionable and specific. Return a "howToSteps" array in your JSON with [{name, text}] for each major step.`,
      'faq': `Write a FAQ article. Use H3 headers for each question and a concise paragraph (2-4 sentences) for each answer. Do NOT write essay-length answers. Return a "faqPairs" array in your JSON with [{question, answer}] for each Q&A pair.`,
      'listicle': `Write a numbered list article ("Top N" or "Best X for Y"). Each item gets an H3 header and a paragraph explaining why it belongs. Weave in product/entity links where relevant.`,
      'pillar': `Write comprehensive, authoritative content (${Math.max(targetWordCount, 2000)}+ words). Include a table of contents at the start. Cover the topic thoroughly with H2 sections and H3 subsections. This is cornerstone content other articles will link to.`,
      'news': `Write a timely, newsworthy article about current trends or developments. Lead with the most important information. Include context about why this matters now and what it means for the audience.`,
      'spotlight': `Write a profile/spotlight piece about an artist, maker, or promoter. Focus on their unique story, process, and what makes their work distinctive. Use quotes and specific details. Frame it as inspiration for the audience.`,
      'comparison': `Write a balanced comparison article ("X vs Y" or "Which is right for you?"). Use a structured format with clear criteria, pros/cons, and a recommendation. Include a summary table if appropriate.`,
      'roundup': `Write a curated collection or roundup. Each item gets a brief description and why it's included. Link to specific products, events, or profiles on the platform. Good for seasonal or thematic collections.`,
    };

    const linkEntitiesSection = linkableEntities.length > 0
      ? `\nLINKABLE ENTITIES (weave 3-8 of these as natural inline hyperlinks within paragraph text blocks — use <a href="URL">Name</a> format inside paragraph text):
${linkableEntities.map((e, i) => `  ${i + 1}. ${e.name} (${e.type}) — ${e.url}`).join('\n')}`
      : '';

    const existingArticlesSection = context.recentArticles?.length > 0
      ? `\nEXISTING ARTICLES (avoid overlapping these topics/angles — find a fresh take):
${context.recentArticles.map((a, i) => `  ${i + 1}. "${a}"`).join('\n')}`
      : '';

    const productContext = context.products?.length > 0
      ? `\nPLATFORM PRODUCTS (reference these naturally when relevant):
${context.products.map((p, i) => `  ${i + 1}. "${p.name}" — $${p.price || 'N/A'}${p.category ? ` (${p.category})` : ''}`).join('\n')}`
      : '';

    const eventContext = context.events?.length > 0
      ? `\nUPCOMING EVENTS (mention if timely and relevant):
${context.events.map((e, i) => `  ${i + 1}. "${e.name}"${e.date ? ` — ${e.date}` : ''}${e.location ? ` in ${e.location}` : ''}`).join('\n')}`
      : '';

    const systemPrompt = `You are an expert blog writer for Brakebee, a platform connecting artists, event promoters, and art enthusiasts. You write for the ${magazine} magazine section.

TARGET AUDIENCE: ${magazineAudience[magazine] || magazineAudience['community-news']}

CONTENT TYPE: ${contentType}
${contentTypeInstructions[contentType] || contentTypeInstructions['how-to']}

RESEARCH & EXPERTISE:
You are expected to supplement the platform data provided with your own expert knowledge. For every article:
- Cite specific statistics, percentages, or dollar figures where they strengthen the point (e.g. "artists who display at 10+ shows per year report 40% higher annual revenue").
- Reference well-known industry practices, frameworks, or methodologies by name.
- Include expert tips that go beyond surface-level advice — the kind of insight that comes from years of experience in the field.
- For how-to and pillar content, include common mistakes or pitfalls that beginners make.
- For news and trends content, reference broader industry movements and explain their significance.
- When you know relevant data points from your training (survey results, market trends, pricing benchmarks), include them naturally. If citing a specific study or source, mention it by name.
Do NOT fabricate specific statistics you're uncertain about — use ranges or qualifiers ("studies suggest", "typically between X and Y") when exact figures aren't clear.

WRITING RULES:
1. Start with a direct answer block (50-80 words) that immediately addresses the topic. AI answer engines prioritize content that leads with the answer.
2. Use clear H2/H3 heading hierarchy. Each section should be independently useful.
3. Write in a ${tone} tone. Be specific — use real numbers, concrete examples, and actionable advice.
4. NEVER use generic filler ("In today's world", "It's no secret that", "In this article we'll explore"). Get to the point.
5. Target approximately ${targetWordCount} words (${contentType === 'pillar' ? 'minimum 2000' : 'minimum 800'}).
6. Internal links must feel natural — don't force them. Only link entities that are genuinely relevant to the sentence.

OUTPUT FORMAT:
Return valid JSON with these exact keys:
- "title": Compelling, SEO-friendly article title (max 70 chars)
- "slug": URL-friendly slug derived from title (lowercase, hyphens, max 100 chars)
- "content": Editor.js JSON block format — an object with a "blocks" array. Each block has "type" and "data". Supported types: "header" (data: {text, level: 2|3|4}), "paragraph" (data: {text}), "list" (data: {style: "ordered"|"unordered", items: [...]}), "delimiter" (data: {}), "quote" (data: {text, caption}), "warning" (data: {title, message}), "table" (data: {content: [[...], ...]}). Paragraph text may contain inline HTML: <b>, <i>, <a href="...">, <mark>.
- "excerpt": 150-160 character summary for article cards
- "seoTitle": 50-60 character title tag (may differ from article title)
- "seoDescription": 150-160 character meta description with focus keyword
- "focusKeyword": Primary SEO keyword phrase (2-4 words)
- "suggestedTags": Array of 3-6 tag strings
${contentType === 'faq' ? '- "faqPairs": Array of {question, answer} objects for FAQPage schema' : ''}
${contentType === 'how-to' ? '- "howToSteps": Array of {name, text} objects for HowTo schema' : ''}

Do not wrap in markdown code blocks. Return only the JSON object.`;

    const userMessage = `Write a ${contentType} article for the ${magazine} magazine.

TOPIC: ${topic}
${angle ? `ANGLE/HOOK: ${angle}` : ''}
TARGET WORD COUNT: ${targetWordCount}
${linkEntitiesSection}
${existingArticlesSection}
${productContext}
${eventContext}

${existingTitles.length > 0 ? `AVOID THESE EXISTING TITLES (create something distinctly different):\n${existingTitles.slice(0, 20).map(t => `- "${t}"`).join('\n')}` : ''}

Generate the article now. Respond with JSON only.`;

    const response = await this._sendMessage(systemPrompt, userMessage, {
      maxTokens: 8000,
      temperature: 0.75,
    });

    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.content && typeof parsed.content === 'object' && !parsed.content.blocks) {
        parsed.content = { blocks: [] };
      }

      return parsed;
    } catch {
      return {
        title: `${topic} - ${magazine}`,
        slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100),
        content: { blocks: [{ type: 'paragraph', data: { text: response.trim() } }] },
        excerpt: topic,
        seoTitle: topic,
        seoDescription: topic,
        focusKeyword: topic.toLowerCase(),
        suggestedTags: [],
      };
    }
  }

  /**
   * Reimagine a post — generate a completely different take
   * 
   * @param {Object} params
   * @param {Object} params.originalPost - The original post
   * @param {string} params.platform - Target platform
   * @param {Object} [params.brandContext] - Brand context
   * @param {string} [params.mediaDescription] - Media being used
   * @returns {Promise<Object>} New post { caption, hashtags, callToAction }
   */
  async reimaginePost(params) {
    const { originalPost, platform, brandContext = {}, mediaDescription = '' } = params;

    const systemPrompt = `You are a creative social media strategist within the Leo AI Marketing System.
Generate a COMPLETELY different approach to the same content.
Change the angle, tone, and style while keeping the same core message and platform.
Use the brand's visual identity and Leo insights to inform your creative direction.
Respond in valid JSON: { "caption", "hashtags" (array without #), "callToAction", "visualDirection" (brief art direction note) }.
Do not wrap in markdown code blocks.`;

    let brandInfo = `BRAND: ${brandContext.name || 'Not specified'} (${brandContext.style || 'general'} style, audience: ${brandContext.audience || 'general'})`;
    if (brandContext.dominantColors && brandContext.dominantColors !== 'Not yet analyzed') {
      brandInfo += `\nVisual Identity: ${brandContext.dominantColors} palette`;
      if (brandContext.styleTendencies?.length > 0) brandInfo += `, ${brandContext.styleTendencies.slice(0, 2).map(s => s.style).join('/')} style`;
    }
    if (brandContext.brandTruths?.length > 0) {
      brandInfo += `\nLeo Insights: ${brandContext.brandTruths.slice(0, 2).map(t => t.insight).join('; ')}`;
    }

    const userMessage = `Reimagine this ${platform} post with a completely fresh approach.

ORIGINAL POST:
Caption: ${originalPost.caption || originalPost.content?.caption || ''}

${brandInfo}

${mediaDescription ? `MEDIA: ${mediaDescription}` : ''}

Create something very different from the original. Respond with JSON only.`;

    const response = await this._sendMessage(systemPrompt, userMessage, { temperature: 1.0 });

    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { caption: response.trim(), hashtags: [], callToAction: '' };
    }
  }
}

/**
 * Get the singleton ClaudeService instance
 */
function getClaudeService() {
  if (!instance) {
    instance = new ClaudeService();
  }
  return instance;
}

module.exports = { ClaudeService, getClaudeService };
