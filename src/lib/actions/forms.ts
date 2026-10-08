'use server';

import { createClient } from '@/lib/supabase/server';
import { Form, FormSubmission } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';

export async function getForms(workspaceId: string): Promise<Form[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('forms')
    .select('*, form_submissions(count)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching forms:', error);
    return [];
  }

  return data.map((item: any) => ({
    ...item,
    submissions_count: item.form_submissions?.[0]?.count ?? 0,
  })) as Form[];
}

export async function getForm(workspaceId: string, formId: string): Promise<Form | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('forms')
    .select('*, form_submissions(count)')
    .eq('workspace_id', workspaceId)
    .eq('id', formId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    submissions_count: data.form_submissions?.[0]?.count ?? 0,
  } as Form;
}

export async function getFormBySlug(slug: string): Promise<Form | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Form;
}

export async function createForm(
  workspaceId: string,
  formData: {
    title: string;
    slug: string;
    description?: string;
    fields: any[];
    is_published?: boolean;
    success_message?: string;
    redirect_url?: string;
  }
): Promise<{ success: boolean; form?: Form; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  if (!formData.title?.trim()) {
    return { success: false, error: 'Form title is required' };
  }

  const cleanSlug = (formData.slug || formData.title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const { data, error } = await supabase
    .from('forms')
    .insert({
      workspace_id: workspaceId,
      title: formData.title.trim(),
      slug: cleanSlug,
      description: formData.description?.trim() || null,
      fields: formData.fields || [],
      is_published: formData.is_published ?? true,
      success_message: formData.success_message?.trim() || 'Thank you! We will reach out shortly.',
      redirect_url: formData.redirect_url?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating form:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/forms');
  return { success: true, form: data as Form };
}

export async function updateForm(
  workspaceId: string,
  formId: string,
  formData: Partial<Form>
): Promise<{ success: boolean; form?: Form; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.title !== undefined) updatePayload.title = formData.title.trim();
  if (formData.slug !== undefined) {
    updatePayload.slug = formData.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  if (formData.description !== undefined) updatePayload.description = formData.description?.trim() || null;
  if (formData.fields !== undefined) updatePayload.fields = formData.fields;
  if (formData.is_published !== undefined) updatePayload.is_published = formData.is_published;
  if (formData.success_message !== undefined) updatePayload.success_message = formData.success_message?.trim() || null;
  if (formData.redirect_url !== undefined) updatePayload.redirect_url = formData.redirect_url?.trim() || null;

  const { data, error } = await supabase
    .from('forms')
    .update(updatePayload)
    .eq('workspace_id', workspaceId)
    .eq('id', formId)
    .select()
    .single();

  if (error) {
    console.error('Error updating form:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/forms');
  return { success: true, form: data as Form };
}

export async function deleteForm(
  workspaceId: string,
  formId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', formId);

  if (error) {
    console.error('Error deleting form:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/forms');
  return { success: true };
}

export async function getFormSubmissions(
  workspaceId: string,
  formId?: string
): Promise<FormSubmission[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('form_submissions')
    .select('*, contact:contacts(*), form:forms(title, slug)')
    .eq('workspace_id', workspaceId);

  if (formId) {
    query = query.eq('form_id', formId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching submissions:', error);
    return [];
  }

  return data as FormSubmission[];
}

export async function submitPublicForm(
  slug: string,
  submissionData: Record<string, string>,
  metadata?: { ip?: string; userAgent?: string }
): Promise<{
  success: boolean;
  message?: string;
  redirectUrl?: string | null;
  error?: string;
}> {
  // Honeypot spam check
  if (submissionData._hp_check) {
    return { success: true, message: 'Submission received' };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: 'CRM service unavailable' };
  }

  // 1. Fetch form
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('slug', slug)
    .single();

  if (formError || !form) {
    return { success: false, error: 'Form not found' };
  }

  if (!form.is_published) {
    return { success: false, error: 'This form is currently closed for submissions.' };
  }

  // 2. Extract contact fields
  const fields = (form.fields || []) as any[];
  let email = '';
  let firstName = '';
  let lastName = '';
  let phone = '';
  let jobTitle = '';
  let companyName = '';

  for (const field of fields) {
    const val = (submissionData[field.name] || '').trim();
    if (field.required && !val) {
      return { success: false, error: `${field.label || field.name} is required.` };
    }

    if (field.type === 'email' || field.mapsToContactField === 'email' || field.name.toLowerCase() === 'email') {
      if (!email) email = val.toLowerCase();
    } else if (field.mapsToContactField === 'first_name' || field.name.toLowerCase() === 'first_name' || field.name.toLowerCase() === 'name') {
      if (!firstName) {
        const parts = val.split(' ');
        firstName = parts[0] || 'Lead';
        if (parts.length > 1 && !lastName) lastName = parts.slice(1).join(' ');
      }
    } else if (field.mapsToContactField === 'last_name' || field.name.toLowerCase() === 'last_name') {
      lastName = val;
    } else if (field.mapsToContactField === 'phone' || field.type === 'phone' || field.name.toLowerCase() === 'phone') {
      phone = val;
    } else if (field.mapsToContactField === 'job_title' || field.name.toLowerCase() === 'job_title' || field.name.toLowerCase() === 'title') {
      jobTitle = val;
    } else if (field.mapsToContactField === 'company' || field.name.toLowerCase() === 'company') {
      companyName = val;
    }
  }

  if (!firstName) {
    firstName = email ? email.split('@')[0] : 'Inbound Lead';
  }

  // Extract UTM attribution parameters
  const utm_source = submissionData.utm_source || null;
  const utm_medium = submissionData.utm_medium || null;
  const utm_campaign = submissionData.utm_campaign || null;
  const utm_term = submissionData.utm_term || null;
  const utm_content = submissionData.utm_content || null;
  const referrer = submissionData.referrer || null;

  let contactId: string | null = null;

  // 3. Upsert or associate contact
  if (email) {
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, tags, lead_score')
      .eq('workspace_id', form.workspace_id)
      .eq('email', email)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
      // Append form tag if not already present & update UTMs if new
      const tags = Array.isArray(existingContact.tags) ? existingContact.tags : [];
      const updatedTags = tags.includes('form-inbound') ? tags : [...tags, 'form-inbound', form.slug];

      const updatePayload: Record<string, any> = {
        tags: updatedTags,
        updated_at: new Date().toISOString(),
      };
      if (utm_source) updatePayload.utm_source = utm_source;
      if (utm_medium) updatePayload.utm_medium = utm_medium;
      if (utm_campaign) updatePayload.utm_campaign = utm_campaign;

      await supabase
        .from('contacts')
        .update(updatePayload)
        .eq('id', contactId);
    } else {
      // Create new contact with lead score
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          workspace_id: form.workspace_id,
          first_name: firstName,
          last_name: lastName || '',
          email,
          phone: phone || null,
          job_title: jobTitle || null,
          lead_status: 'new',
          lifecycle_stage: 'lead',
          source: utm_source ? 'organic_search' : 'form_submission',
          consent_status: 'opted_in',
          tags: ['form-inbound', form.slug],
          lead_score: phone ? 35 : 20,
          lead_score_reasons: [
            { reason: 'Direct inbound lead capture form', points: 20 },
            ...(phone ? [{ reason: 'Direct phone number provided', points: 15 }] : []),
          ],
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          referrer,
        })
        .select('id')
        .single();

      if (newContact) {
        contactId = newContact.id;
      }
    }
  }

  // 4. Save form submission record
  const cleanData = { ...submissionData };
  delete cleanData._hp_check;

  const { error: subError } = await supabase.from('form_submissions').insert({
    workspace_id: form.workspace_id,
    form_id: form.id,
    contact_id: contactId,
    data: cleanData,
    ip_address: metadata?.ip || null,
    user_agent: metadata?.userAgent || null,
  });

  if (subError) {
    console.error('Error recording form submission:', subError);
  }

  // 5. Log CRM Activity with Marketing Attribution
  if (contactId) {
    let activityDesc = `Lead captured via "${form.title}".\n` +
      Object.entries(cleanData)
        .filter(([k]) => !k.startsWith('utm_') && k !== 'referrer')
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

    if (utm_source || utm_campaign) {
      activityDesc += `\nMarketing Attribution: ${utm_source || 'direct'} / ${utm_medium || 'web'} (Campaign: ${utm_campaign || 'none'})`;
    }

    await supabase.from('activities').insert({
      workspace_id: form.workspace_id,
      contact_id: contactId,
      type: 'status_change',
      title: `Form submitted: ${form.title}`,
      description: activityDesc,
    });
  }

  revalidatePath('/forms');
  revalidatePath('/contacts');
  revalidatePath('/dashboard');

  return {
    success: true,
    message: form.success_message || 'Thank you for your submission!',
    redirectUrl: form.redirect_url || null,
  };
}
