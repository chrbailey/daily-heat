import { NextRequest, NextResponse } from 'next/server';
import { getYahooQuotes, mapYahooQuote } from '@/lib/yahoo';
import { getMockQuotes } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get('symbols');
  if (!symbols) {
    return NextResponse.json(
      { error: 'symbols parameter required' },
      { status: 400 },
    );
  }

  const tickers = symbols.split(',').map((s) => s.trim().toUpperCase());

  try {
    const yahooQuotes = await getYahooQuotes(tickers);
    const quotes = yahooQuotes.map(mapYahooQuote);
    return NextResponse.json({ quotes });
  } catch (e) {
    console.error('Yahoo quotes error, using mock:', e);
    return NextResponse.json({ quotes: getMockQuotes(tickers) });
  }
}
