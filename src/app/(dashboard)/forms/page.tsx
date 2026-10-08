'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Form, FormSubmission } from '@/lib/types/crm';
import {
  getForms,
  deleteForm,
  updateForm,
  getFormSubmissions,
} from '@/lib/actions/forms';
import { FormModal } from '@/components/crm/FormModal';
import { FormEmbedModal } from '@/components/crm/FormEmbedModal';
import { EmptyState } from '@/components/crm/EmptyState';
import {
  FileText,
  Plus,
  Code,
  Globe,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Send,
  Users,
  Eye,
  RefreshCw,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [embedModalForm, setEmbedModalForm] = useState<Form | null>(null);

  // Submissions Drawer
  const [selectedFormForSubmissions, setSelectedFormForSubmissions] =
    useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const fetchFormsData = async (wsId: string) => {
    setLoading(true);
    try {
      const data = await getForms(wsId);
      setForms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormsData(workspaceId);
  }, [workspaceId]);

  const handleTogglePublish = async (form: Form) => {
    const updatedStatus = !form.is_published;
    await updateForm(workspaceId, form.id, { is_published: updatedStatus });
    setForms((prev) =>
      prev.map((f) =>
        f.id === form.id ? { ...f, is_published: updatedStatus } : f
      )
    );
  };

  const handleDelete = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form and all its submissions?'))
      return;
    await deleteForm(workspaceId, formId);
    setForms((prev) => prev.filter((f) => f.id !== formId));
    if (selectedFormForSubmissions?.id === formId) {
      setSelectedFormForSubmissions(null);
    }
  };

  const handleOpenSubmissions = async (form: Form) => {
    setSelectedFormForSubmissions(form);
    setSubmissionsLoading(true);
    try {
      const data = await getFormSubmissions(workspaceId, form.id);
      setSubmissions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const totalSubmissions = forms.reduce(
    (acc, f) => acc + (f.submissions_count || 0),
    0
  );
  const publishedForms = forms.filter((f) => f.is_published).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Phase 2 Live
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Lead Capture Forms
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Build inbound lead forms, generate embeddable widgets, and automatically route submissions into your CRM contacts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchFormsData(workspaceId)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setEditingForm(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Lead Form
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Forms
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {forms.length}
          </p>
          <span className="text-xs text-slate-500">Configured in workspace</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Published & Active
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {publishedForms}
          </p>
          <span className="text-xs text-slate-500">Accepting prospect submissions</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Submissions
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {totalSubmissions}
          </p>
          <span className="text-xs text-slate-500">Inbound leads converted to CRM</span>
        </div>
      </div>

      {/* Forms List / Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading forms...</p>
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No lead capture forms yet"
          description="Create your first inbound lead form to embed on your website or share with potential customers."
          actionText="Create Inbound Form"
          onAction={() => {
            setEditingForm(null);
            setIsFormModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePublish(form)}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border transition flex items-center gap-1 ${
                        form.is_published
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          form.is_published ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {form.is_published ? 'Published' : 'Draft'}
                    </button>
                    <span className="text-xs text-slate-400 font-mono">
                      /f/{form.slug}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingForm(form);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Edit Form"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(form.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Delete Form"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                  {form.title}
                </h3>
                {form.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {form.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    <strong>{form.fields?.length || 0}</strong> Fields
                  </span>
                  <span>
                    <strong>{form.submissions_count || 0}</strong> Inbound Leads
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEmbedModalForm(form)}
                  className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Code className="w-3.5 h-3.5" /> Embed
                </button>

                <a
                  href={`/f/${form.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View
                </a>

                <button
                  type="button"
                  onClick={() => handleOpenSubmissions(form)}
                  className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" /> Leads ({form.submissions_count || 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submissions Drawer / Viewer Modal */}
      {selectedFormForSubmissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Submissions: {selectedFormForSubmissions.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Inbound submissions automatically saved to CRM contacts
                </p>
              </div>
              <button
                onClick={() => setSelectedFormForSubmissions(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {submissionsLoading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading submissions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p className="text-sm font-medium">No submissions yet for this form.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Share the form link or embed it on your landing page to capture leads.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Submitted At</th>
                        <th className="p-3">Matched Contact</th>
                        <th className="p-3">Submission Details</th>
                        <th className="p-3">IP / Client</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3 whitespace-nowrap text-slate-500 font-mono">
                            {new Date(sub.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {sub.contact ? (
                              <Link
                                href={`/contacts/${sub.contact.id}`}
                                className="font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                {sub.contact.first_name} {sub.contact.last_name}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {Object.entries(sub.data || {}).map(([key, val]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="font-semibold text-slate-500">{key}:</span>
                                  <span className="text-slate-900 dark:text-slate-100">{String(val)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap text-slate-400 font-mono text-[10px]">
                            {sub.ip_address || 'Anonymous'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Creator / Editor Modal */}
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingForm(null);
        }}
        workspaceId={workspaceId}
        formToEdit={editingForm}
        onSuccess={() => fetchFormsData(workspaceId)}
      />

      {/* Embed Code Modal */}
      <FormEmbedModal
        isOpen={!!embedModalForm}
        onClose={() => setEmbedModalForm(null)}
        form={embedModalForm}
      />
    </div>
  );
}
