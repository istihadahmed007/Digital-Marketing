import { describe, it, expect } from 'vitest';
import {
  parseCsvString,
  autoDetectFieldMapping,
  validateRow,
  processImportRows,
  FieldMapping,
} from '../src/lib/csv/parser';

describe('CSV Parser and Field Mapping', () => {
  const sampleCsv = `First Name,Last Name,Email,Company,Phone,Title,Status,Stage,Tags
Sarah,Connor,sarah@resistance.org,Cyberdyne Defense,+15550192,Security Director,qualified,sql,lead;vip
John,Connor,john@resistance.org,Resistance Ops,,Commander,new,subscriber,key-lead
Invalid,Row,not-an-email,Test Co,,Worker,new,lead,test
Duplicate,User,sarah@resistance.org,Acme,,Manager,new,lead,test`;

  it('parses raw CSV content correctly into headers and rows', async () => {
    const parsed = await parseCsvString(sampleCsv);
    expect(parsed.headers).toEqual([
      'First Name',
      'Last Name',
      'Email',
      'Company',
      'Phone',
      'Title',
      'Status',
      'Stage',
      'Tags',
    ]);
    expect(parsed.totalCount).toBe(4);
    expect(parsed.rows[0]['Email']).toBe('sarah@resistance.org');
  });

  it('auto-detects standard CRM column headers accurately', async () => {
    const parsed = await parseCsvString(sampleCsv);
    const mapping = autoDetectFieldMapping(parsed.headers);

    expect(mapping.email).toBe('Email');
    expect(mapping.first_name).toBe('First Name');
    expect(mapping.last_name).toBe('Last Name');
    expect(mapping.company_name).toBe('Company');
    expect(mapping.phone).toBe('Phone');
    expect(mapping.job_title).toBe('Title');
    expect(mapping.lead_status).toBe('Status');
    expect(mapping.lifecycle_stage).toBe('Stage');
    expect(mapping.tags).toBe('Tags');
  });

  it('validates rows, rejects invalid emails and formats valid tags', () => {
    const mapping: FieldMapping = {
      first_name: 'First Name',
      last_name: 'Last Name',
      email: 'Email',
      company_name: 'Company',
      tags: 'Tags',
    };

    // Valid row
    const validRow = {
      'First Name': 'Sarah',
      'Last Name': 'Connor',
      Email: 'sarah@resistance.org',
      Company: 'Cyberdyne Defense',
      Tags: 'lead;vip',
    };
    const validResult = validateRow(validRow, mapping, 0);
    expect(validResult.isValid).toBe(true);
    expect(validResult.contact?.email).toBe('sarah@resistance.org');
    expect(validResult.contact?.tags).toEqual(['lead', 'vip']);

    // Invalid email
    const invalidRow = {
      'First Name': 'Invalid',
      'Last Name': 'Row',
      Email: 'not-an-email',
    };
    const invalidResult = validateRow(invalidRow, mapping, 2);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toContain('Invalid email address format');
  });

  it('handles duplicates with skip strategy', async () => {
    const parsed = await parseCsvString(sampleCsv);
    const mapping: FieldMapping = {
      first_name: 'First Name',
      last_name: 'Last Name',
      email: 'Email',
      company_name: 'Company',
    };

    const existingEmails = new Set(['john@resistance.org']);

    const processed = processImportRows(parsed.rows, mapping, {
      duplicateHandling: 'skip',
      existingEmails,
    });

    // Row 1 (sarah) -> inserted
    // Row 2 (john) -> in existingEmails, skipped
    // Row 3 (invalid email) -> error
    // Row 4 (duplicate sarah) -> duplicate in file, skipped
    expect(processed.toInsert.length).toBe(1);
    expect(processed.toInsert[0].email).toBe('sarah@resistance.org');
    expect(processed.errors.length).toBe(1);
    expect(processed.skipped.length).toBe(2);
    expect(processed.skipped.some((s) => s.email === 'john@resistance.org')).toBe(true);
    expect(processed.skipped.some((s) => s.email === 'sarah@resistance.org')).toBe(true);
  });

  it('handles duplicates with update strategy', async () => {
    const parsed = await parseCsvString(sampleCsv);
    const mapping: FieldMapping = {
      first_name: 'First Name',
      last_name: 'Last Name',
      email: 'Email',
      company_name: 'Company',
    };

    const existingEmails = new Set(['john@resistance.org']);

    const processed = processImportRows(parsed.rows, mapping, {
      duplicateHandling: 'update',
      existingEmails,
    });

    // John is in existing emails, so with update strategy he goes to toUpdate
    expect(processed.toUpdate.length).toBe(1);
    expect(processed.toUpdate[0].email).toBe('john@resistance.org');
  });
});
