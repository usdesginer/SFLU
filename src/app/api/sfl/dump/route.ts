import { NextRequest, NextResponse } from 'next/server';
import { sflFetch } from '@/lib/sflFetch';

export async function GET(request: NextRequest) {
  const apiKey = 
    request.headers.get('x-api-key') || 
    process.env.SFL_COMMUNITY_API_KEY || 
    '';
  const baseUrl = process.env.SFL_API_BASE_URL || 'https://api.sunflower-land.com';

  try {
    const sflResponse = await sflFetch(`${baseUrl}/community/data?type=nightlyDump`, {
      headers: {
        'x-api-key': apiKey,
        'User-Agent': 'FarmIQ/1.0',
        'Accept': 'application/json',
      },
      timeoutMs: 10000,
      retries: 1,
      cache: 'no-store',
    });

    if (!sflResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch nightly dump manifest' }, { status: sflResponse.status });
    }

    const manifest = await sflResponse.json();
    return NextResponse.json(manifest);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to contact SFL nightly dump API', message: err.message }, { status: 500 });
  }
}

