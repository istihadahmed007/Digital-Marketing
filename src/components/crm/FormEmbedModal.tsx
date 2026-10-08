'use client';

import React, { useState } from 'react';
import { Form } from '@/lib/types/crm';
import { X, Copy, Check, Code, ExternalLink, Globe } from 'lucide-react';

interface FormEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: Form | null;
}

export function FormEmbedModal({
  isOpen,
  onClose,
  form,
}: FormEmbedModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen || !form) return null;

  const siteUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000';

  const directUrl = `${siteUrl}/f/${form.slug}`;
  const iframeSnippet = `<iframe\n  src="${directUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border: none; border-radius: 12px; max-width: 600px;"\n  title="${form.title}"\n></iframe>`;

  const htmlFormSnippet = `<!-- NexusMark Lead Ingestion Form -->\n<form action="${siteUrl}/api/forms/${form.slug}" method="POST">\n  <label>Email *</label>\n  <input type="email" name="email" required placeholder="alex@company.com" />\n\n  <label>Name</label>\n  <input type="text" name="name" placeholder="Alex Johnson" />\n\n  <label>Message</label>\n  <textarea name="message" placeholder="How can we help?"></textarea>\n\n  <button type="submit">Submit</button>\n</form>`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Embed & Share: {form.title}
              </h2>
              <p className="text-xs text-slate-500">
                Integrate into your landing page or share with prospective clients
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Share Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-500" />
                Direct Public URL
              </label>
              <a
                href={`/f/${form.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
              >
                Open Preview <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(directUrl, 'url')}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                {copiedType === 'url' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Responsive iFrame Embed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Responsive IFrame Widget
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(iframeSnippet, 'iframe')}
                className="text-xs text-indigo-600 hover:text-indigo-500 font-semibold flex items-center gap-1"
              >
                {copiedType === 'iframe' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Snippet
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
              <code>{iframeSnippet}</code>
            </pre>
          </div>

          {/* HTML Form Payload for Custom Sites */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Custom Website HTML Form
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(htmlFormSnippet, 'html')}
                className="text-xs text-indigo-600 hover:text-indigo-500 font-semibold flex items-center gap-1"
              >
                {copiedType === 'html' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Snippet
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
              <code>{htmlFormSnippet}</code>
            </pre>
            <p className="text-xs text-slate-400">
              Submissions through this endpoint automatically create contacts and log activities under workspace.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
