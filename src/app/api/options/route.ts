import { NextRequest, NextResponse } from 'next/server';
import { getYahooOptions, dateToUnix } from '@/lib/yahoo';
import { calculateGreeks } from '@/lib/black-scholes';
import { getMockOptionsChain } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const expiration = request.nextUrl.searchParams.get('expiration');

  if (!symbol || !expiration) {
    return NextResponse.json(
      { error: 'symbol and expiration parameters required' },
      { status: 400 },
    );
  }

  try {
    const expirationUnix = dateToUnix(expiration);
    const result = await getYahooOptions(symbol.toUpperCase(), expirationUnix);
    if (!result || result.options.length === 0) {
      return NextResponse.json({ options: [] });
    }

    const stockPrice = result.quote.regularMarketPrice;
    const expDate = new Date(expiration + 'T16:00:00Z');
    const now = new Date();
    const daysToExpiry = Math.max(
      (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      0.01,
    );

    // Flatten calls + puts and inject Black-Scholes greeks
    const options = result.options.flatMap((opt) => {
      const allContracts = [
        ...opt.calls.map((c) => ({ ...c, option_type: 'call' as const })),
        ...opt.puts.map((p) => ({ ...p, option_type: 'put' as const })),
      ];

      return allContracts.map((c) => {
        const iv = c.impliedVolatility || 0.3;
        const greeks = calculateGreeks(
          stockPrice,
          c.strike,
          daysToExpiry,
          iv,
          c.option_type,
        );

        return {
          symbol: c.contractSymbol,
          option_type: c.option_type,
          strike: c.strike,
          last: c.lastPrice,
          bid: c.bid,
          ask: c.ask,
          volume: c.volume ?? 0,
          open_interest: c.openInterest ?? 0,
          expiration_date: expiration,
          greeks,
        };
      });
    });

    return NextResponse.json({ options });
  } catch (e) {
    console.error('Yahoo options error, using mock:', e);
    return NextResponse.json({
      options: getMockOptionsChain(symbol.toUpperCase(), expiration),
    });
  }
}
