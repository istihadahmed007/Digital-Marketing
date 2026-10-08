export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project-ref') &&
    !anonKey.includes('your-anon-key-here') &&
    url.startsWith('http')
  );

  return {
    url: url || '',
    anonKey: anonKey || '',
    isConfigured,
  };
}
