import { NextRequest, NextResponse } from 'next/server';
import {
  processNextRenderingJob,
  processDueScheduledPublishingJobs,
} from '@/lib/../workers/video-processor';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Optional bearer secret check if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // In production with CRON_SECRET configured, enforce token
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized worker invocation' }, { status: 401 });
      }
    }

    const renderResult = await processNextRenderingJob();
    const scheduleResult = await processDueScheduledPublishingJobs();

    return NextResponse.json({
      success: true,
      rendering: renderResult,
      publishing: scheduleResult,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
