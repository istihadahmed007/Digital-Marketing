'use client';

import React, { useState, useEffect, use } from 'react';
import { Form, FormField } from '@/lib/types/crm';
import { getFormBySlug, submitPublicForm } from '@/lib/actions/forms';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function PublicFormLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForm() {
      setLoading(true);
      try {
        const data = await getFormBySlug(slug);
        setForm(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [slug]);

  const handleChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = { ...formData, _hp_check: honeypot };
      const res = await submitPublicForm(slug, payload);

      if (!res.success) {
        setError(res.error || 'Failed to submit form');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSuccessMessage(
        res.message || form.success_message || 'Thank you for your submission!'
      );

      if (res.redirectUrl) {
        setTimeout(() => {
          window.location.href = res.redirectUrl!;
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EDF9FD] via-[#F8FDFF] to-[#D7F1FA] dark:from-[#0a1824] dark:to-[#102434] flex items-center justify-center p-6 text-[#17364A] dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#167AA0] animate-spin" />
          <p className="text-sm text-[#526D7D] dark:text-slate-400">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EDF9FD] via-[#F8FDFF] to-[#D7F1FA] dark:from-[#0a1824] dark:to-[#102434] flex items-center justify-center p-6 text-[#17364A] dark:text-slate-100">
        <div className="max-w-md w-full glass-panel-opaque border border-[#75D2EE]/40 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#75D2EE]/15 border border-[#75D2EE]/30 flex items-center justify-center mx-auto text-[#167AA0] dark:text-[#75D2EE]">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#17364A] dark:text-white">Form Not Available</h1>
          <p className="text-sm text-[#526D7D] dark:text-slate-400">
            This lead capture form may be unpublished or does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EDF9FD] via-[#F8FDFF] to-[#D7F1FA] dark:from-[#0a1824] dark:via-[#102434] dark:to-[#0a1824] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute top-1/6 left-1/5 w-80 h-80 rounded-full bg-[#75D2EE]/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/5 w-96 h-96 rounded-full bg-[#167AA0]/15 blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full glass-panel-opaque border border-[#75D2EE]/40 rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Decorative Header */}
        <div className="p-8 sm:p-10 border-b border-[#75D2EE]/25 bg-gradient-to-b from-[#D7F1FA]/40 to-transparent dark:from-[#167AA0]/20 dark:to-transparent">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#75D2EE]/20 border border-[#75D2EE]/40 text-[#167AA0] dark:text-[#75D2EE] text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Lead Intake
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#17364A] dark:text-white">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-sm text-[#526D7D] dark:text-slate-300 mt-2 leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        {/* Form Body */}
        <div className="p-8 sm:p-10">
          {submitted ? (
            <div className="text-center py-8 space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-[#17364A] dark:text-white">Submitted!</h2>
              <p className="text-sm text-[#526D7D] dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                {successMessage}
              </p>
              {form.redirect_url && (
                <p className="text-xs text-[#526D7D]/70 dark:text-slate-400">Redirecting you shortly...</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Honeypot field for bot suppression */}
              <input
                type="text"
                name="_hp_check"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              {/* Dynamic Form Fields */}
              {form.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#17364A] dark:text-slate-300">
                    {field.label} {field.required && <span className="text-[#167AA0]">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      required={field.required}
                      rows={3}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className="w-full px-4 py-2.5 text-sm bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/30 dark:border-slate-700 rounded-xl text-[#17364A] dark:text-white placeholder-[#526D7D]/60 focus:outline-hidden focus:ring-2 focus:ring-[#167AA0] transition"
                    />
                  ) : field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/30 dark:border-slate-700 rounded-xl text-[#17364A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#167AA0] transition"
                    >
                      <option value="">Select an option</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'phone' ? 'tel' : 'text'}
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className="w-full px-4 py-2.5 text-sm bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/30 dark:border-slate-700 rounded-xl text-[#17364A] dark:text-white placeholder-[#526D7D]/60 focus:outline-hidden focus:ring-2 focus:ring-[#167AA0] transition"
                    />
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 py-3 px-6 bg-[#167AA0] hover:bg-[#0E526E] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#167AA0]/20 glass-button-press transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-[#526D7D] dark:text-slate-400">
                  Secured by NexusMark CRM & Growth Platform
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
