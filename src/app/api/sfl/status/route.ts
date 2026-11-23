import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const apiKey = 
    request.headers.get('x-api-key') || 
    process.env.SFL_COMMUNITY_API_KEY || 
    '';
  const baseUrl = process.env.SFL_API_BASE_URL || 'https://api.sunflower-land.com';

  if (!apiKey) {
    return NextResponse.json({
      connected: false,
      message: 'No Sunflower Land API key configured.',
      environment: baseUrl.includes('api-dev') ? 'testnet' : 'mainnet',
    });
  }

  try {
    const sflResponse = await fetch(`${baseUrl}/community/farms?limit=1`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (sflResponse.status === 401) {
      return NextResponse.json({
        connected: false,
        status: 401,
        message: 'API Key is invalid or farm VIP/level 50+ has lapsed.',
        environment: baseUrl.includes('api-dev') ? 'testnet' : 'mainnet',
      });
    }

    if (sflResponse.ok) {
      const data = await sflResponse.json();
      return NextResponse.json({
        connected: true,
        status: 200,
        message: 'Successfully connected to official Sunflower Land Community API!',
        environment: baseUrl.includes('api-dev') ? 'testnet' : 'mainnet',
        firstFarmId: data.farms?.[0]?.id,
      });
    }

    return NextResponse.json({
      connected: false,
      status: sflResponse.status,
      message: `Unexpected status: ${sflResponse.statusText}`,
      environment: baseUrl.includes('api-dev') ? 'testnet' : 'mainnet',
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      message: err.message,
      environment: baseUrl.includes('api-dev') ? 'testnet' : 'mainnet',
    });
  }
}

