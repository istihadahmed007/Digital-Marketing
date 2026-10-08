'use server';

import { createClient } from '@/lib/supabase/server';
import { Company, Contact, Deal } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';

export async function getCompanies(
  workspaceId: string,
  options?: {
    search?: string;
    industry?: string;
    tag?: string;
    isArchived?: boolean;
  }
): Promise<Company[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('companies')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (options?.isArchived !== undefined) {
    query = query.eq('is_archived', options.isArchived);
  } else {
    query = query.eq('is_archived', false);
  }

  if (options?.industry && options.industry !== 'all') {
    query = query.eq('industry', options.industry);
  }

  if (options?.tag) {
    query = query.contains('tags', [options.tag]);
  }

  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    query = query.or(`name.ilike.${term},domain.ilike.${term},city.ilike.${term}`);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching companies:', error);
    return [];
  }

  return data as Company[];
}

export async function getCompanyById(
  workspaceId: string,
  companyId: string
): Promise<{ company: Company | null; contacts: Contact[]; deals: Deal[] }> {
  const supabase = await createClient();
  if (!supabase) return { company: null, contacts: [], deals: [] };

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', companyId)
    .single();

  if (error || !company) {
    return { company: null, contacts: [], deals: [] };
  }

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('company_id', companyId);

  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('company_id', companyId);

  return {
    company: company as Company,
    contacts: contacts || [],
    deals: deals || [],
  };
}

export async function createCompany(
  workspaceId: string,
  companyData: {
    name: string;
    domain?: string;
    industry?: string;
    size?: string;
    phone?: string;
    city?: string;
    country?: string;
    tags?: string[];
  }
): Promise<{ success: boolean; company?: Company; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('companies')
    .insert({
      workspace_id: workspaceId,
      name: companyData.name.trim(),
      domain: companyData.domain?.trim() || null,
      industry: companyData.industry?.trim() || null,
      size: companyData.size || null,
      phone: companyData.phone?.trim() || null,
      city: companyData.city?.trim() || null,
      country: companyData.country?.trim() || null,
      tags: companyData.tags || [],
      created_by: user?.id || null,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create company' };
  }

  // Log activity
  await supabase.from('activities').insert({
    workspace_id: workspaceId,
    company_id: data.id,
    type: 'note',
    title: 'Company created',
    description: `Company ${data.name} added to CRM.`,
    user_id: user?.id || null,
  });

  revalidatePath('/companies');
  revalidatePath('/dashboard');
  return { success: true, company: data as Company };
}

export async function updateCompany(
  workspaceId: string,
  companyId: string,
  updates: Partial<Company>
): Promise<{ success: boolean; company?: Company; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data, error } = await supabase
    .from('companies')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', companyId)
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to update company' };
  }

  revalidatePath('/companies');
  revalidatePath(`/companies/${companyId}`);
  return { success: true, company: data as Company };
}

export async function archiveCompany(
  workspaceId: string,
  companyId: string,
  isArchived: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { error } = await supabase
    .from('companies')
    .update({
      is_archived: isArchived,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', companyId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/companies');
  revalidatePath('/dashboard');
  return { success: true };
}
