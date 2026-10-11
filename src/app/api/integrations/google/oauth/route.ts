import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getAuthorizedWorkspace, AuthorizationError } from '@/lib/security/auth-context';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID not configured in environment variables' },
      { status: 500 }
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || origin;
  const redirectUri = `${siteUrl}/api/integrations/google/callback`;
  const returnTo = searchParams.get('returnTo') || '/shorts';

  try {
    // 1. Authenticate user session and verify workspace membership (admin/owner role)
    const auth = await getAuthorizedWorkspace({
      requestedWorkspaceId: searchParams.get('workspaceId'),
      requiredRole: 'admin',
    });

    const workspaceId = auth.workspaceId;
    const userId = auth.user.id;

    // 2. Generate cryptographically random nonce bound to this session
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const statePayload = {
      nonce,
      userId,
      workspaceId,
      returnTo,
      expiresAt,
    };

    // 3. HMAC-sign state to prevent tampering
    const secretKey =
      process.env.ENCRYPTION_KEY ||
      process.env.GOOGLE_CLIENT_SECRET ||
      'digital_marketing_oauth_secret';

    const serialized = Buffer.from(JSON.stringify(statePayload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secretKey).update(serialized).digest('base64url');
    const signedState = `${serialized}.${signature}`;

    // 4. Store nonce in HTTP-only secure cookie
    const cookieStore = await cookies();
    cookieStore.set('google_oauth_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly',
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', signedState);

    return NextResponse.redirect(authUrl.toString());
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent(err.message)}`);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
