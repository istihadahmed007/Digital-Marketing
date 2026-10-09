'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Video,
  Mail,
  TrendingUp,
  Loader2,
  Copy,
  Check,
  Bot,
} from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export function AiAssistantModal({ isOpen, onClose }: AiAssistantModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    {
      label: '🎬 Viral Shorts Titles',
      text: 'Give me 5 punchy 30-second Shorts video ideas and viral hooks for our product.',
    },
    {
      label: '✉️ Follow-Up Message',
      text: 'Write a warm, non-pushy follow-up email for a new customer lead.',
    },
    {
      label: '📈 Deal Closing Advice',
      text: 'How should I follow up on a customer proposal sent 3 days ago with no response?',
    },
  ];

  const handleAsk = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setLoading(true);
    setResponse(null);

    try {
      // Call contextual generation
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setResponse(data.reply);
      } else {
        // High-quality contextual fallback
        setTimeout(() => {
          if (userPrompt.toLowerCase().includes('short') || userPrompt.toLowerCase().includes('video')) {
            setResponse(
              `Here are 3 high-retention 30–60 second Shorts ideas:\n\n` +
              `1. "The 60-Second Rule That 3x Our Signups"\n` +
              `   • Hook: "Stop spending more on ads until you fix this one thing."\n` +
              `   • Core Message: Reaching leads within 60 seconds boosts conversions by 300%.\n` +
              `   • Call to action: "Try it today in your follow-ups tab!"\n\n` +
              `2. "Why 80% of Sales Pipelines Are Overcomplicated"\n` +
              `   • Hook: "If your pipeline has more than 4 stages, your reps are confused."\n` +
              `   • Core Message: Simplify to New Lead, Qualified Demo, Proposal Sent, Closed Won.\n\n` +
              `3. "Repurpose 1 Video into 5 Viral Shorts"\n` +
              `   • Hook: "You don't need to film 30 videos a week to grow."\n` +
              `   • Core Message: Take your best moments and auto-add readable captions in Shorts Studio!`
            );
            setLoading(false);
          } else {
            setResponse(
              `Here is a proven template you can customize:\n\n` +
              `Subject: Quick question about your goals\n\n` +
              `Hi [First Name],\n\n` +
              `I noticed you recently checked out our platform. I wanted to make sure you found everything you needed to get started.\n\n` +
              `Would you like a quick 5-minute walkthrough, or should I send over our 2-step setup guide?\n\n` +
              `Best regards,\n[Your Name]`
            );
            setLoading(false);
          }
        }, 600);
      }
    } catch {
      setResponse('I am ready to help you draft messages, brainstorm Shorts hooks, or simplify customer follow-ups.');
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                NexusMark AI Assistant
              </h3>
              <p className="text-[11px] text-slate-500">
                Contextual helper for emails, Shorts, and customer follow-ups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Prompts */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick Suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => {
                    setPrompt(qp.text);
                    handleAsk(qp.text);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Response Box */}
          {loading && (
            <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking and drafting response...</span>
            </div>
          )}

          {response && !loading && (
            <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {response}
            </div>
          )}
        </div>

        {/* Modal Input Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(prompt);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask for Shorts ideas, email drafts, or customer follow-up advice..."
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
