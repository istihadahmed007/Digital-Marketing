import { safeFetch } from '@/lib/security/ssrf';

export interface GroundedCrmContext {
  contactName: string;
  email: string;
  jobTitle?: string | null;
  companyName?: string | null;
  industry?: string | null;
  lifecycleStage: string;
  leadStatus: string;
  activities: Array<{ title: string; date: string; type: string }>;
  deals: Array<{ title: string; amount: number; stage: string }>;
  objective: string;
  tone?: string;
}

export interface AiDraftResponse {
  subject: string;
  body: string;
  groundedFacts: string[];
}

export class AiClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private providerType: 'openai' | 'gemini' | 'none';

  constructor(apiKey?: string, baseUrl?: string, model?: string) {
    const openaiKey = apiKey !== undefined ? apiKey : (process.env.OPENAI_API_KEY || '');
    const geminiKey = apiKey === undefined ? (process.env.GEMINI_API_KEY || '') : '';

    if (openaiKey) {
      this.apiKey = openaiKey;
      this.baseUrl = (baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
      this.model = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
      this.providerType = 'openai';
    } else if (geminiKey) {
      this.apiKey = geminiKey;
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      this.model = model || 'gemini-1.5-flash';
      this.providerType = 'gemini';
    } else {
      this.apiKey = '';
      this.baseUrl = '';
      this.model = '';
      this.providerType = 'none';
    }
  }

  isConfigured(): boolean {
    return this.providerType !== 'none' && Boolean(this.apiKey);
  }

  getSetupInstructions(): string {
    return 'AI Assistant is not configured. Setup required: Set OPENAI_API_KEY (or GEMINI_API_KEY) in environment variables or workspace settings to enable real AI content generation grounded in CRM records.';
  }

  /**
   * Generates an outreach email draft strictly grounded in retrieved CRM data.
   */
  async generateOutreachDraft(context: GroundedCrmContext): Promise<{
    success: boolean;
    draft?: AiDraftResponse;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: this.getSetupInstructions(),
      };
    }

    const groundedFacts: string[] = [
      `Contact: ${context.contactName} (${context.jobTitle || 'Role unrecorded'})`,
      `Company: ${context.companyName || 'Independent Organization'} (${context.industry || 'General commercial sector'})`,
      `Lifecycle Stage: ${context.lifecycleStage.toUpperCase()} (Lead Status: ${context.leadStatus})`,
      context.activities.length > 0
        ? `Last CRM interaction: "${context.activities[0].title}" on ${context.activities[0].date}`
        : 'No prior interactions recorded in CRM',
      context.deals.length > 0
        ? `Active Deal: "${context.deals[0].title}" ($${context.deals[0].amount.toLocaleString()}, Stage: ${context.deals[0].stage})`
        : 'No active deals in pipeline',
    ];

    const systemPrompt = `You are a senior B2B growth and CRM copywriter.
CRITICAL CONSTRAINT: You MUST strictly ground your draft in the provided CRM facts. DO NOT invent company statistics, products, revenue figures, or fake previous touchpoints not present in the record.
Output your response in valid JSON with exactly two string keys: "subject" and "body".`;

    const userPrompt = `Generate a personalized email draft based on this verified CRM context:
- Contact Name: ${context.contactName}
- Job Title: ${context.jobTitle || 'Leader'}
- Company: ${context.companyName || 'the organization'}
- Industry: ${context.industry || 'general industry'}
- Objective: ${context.objective}
- Tone: ${context.tone || 'professional'}
- Recent Activities: ${JSON.stringify(context.activities)}
- Deals: ${JSON.stringify(context.deals)}

Respond strictly in JSON format: {"subject": "...", "body": "..."}`;

    try {
      if (this.providerType === 'openai') {
        const endpoint = `${this.baseUrl}/chat/completions`;
        const res = await safeFetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
          timeoutMs: 15000,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          return {
            success: false,
            error: errBody.error?.message || `AI provider returned HTTP ${res.status}`,
          };
        }

        const data = await res.json();
        const contentStr = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(contentStr);

        return {
          success: true,
          draft: {
            subject: parsed.subject || `Growth touchpoint for ${context.companyName || 'your team'}`,
            body: parsed.body || '',
            groundedFacts,
          },
        };
      } else if (this.providerType === 'gemini') {
        const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await safeFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
          timeoutMs: 15000,
        });

        if (!res.ok) {
          return { success: false, error: `Gemini API returned HTTP ${res.status}` };
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text);

        return {
          success: true,
          draft: {
            subject: parsed.subject || `Checking in with ${context.companyName || 'your team'}`,
            body: parsed.body || '',
            groundedFacts,
          },
        };
      }

      return { success: false, error: this.getSetupInstructions() };
    } catch (err: any) {
      return {
        success: false,
        error: `AI generation failed: ${err.message}`,
      };
    }
  }

  /**
   * Generates multi-platform marketing content in Bangla and English.
   */
  async generateStudioContent(params: {
    platform: string;
    topicOrPage: string;
    sourceType: string;
    targetUrl?: string;
    language: 'en' | 'bn' | 'both';
    brandVoice: string;
    targetAudience?: string;
    callToAction?: string;
    variationsCount?: number;
  }): Promise<{
    success: boolean;
    provider: 'openai' | 'gemini' | 'rule_fallback';
    modelUsed: string;
    variations: any[];
    estimatedCostUsd?: number;
    error?: string;
  }> {
    const count = Math.min(Math.max(params.variationsCount || 2, 1), 3);
    const platformLimits: Record<string, number> = {
      facebook: 63206,
      instagram: 2200,
      tiktok: 2200,
      youtube_shorts: 5000,
      blog: 50000,
      email: 20000,
      creative_brief: 10000,
    };

    // Rule-based high-retention generator if no API credentials configured
    const buildFallbackVariations = () => {
      const topic = params.topicOrPage.trim();
      const cta = params.callToAction || `Discover more at ${params.targetUrl || 'our link in bio'}`;
      const ctaBn = `বিস্তারিত জানতে ভিজিট করুন ${params.targetUrl || 'আমাদের লিংকে'}`;

      const hooksEn = [
        `Stop scrolling: Here is how ${topic} is changing the game in 2026.`,
        `The biggest mistake people make with ${topic} (and the exact fix).`,
        `3 proven ways ${topic} will save you 10+ hours every single week.`,
      ];
      const hooksBn = [
        `স্ক্রল থামান: ২০২৬ সালে যেভাবে ${topic} আপনার ব্যবসা ও মার্কেটিং বদলে দেবে।`,
        `${topic} নিয়ে সবচেয়ে বড় যে ভুলটি সবাই করে (এবং তার সঠিক সমাধান)।`,
        `৩টি পরীক্ষিত উপায় যার মাধ্যমে ${topic} আপনার প্রতি সপ্তাহে ১০+ ঘণ্টা সময় বাঁচাবে।`,
      ];

      const variations = [];
      for (let i = 0; i < count; i++) {
        const hook = hooksEn[i % hooksEn.length];
        const hookBn = hooksBn[i % hooksBn.length];

        let body = '';
        let bodyBn = '';
        const scenes = [];

        if (params.platform === 'youtube_shorts' || params.platform === 'tiktok') {
          body = `[Hook: 0-5s] ${hook}\n[Problem: 5-15s] Most solutions for ${topic} are overly complicated.\n[Solution: 15-40s] Step 1: Automate the repetitive groundwork. Step 2: Focus on verified analytics. Step 3: Scale customer conversions.\n[CTA: 40-55s] ${cta}`;
          bodyBn = `[হুক: ০-৫ সে.] ${hookBn}\n[সমস্যা: ৫-১৫ সে.] ${topic} নিয়ে কাজ করার সময় বেশিরভাগ মানুষ জটিলতায় পড়ে।\n[সমাধান: ১৫-৪০ সে.] ধাপ ১: স্বয়ংক্রিয়ভাবে কাজ শুরু করুন। ধাপ ২: ভেরিফায়েড অ্যানালিটিক্স ব্যবহার করুন।\n[কল টু অ্যাকশন: ৪০-৫৫ সে.] ${ctaBn}`;

          scenes.push(
            { sceneNumber: 1, timeRange: '0:00 - 0:05', visualShot: 'Close-up dynamic headshot with punchy text overlay', audioVoiceover: hook, onScreenText: 'STOP SCROLLING ⚠️' },
            { sceneNumber: 2, timeRange: '0:05 - 0:25', visualShot: 'Screen recording demonstrating real interface features', audioVoiceover: `Here is the exact framework to master ${topic} without wasted effort.`, onScreenText: 'Step-by-step breakdown 💡' },
            { sceneNumber: 3, timeRange: '0:25 - 0:50', visualShot: 'Fast-paced graphic transition with conversion charts', audioVoiceover: 'Notice how verified data eliminates the guesswork completely.', onScreenText: 'Proven Results 📈' },
            { sceneNumber: 4, timeRange: '0:50 - 0:60', visualShot: 'Presenter holding phone with arrow pointing down to caption', audioVoiceover: cta, onScreenText: 'Click link below 👇' }
          );
        } else {
          body = `${hook}\n\nIf you have been searching for a smarter way to manage ${topic}, this is for you.\n\nKey takeaways:\n• Streamlined execution without unnecessary complexity\n• Data-backed strategies that work consistently\n• Real-time visibility across all touchpoints\n\n👉 ${cta}`;
          bodyBn = `${hookBn}\n\nআপনি যদি ${topic} পরিচালনার সহজ ও কার্যকর উপায় খুঁজে থাকেন, তবে এই পদ্ধতি আপনার জন্য।\n\nমূল সুবিধাসমূহ:\n• জটিলতা ছাড়া দ্রুত ও স্বয়ংক্রিয় বাস্তবায়ন\n• রিয়েল-টাইম ডেটা এবং সঠিক সিদ্ধান্ত\n• সর্বোচ্চ কাস্টমার কনভার্সন\n\n👉 ${ctaBn}`;
        }

        const hashtags = [
          `#${topic.replace(/[^a-zA-Z0-9]/g, '')}`,
          '#DigitalMarketing',
          '#GrowthHacking',
          '#MarketingAutomation',
          '#AItools',
          '#BangladeshBusiness',
        ].filter(Boolean);

        variations.push({
          id: `var-${i + 1}-${Date.now()}`,
          title: `Option ${i + 1}: ${params.brandVoice.toUpperCase()} Angle`,
          hook,
          hookBn,
          body,
          bodyBn,
          callToAction: cta,
          callToActionBn: ctaBn,
          hashtags,
          scenes: scenes.length > 0 ? scenes : undefined,
          characterCount: body.length,
          platformLimitWarning:
            body.length > (platformLimits[params.platform] || 2200)
              ? `Warning: Content exceeds standard ${params.platform} limit`
              : undefined,
        });
      }

      return {
        success: true,
        provider: 'rule_fallback' as const,
        modelUsed: 'GrowthPilot Structured Marketing Formulas',
        variations,
        estimatedCostUsd: 0.00,
      };
    };

    if (!this.isConfigured()) {
      return buildFallbackVariations();
    }

    const systemPrompt = `You are a world-class growth marketing director fluent in English and Bangla.
Generate ${count} high-converting variations for the platform: "${params.platform}".
Brand Voice: "${params.brandVoice}".
Target Language: "${params.language}".
Provide hook, body, callToAction in English AND in Bangla.
If the platform is "youtube_shorts" or "tiktok", include a 4-scene storyboard array (visualShot, audioVoiceover, onScreenText).
Output strictly in valid JSON matching:
{
  "variations": [
    {
      "title": "...",
      "hook": "...",
      "hookBn": "...",
      "body": "...",
      "bodyBn": "...",
      "callToAction": "...",
      "callToActionBn": "...",
      "hashtags": ["#...", "#..."],
      "scenes": [{"sceneNumber": 1, "timeRange": "0:00 - 0:05", "visualShot": "...", "audioVoiceover": "...", "onScreenText": "..."}]
    }
  ]
}`;

    const userPrompt = `Topic/Target: ${params.topicOrPage}
Source Type: ${params.sourceType}
Target URL: ${params.targetUrl || 'N/A'}
Audience: ${params.targetAudience || 'Target customers'}
Preferred CTA: ${params.callToAction || 'Link in description'}
Generate ${count} high-retention variations formatted specifically for ${params.platform}.`;

    try {
      if (this.providerType === 'openai') {
        const endpoint = `${this.baseUrl}/chat/completions`;
        const res = await safeFetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.8,
            response_format: { type: 'json_object' },
          }),
          timeoutMs: 18000,
        });

        if (!res.ok) {
          return buildFallbackVariations();
        }

        const data = await res.json();
        const contentStr = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(contentStr);
        const rawVars = parsed.variations || [];

        const variations = rawVars.map((v: any, idx: number) => ({
          id: `var-ai-${idx + 1}-${Date.now()}`,
          title: v.title || `Variation ${idx + 1}`,
          hook: v.hook || '',
          hookBn: v.hookBn || '',
          body: v.body || '',
          bodyBn: v.bodyBn || '',
          callToAction: v.callToAction || '',
          callToActionBn: v.callToActionBn || '',
          hashtags: Array.isArray(v.hashtags) ? v.hashtags : [],
          scenes: v.scenes || undefined,
          characterCount: (v.body || '').length,
        }));

        return {
          success: true,
          provider: 'openai',
          modelUsed: this.model,
          variations: variations.length > 0 ? variations : buildFallbackVariations().variations,
          estimatedCostUsd: 0.002,
        };
      } else if (this.providerType === 'gemini') {
        const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await safeFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
            ],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          timeoutMs: 18000,
        });

        if (!res.ok) {
          return buildFallbackVariations();
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text);
        const rawVars = parsed.variations || [];

        const variations = rawVars.map((v: any, idx: number) => ({
          id: `var-gemini-${idx + 1}-${Date.now()}`,
          title: v.title || `Variation ${idx + 1}`,
          hook: v.hook || '',
          hookBn: v.hookBn || '',
          body: v.body || '',
          bodyBn: v.bodyBn || '',
          callToAction: v.callToAction || '',
          callToActionBn: v.callToActionBn || '',
          hashtags: Array.isArray(v.hashtags) ? v.hashtags : [],
          scenes: v.scenes || undefined,
          characterCount: (v.body || '').length,
        }));

        return {
          success: true,
          provider: 'gemini',
          modelUsed: this.model,
          variations: variations.length > 0 ? variations : buildFallbackVariations().variations,
          estimatedCostUsd: 0.00,
        };
      }

      return buildFallbackVariations();
    } catch {
      return buildFallbackVariations();
    }
  }
}

