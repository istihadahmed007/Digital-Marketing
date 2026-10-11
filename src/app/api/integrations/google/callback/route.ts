import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { safeFetch } from '@/lib/security/ssrf';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptSecret } from '@/lib/security/crypto';
import { getAuthorizedWorkspace, AuthorizationError } from '@/lib/security/auth-context';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || origin;
  let returnTo = '/shorts';

  if (errorParam) {
    return NextResponse.redirect(`${siteUrl}${returnTo}?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent('Missing OAuth authorization code or state parameter.')}`
    );
  }

  // 1. Verify signed state and decode payload
  const secretKey =
    process.env.ENCRYPTION_KEY ||
    process.env.GOOGLE_CLIENT_SECRET ||
    'digital_marketing_oauth_secret';

  const parts = stateRaw.split('.');
  if (parts.length !== 2) {
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent('OAuth state parameter format is invalid or altered.')}`
    );
  }

  const [serialized, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secretKey).update(serialized).digest('base64url');

  if (signature !== expectedSignature) {
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent('OAuth state signature verification failed (tampered state).')}`
    );
  }

  let statePayload: {
    nonce: string;
    userId: string;
    workspaceId: string;
    returnTo: string;
    expiresAt: number;
  };

  try {
    statePayload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf-8'));
  } catch {
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent('Failed to parse OAuth state payload.')}`
    );
  }

  returnTo = statePayload.returnTo || '/shorts';

  if (!statePayload.expiresAt || Date.now() > statePayload.expiresAt) {
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent('OAuth state has expired. Please initiate connection again.')}`
    );
  }

  // 2. Verify nonce against HTTP-only session cookie
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get('google_oauth_nonce')?.value;
  cookieStore.delete('google_oauth_nonce');

  if (!storedNonce || storedNonce !== statePayload.nonce) {
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent('OAuth state nonce mismatch or session expired.')}`
    );
  }

  // 3. Verify user session and workspace membership
  try {
    const auth = await getAuthorizedWorkspace({
      requestedWorkspaceId: statePayload.workspaceId,
      requiredRole: 'admin',
    });

    if (auth.user.id !== statePayload.userId) {
      return NextResponse.redirect(
        `${siteUrl}${returnTo}?error=${encodeURIComponent('Session mismatch between initiating and authorizing user.')}`
      );
    }
  } catch (authErr: any) {
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent(authErr.message || 'Workspace authorization failed.')}`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent('Missing server Google OAuth credentials configuration.')}`
    );
  }

  // 4. Exchange authorization code for tokens
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
        `${siteUrl}${returnTo}?error=${encodeURIComponent(
          errJson.error_description || 'Failed to exchange authorization code with Google.'
        )}`
      );
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    if (!accessToken) {
      return NextResponse.redirect(
        `${siteUrl}${returnTo}?error=${encodeURIComponent('No access token received from Google OAuth.')}`
      );
    }

    // 5. Verify connected Google account / YouTube channel
    let accountName = 'Google Account';
    let channelId = '';
    try {
      const channelRes = await safeFetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeoutMs: 10000,
        }
      );
      if (channelRes.ok) {
        const channelData = await channelRes.json();
        const firstChannel = channelData.items?.[0];
        if (firstChannel) {
          accountName = firstChannel.snippet?.title || accountName;
          channelId = firstChannel.id || '';
        }
      }
    } catch {
      // Continue with verified tokens
    }

    // 6. Persist encrypted credentials to DB strictly under authorized workspace
    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      return NextResponse.redirect(
        `${siteUrl}${returnTo}?error=${encodeURIComponent('Database admin client unavailable to store credentials.')}`
      );
    }

    const configToStore: Record<string, any> = {
      accessToken: encryptSecret(accessToken),
      clientId,
      clientSecret: encryptSecret(clientSecret),
      channelId,
      accountName,
      isConnected: true,
      updatedAt: new Date().toISOString(),
    };
    if (refreshToken) {
      configToStore.refreshToken = encryptSecret(refreshToken);
    }

    // Save to integrations (youtube)
    const { error: ytError } = await adminSupabase.from('integrations').upsert(
      {
        workspace_id: statePayload.workspaceId,
        provider: 'youtube',
        name: `YouTube Channel (${accountName})`,
        config: configToStore,
        is_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id, provider' }
    );

    if (ytError) {
      console.error('Failed to store YouTube credentials in DB:', ytError.message);
      return NextResponse.redirect(
        `${siteUrl}${returnTo}?error=${encodeURIComponent(`Failed to save credentials to database: ${ytError.message}`)}`
      );
    }

    // Also link google_calendar / search console for workspace
    await adminSupabase.from('integrations').upsert(
      {
        workspace_id: statePayload.workspaceId,
        provider: 'google_calendar',
        name: `Google Account (${accountName})`,
        config: configToStore,
        is_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id, provider' }
    );

    // Only report success after credentials are confirmed saved and verified
    return NextResponse.redirect(`${siteUrl}${returnTo}?connected=youtube&success=true`);
  } catch (err: any) {
    console.error('Google OAuth callback processing error:', err);
    return NextResponse.redirect(
      `${siteUrl}${returnTo}?error=${encodeURIComponent(err.message || 'Unexpected OAuth callback error')}`
    );
  }
}
