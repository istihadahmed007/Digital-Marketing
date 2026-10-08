import { NextRequest, NextResponse } from 'next/server';
import { submitPublicForm } from '@/lib/actions/forms';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const contentType = req.headers.get('content-type') || '';

    let payload: Record<string, string> = {};

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = String(value);
      });
    } else {
      payload = await req.json().catch(() => ({}));
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await submitPublicForm(slug, payload, { ip, userAgent });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // If submitted via standard HTML form and has redirect
    if (result.redirectUrl && !contentType.includes('application/json')) {
      return NextResponse.redirect(new URL(result.redirectUrl, req.url));
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      redirectUrl: result.redirectUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
