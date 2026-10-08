'use client';

import React, { useState, useEffect } from 'react';
import { Form, FormField, FormFieldType } from '@/lib/types/crm';
import { createForm, updateForm } from '@/lib/actions/forms';
import {
  X,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle,
  Settings2,
} from 'lucide-react';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  formToEdit?: Form | null;
  onSuccess: () => void;
}

export function FormModal({
  isOpen,
  onClose,
  workspaceId,
  formToEdit,
  onSuccess,
}: FormModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    'Thank you for reaching out! A growth advisor will contact you within 24 hours.'
  );
  const [redirectUrl, setRedirectUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const defaultFields: FormField[] = [
    {
      id: 'f-1',
      name: 'email',
      label: 'Work Email Address',
      type: 'email',
      required: true,
      placeholder: 'alex@company.com',
      mapsToContactField: 'email',
    },
    {
      id: 'f-2',
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Alex Johnson',
      mapsToContactField: 'first_name',
    },
    {
      id: 'f-3',
      name: 'company',
      label: 'Company Name',
      type: 'text',
      required: false,
      placeholder: 'Acme Marketing Corp',
      mapsToContactField: 'company',
    },
    {
      id: 'f-4',
      name: 'message',
      label: 'How can we help your team?',
      type: 'textarea',
      required: false,
      placeholder: 'Tell us about your pipeline goals...',
    },
  ];

  const [fields, setFields] = useState<FormField[]>(defaultFields);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (formToEdit) {
      setTitle(formToEdit.title);
      setSlug(formToEdit.slug);
      setDescription(formToEdit.description || '');
      setSuccessMessage(formToEdit.success_message || '');
      setRedirectUrl(formToEdit.redirect_url || '');
      setIsPublished(formToEdit.is_published);
      setFields(
        Array.isArray(formToEdit.fields) && formToEdit.fields.length > 0
          ? formToEdit.fields
          : defaultFields
      );
    } else {
      setTitle('');
      setSlug('');
      setDescription('');
      setSuccessMessage(
        'Thank you for reaching out! A growth advisor will contact you within 24 hours.'
      );
      setRedirectUrl('');
      setIsPublished(true);
      setFields(defaultFields);
    }
    setError(null);
  }, [formToEdit, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!formToEdit) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
      );
    }
  };

  const handleAddField = () => {
    const newId = `f-${Date.now()}`;
    setFields((prev) => [
      ...prev,
      {
        id: newId,
        name: `field_${prev.length + 1}`,
        label: 'New Field',
        type: 'text',
        required: false,
        placeholder: '',
      },
    ]);
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFieldChange = (id: string, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Form title is required.');
      return;
    }

    if (fields.length === 0) {
      setError('Form must have at least one field.');
      return;
    }

    const hasEmailField = fields.some(
      (f) => f.type === 'email' || f.name.toLowerCase() === 'email' || f.mapsToContactField === 'email'
    );
    if (!hasEmailField) {
      setError('Forms should include an Email field to connect leads to CRM contacts.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (formToEdit) {
        const res = await updateForm(workspaceId, formToEdit.id, {
          title,
          slug,
          description,
          fields,
          is_published: isPublished,
          success_message: successMessage,
          redirect_url: redirectUrl || null,
        });

        if (!res.success) {
          setError(res.error || 'Failed to update form');
          setLoading(false);
          return;
        }
      } else {
        const res = await createForm(workspaceId, {
          title,
          slug,
          description,
          fields,
          is_published: isPublished,
          success_message: successMessage,
          redirect_url: redirectUrl || undefined,
        });

        if (!res.success) {
          setError(res.error || 'Failed to create form');
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {formToEdit ? 'Edit Inbound Lead Form' : 'Create Lead Capture Form'}
              </h2>
              <p className="text-xs text-slate-500">
                Capture inbound leads directly into your workspace CRM contacts
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Basic Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Form Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Schedule a Growth Demo"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-2 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg">
                    /f/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="growth-demo"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-r-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description / Subtitle
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fill out this form and our strategy team will reach out."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Form Fields Builder */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Form Fields ({fields.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Submissions map directly into workspace CRM contacts
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddField}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {fields.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={f.label}
                      onChange={(e) =>
                        handleFieldChange(f.id, { label: e.target.value })
                      }
                      placeholder="Field Label"
                      className="flex-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                    />
                    <select
                      value={f.type}
                      onChange={(e) =>
                        handleFieldChange(f.id, {
                          type: e.target.value as FormFieldType,
                        })
                      }
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="textarea">Textarea</option>
                      <option value="number">Number</option>
                    </select>

                    <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) =>
                          handleFieldChange(f.id, { required: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      <span>Req</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(f.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Placeholder:</span>
                    <input
                      type="text"
                      value={f.placeholder || ''}
                      onChange={(e) =>
                        handleFieldChange(f.id, { placeholder: e.target.value })
                      }
                      placeholder="e.g. Type here..."
                      className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs"
                    />
                    <span className="text-slate-400">Maps to:</span>
                    <select
                      value={f.mapsToContactField || ''}
                      onChange={(e) =>
                        handleFieldChange(f.id, {
                          mapsToContactField: (e.target.value as any) || null,
                        })
                      }
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs"
                    >
                      <option value="">(None - Custom Field)</option>
                      <option value="email">Contact Email</option>
                      <option value="first_name">First Name</option>
                      <option value="last_name">Last Name</option>
                      <option value="phone">Phone Number</option>
                      <option value="company">Company Name</option>
                      <option value="job_title">Job Title</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Post Submission Actions */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Submission Actions
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Success Confirmation Message
              </label>
              <input
                type="text"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optional Redirect URL
              </label>
              <input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://yourcompany.com/thank-you"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Publish Form
                </span>
                <p className="text-xs text-slate-500">
                  Allow inbound submissions from public embeds and links
                </p>
              </div>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {formToEdit ? 'Save Changes' : 'Create Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
