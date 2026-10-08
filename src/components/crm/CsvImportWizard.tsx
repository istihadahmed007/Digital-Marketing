'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  parseCsvString,
  autoDetectFieldMapping,
  processImportRows,
  FieldMapping,
} from '@/lib/csv/parser';
import { bulkImportContacts } from '@/lib/actions/contacts';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Users,
} from 'lucide-react';
import Link from 'next/link';

interface CsvImportWizardProps {
  workspaceId: string;
  existingEmails: string[];
}

type WizardStep = 'upload' | 'mapping' | 'preview' | 'completed';

export function CsvImportWizard({
  workspaceId,
  existingEmails,
}: CsvImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({
    first_name: '',
    email: '',
  });
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update'>('skip');

  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; email?: string; message: string }[];
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    try {
      const text = await file.text();
      const parsed = await parseCsvString(text);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        alert('The uploaded CSV file is empty.');
        setLoading(false);
        return;
      }

      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      const detected = autoDetectFieldMapping(parsed.headers);
      setMapping({
        first_name: detected.first_name || parsed.headers[0] || '',
        last_name: detected.last_name || '',
        email: detected.email || '',
        phone: detected.phone || '',
        job_title: detected.job_title || '',
        company_name: detected.company_name || '',
        lead_status: detected.lead_status || '',
        lifecycle_stage: detected.lifecycle_stage || '',
        tags: detected.tags || '',
      });

      setStep('mapping');
    } catch (err: unknown) {
      alert('Error parsing CSV file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!mapping.email || !mapping.first_name) {
      alert('First Name and Email mappings are required.');
      return;
    }

    setLoading(true);

    try {
      const processed = processImportRows(rawRows, mapping, {
        duplicateHandling,
        existingEmails: new Set(existingEmails.map((e) => e.toLowerCase())),
      });

      const allValidRows = [...processed.toInsert, ...processed.toUpdate];

      if (allValidRows.length === 0) {
        setImportResult({
          imported: 0,
          updated: 0,
          skipped: processed.skipped.length,
          errors: processed.errors,
        });
        setStep('completed');
        setLoading(false);
        return;
      }

      const res = await bulkImportContacts(workspaceId, allValidRows, {
        duplicateHandling,
      });

      setImportResult({
        imported: res.imported,
        updated: res.updated,
        skipped: processed.skipped.length,
        errors: [...processed.errors, ...res.errors.map((msg, i) => ({ row: i, message: msg }))],
      });

      setStep('completed');
    } catch (err: unknown) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 'upload'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            1
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Upload File
          </span>
        </div>

        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 'mapping'
                ? 'bg-indigo-600 text-white'
                : step === 'preview' || step === 'completed'
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            2
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Field Mapping
          </span>
        </div>

        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 'preview'
                ? 'bg-indigo-600 text-white'
                : step === 'completed'
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            3
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Review & Duplicate Settings
          </span>
        </div>

        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            4
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Import Summary
          </span>
        </div>
      </div>

      {/* STEP 1: Upload File */}
      {step === 'upload' && (
        <div className="p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Choose a CSV file to import contacts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports standard CSV files with headers like Email, First Name, Company, Title, Phone.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 cursor-pointer transition-all">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Select CSV File</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* STEP 2: Field Mapping */}
      {step === 'mapping' && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Map CSV Columns to CRM Contact Fields
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                File: <span className="font-semibold text-slate-700 dark:text-slate-300">{fileName}</span> ({rawRows.length} rows detected)
              </p>
            </div>
            <button
              onClick={() => setStep('upload')}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change File</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                First Name Column *
              </label>
              <select
                value={mapping.first_name}
                onChange={(e) => setMapping({ ...mapping, first_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select column</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Last Name Column
              </label>
              <select
                value={mapping.last_name || ''}
                onChange={(e) => setMapping({ ...mapping, last_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Don&apos;t import / None</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address Column *
              </label>
              <select
                value={mapping.email}
                onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select column</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number Column
              </label>
              <select
                value={mapping.phone || ''}
                onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Don&apos;t import / None</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Job Title Column
              </label>
              <select
                value={mapping.job_title || ''}
                onChange={(e) => setMapping({ ...mapping, job_title: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Don&apos;t import / None</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tags Column
              </label>
              <select
                value={mapping.tags || ''}
                onChange={(e) => setMapping({ ...mapping, tags: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Don&apos;t import / None</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                if (!mapping.first_name || !mapping.email) {
                  alert('Please select mappings for First Name and Email.');
                  return;
                }
                setStep('preview');
              }}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 cursor-pointer"
            >
              <span>Continue to Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Duplicate Settings */}
      {step === 'preview' && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Duplicate Handling & Preview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose how existing contacts with identical emails should be processed.
              </p>
            </div>
            <button
              onClick={() => setStep('mapping')}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mapping</span>
            </button>
          </div>

          {/* Duplicate Strategy Option */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Duplicate Policy:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  duplicateHandling === 'skip'
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="dup"
                  checked={duplicateHandling === 'skip'}
                  onChange={() => setDuplicateHandling('skip')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Skip Duplicates (Recommended)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Preserves existing CRM records. Rows matching existing emails in your workspace will be skipped safely.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  duplicateHandling === 'update'
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="dup"
                  checked={duplicateHandling === 'update'}
                  onChange={() => setDuplicateHandling('update')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Update Existing Contacts
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Overwrites matching contact records with newly provided fields from the CSV file.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* First 5 Preview Rows */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Sample Preview (First 5 Rows)
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5 font-semibold">Row</th>
                    <th className="p-2.5 font-semibold">First Name</th>
                    <th className="p-2.5 font-semibold">Last Name</th>
                    <th className="p-2.5 font-semibold">Email</th>
                    <th className="p-2.5 font-semibold">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rawRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-mono text-slate-400">#{idx + 1}</td>
                      <td className="p-2.5 font-medium">{row[mapping.first_name] || '—'}</td>
                      <td className="p-2.5">{mapping.last_name ? row[mapping.last_name] || '—' : '—'}</td>
                      <td className="p-2.5 text-indigo-600 dark:text-indigo-400 font-mono">
                        {row[mapping.email] || '—'}
                      </td>
                      <td className="p-2.5">{mapping.phone ? row[mapping.phone] || '—' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleExecuteImport}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm & Start Import ({rawRows.length} Contacts)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Completed Summary */}
      {step === 'completed' && importResult && (
        <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              CSV Contact Import Finished
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your workspace CRM records have been updated successfully.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {importResult.imported}
              </p>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-0.5">
                New Contacts
              </p>
            </div>

            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {importResult.updated}
              </p>
              <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mt-0.5">
                Updated
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                {importResult.skipped}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Skipped
              </p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="text-left p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 max-w-lg mx-auto">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span>Rows requiring review ({importResult.errors.length}):</span>
              </div>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setStep('upload');
                setImportResult(null);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Import Another CSV
            </button>
            <Link
              href="/contacts"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20"
            >
              <Users className="w-3.5 h-3.5" />
              <span>View Contacts Directory</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
