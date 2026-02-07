import { NextRequest, NextResponse } from 'next/server';
import { getYahooExpirations } from '@/lib/yahoo';
import { getMockExpirations } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol parameter required' },
      { status: 400 },
    );
  }

  try {
    const expirations = await getYahooExpirations(symbol.toUpperCase());
    return NextResponse.json({ expirations });
  } catch (e) {
    console.error('Yahoo expirations error, using mock:', e);
    return NextResponse.json({
      expirations: getMockExpirations(symbol.toUpperCase()),
    });
  }
}
