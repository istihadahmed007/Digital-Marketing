import { NextRequest, NextResponse } from 'next/server';
import { safeFetch } from '@/lib/security/ssrf';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptSecret } from '@/lib/security/crypto';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  let state: { workspaceId?: string; returnTo?: string } = {};
  if (stateRaw) {
    try {
      state = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
    } catch {
      // Ignored
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || origin;
  const returnTo = state.returnTo || '/shorts';
  const workspaceId = state.workspaceId || 'ws-default';

  if (error || !code) {
    return NextResponse.redirect(`${siteUrl}${returnTo}?error=${encodeURIComponent(error || 'Access denied by Google')}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${siteUrl}${returnTo}?error=Missing+Google+OAuth+credentials`);
  }

  try {
    const redirectUri = `${siteUrl}/api/integrations/google/callback`;
    const tokenRes = await safeFetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
      timeoutMs: 15000,
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      return NextResponse.redirect(
        `${siteUrl}${returnTo}?error=${encodeURIComponent(errJson.error_description || 'Failed to exchange authorization code')}`
      );
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    // Securely persist into Supabase integrations tables if available
    const adminSupabase = createAdminClient();
    if (adminSupabase) {
      try {
        let targetWsId = workspaceId;
        if (!targetWsId || targetWsId === 'ws-default') {
          const { data: firstWs } = await adminSupabase.from('workspaces').select('id').limit(1).maybeSingle();
          if (firstWs?.id) {
            targetWsId = firstWs.id;
          }
        }

        if (targetWsId && targetWsId !== 'ws-default') {
          const configToStore: Record<string, any> = {
            accessToken: encryptSecret(accessToken),
            clientId,
            clientSecret: encryptSecret(clientSecret),
            isConnected: true,
          };
          if (refreshToken) {
            configToStore.refreshToken = encryptSecret(refreshToken);
          }

          // 1. Persist to integrations table (google_calendar / YouTube)
          await adminSupabase.from('integrations').upsert(
            {
              workspace_id: targetWsId,
              provider: 'google_calendar',
              name: 'Google & YouTube Account',
              config: configToStore,
              is_enabled: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'workspace_id, provider' }
          );

          // 2. Persist to seo_integrations table (Google Search Console)
          await adminSupabase.from('seo_integrations').upsert(
            {
              workspace_id: targetWsId,
              provider: 'google_search_console',
              account_name: 'Google Account',
              config: configToStore,
              is_connected: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'workspace_id, provider' }
          );
        }
      } catch (err) {
        console.error('Failed to persist Google OAuth credentials to DB:', err);
      }
    }

    return NextResponse.redirect(`${siteUrl}${returnTo}?connected=youtube&success=true`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${siteUrl}${returnTo}?error=${encodeURIComponent(err.message || 'OAuth error')}`);
  }
}
