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
    const openaiKey = apiKey || process.env.OPENAI_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

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
}
