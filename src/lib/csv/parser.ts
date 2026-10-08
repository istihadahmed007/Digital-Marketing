import Papa from 'papaparse';
import { CsvContactRow, LeadStatus, LifecycleStage } from '../types/crm';

export interface FieldMapping {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  job_title?: string;
  company_name?: string;
  lead_status?: string;
  lifecycle_stage?: string;
  tags?: string;
}

export interface ParsedCsvData {
  headers: string[];
  rows: Record<string, string>[];
  totalCount: number;
}

export interface ProcessedImport {
  toInsert: CsvContactRow[];
  toUpdate: CsvContactRow[];
  skipped: { row: number; email: string; reason: string }[];
  errors: { row: number; email?: string; message: string }[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCsvString(csvString: string): Promise<ParsedCsvData> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvString, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        resolve({
          headers,
          rows: results.data,
          totalCount: results.data.length,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export function autoDetectFieldMapping(headers: string[]): Partial<FieldMapping> {
  const mapping: Partial<FieldMapping> = {};

  const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const header of headers) {
    const c = clean(header);
    if (!mapping.email && (c === 'email' || c === 'emailaddress' || c === 'mail')) {
      mapping.email = header;
    } else if (!mapping.first_name && (c === 'firstname' || c === 'first' || c === 'givenname' || c === 'name')) {
      mapping.first_name = header;
    } else if (!mapping.last_name && (c === 'lastname' || c === 'last' || c === 'surname' || c === 'familyname')) {
      mapping.last_name = header;
    } else if (!mapping.phone && (c === 'phone' || c === 'phonenumber' || c === 'mobile' || c === 'tel' || c === 'telephone')) {
      mapping.phone = header;
    } else if (!mapping.job_title && (c === 'jobtitle' || c === 'title' || c === 'role' || c === 'position')) {
      mapping.job_title = header;
    } else if (!mapping.company_name && (c === 'company' || c === 'companyname' || c === 'organization' || c === 'org')) {
      mapping.company_name = header;
    } else if (!mapping.tags && (c === 'tags' || c === 'tag' || c === 'labels')) {
      mapping.tags = header;
    } else if (!mapping.lead_status && (c === 'leadstatus' || c === 'status')) {
      mapping.lead_status = header;
    } else if (!mapping.lifecycle_stage && (c === 'lifecyclestage' || c === 'stage' || c === 'lifecycle')) {
      mapping.lifecycle_stage = header;
    }
  }

  return mapping;
}

export function validateRow(
  rawRow: Record<string, string>,
  mapping: FieldMapping,
  rowIndex: number
): { isValid: boolean; contact?: CsvContactRow; error?: string } {
  const emailKey = mapping.email;
  const firstNameKey = mapping.first_name;

  if (!emailKey || !rawRow[emailKey]) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Email is required but missing or empty`,
    };
  }

  const email = rawRow[emailKey].trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Invalid email address format "${email}"`,
    };
  }

  const firstName = (rawRow[firstNameKey] || '').trim();
  if (!firstName) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: First name is required`,
    };
  }

  const lastName = mapping.last_name && rawRow[mapping.last_name] ? rawRow[mapping.last_name].trim() : '';
  const phone = mapping.phone && rawRow[mapping.phone] ? rawRow[mapping.phone].trim() : undefined;
  const jobTitle = mapping.job_title && rawRow[mapping.job_title] ? rawRow[mapping.job_title].trim() : undefined;
  const companyName = mapping.company_name && rawRow[mapping.company_name] ? rawRow[mapping.company_name].trim() : undefined;

  // Tags parsing
  let tags: string[] = [];
  if (mapping.tags && rawRow[mapping.tags]) {
    tags = rawRow[mapping.tags]
      .split(/[,;|]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Lead status validation
  let leadStatus: LeadStatus = 'new';
  if (mapping.lead_status && rawRow[mapping.lead_status]) {
    const rawStatus = rawRow[mapping.lead_status].toLowerCase().trim() as LeadStatus;
    if (['new', 'contacted', 'qualified', 'unqualified', 'customer'].includes(rawStatus)) {
      leadStatus = rawStatus;
    }
  }

  // Lifecycle stage validation
  let lifecycleStage: LifecycleStage = 'lead';
  if (mapping.lifecycle_stage && rawRow[mapping.lifecycle_stage]) {
    const rawStage = rawRow[mapping.lifecycle_stage].toLowerCase().trim() as LifecycleStage;
    if (['subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer'].includes(rawStage)) {
      lifecycleStage = rawStage;
    }
  }

  return {
    isValid: true,
    contact: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      job_title: jobTitle,
      company_name: companyName,
      lead_status: leadStatus,
      lifecycle_stage: lifecycleStage,
      tags,
    },
  };
}

export function processImportRows(
  rows: Record<string, string>[],
  mapping: FieldMapping,
  options: {
    duplicateHandling: 'skip' | 'update';
    existingEmails: Set<string>;
  }
): ProcessedImport {
  const toInsert: CsvContactRow[] = [];
  const toUpdate: CsvContactRow[] = [];
  const skipped: { row: number; email: string; reason: string }[] = [];
  const errors: { row: number; email?: string; message: string }[] = [];

  const seenInCsv = new Set<string>();

  rows.forEach((row, idx) => {
    const result = validateRow(row, mapping, idx);

    if (!result.isValid || !result.contact) {
      errors.push({
        row: idx + 1,
        email: mapping.email ? row[mapping.email] : undefined,
        message: result.error || 'Validation failed',
      });
      return;
    }

    const contact = result.contact;

    // Check intra-file duplicates
    if (seenInCsv.has(contact.email)) {
      skipped.push({
        row: idx + 1,
        email: contact.email,
        reason: 'Duplicate email inside the same CSV file',
      });
      return;
    }
    seenInCsv.add(contact.email);

    // Check workspace database existing duplicates
    const isExisting = options.existingEmails.has(contact.email);

    if (isExisting) {
      if (options.duplicateHandling === 'skip') {
        skipped.push({
          row: idx + 1,
          email: contact.email,
          reason: 'Contact with this email already exists in workspace (skipped)',
        });
      } else {
        toUpdate.push(contact);
      }
    } else {
      toInsert.push(contact);
    }
  });

  return {
    toInsert,
    toUpdate,
    skipped,
    errors,
  };
}
