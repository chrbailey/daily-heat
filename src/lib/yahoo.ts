// Yahoo Finance API — no signup needed
// Uses crumb auth flow for v7 endpoints (options, quotes)
// Falls back to v8 chart for basic quotes if crumb fails

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// --- Crumb session (cached in-memory, refreshed on 401) ---

let cachedCrumb: { crumb: string; cookie: string; ts: number } | null = null;
const CRUMB_TTL = 1000 * 60 * 30; // 30 minutes

async function getCrumbSession() {
  if (cachedCrumb && Date.now() - cachedCrumb.ts < CRUMB_TTL) {
    return cachedCrumb;
  }

  // Step 1: get cookie
  const cookieRes = await fetch('https://fc.yahoo.com/', {
    headers: { 'User-Agent': UA },
    redirect: 'manual',
  });
  const rawCookies = cookieRes.headers.getSetCookie?.() ?? [];
  const cookie = rawCookies.map((c) => c.split(';')[0]).join('; ');

  // Step 2: get crumb
  const crumbRes = await fetch(
    'https://query2.finance.yahoo.com/v1/test/getcrumb',
    { headers: { 'User-Agent': UA, Cookie: cookie } },
  );
  if (!crumbRes.ok) throw new Error('Failed to get Yahoo crumb');
  const crumb = await crumbRes.text();

  cachedCrumb = { crumb, cookie, ts: Date.now() };
  return cachedCrumb;
}

async function yahooFetch(url: string) {
  const session = await getCrumbSession();
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}crumb=${encodeURIComponent(session.crumb)}`;

  const res = await fetch(fullUrl, {
    headers: { 'User-Agent': UA, Cookie: session.cookie },
  });

  // If 401, invalidate crumb and retry once
  if (res.status === 401) {
    cachedCrumb = null;
    const retry = await getCrumbSession();
    const retryUrl = `${url}${separator}crumb=${encodeURIComponent(retry.crumb)}`;
    return fetch(retryUrl, {
      headers: { 'User-Agent': UA, Cookie: retry.cookie },
    });
  }

  return res;
}

// --- Quotes (v7 with crumb, fallback to v8 chart) ---

interface YahooQuoteV7 {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  averageDailyVolume3Month?: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  bid: number;
  ask: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

export async function getYahooQuotes(
  symbols: string[],
): Promise<YahooQuoteV7[]> {
  try {
    // Try v7 multi-quote (needs crumb)
    const res = await yahooFetch(
      `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`,
    );
    if (res.ok) {
      const data = await res.json();
      return data.quoteResponse?.result ?? [];
    }
  } catch {
    // fall through to v8
  }

  // Fallback: parallel v8 chart requests
  const results = await Promise.all(
    symbols.map(async (sym) => {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
        { headers: { 'User-Agent': UA } },
      );
      if (!res.ok) return null;
      const d = await res.json();
      const meta = d.chart?.result?.[0]?.meta;
      if (!meta) return null;

      return {
        symbol: meta.symbol,
        shortName: meta.shortName ?? meta.longName ?? sym,
        longName: meta.longName ?? sym,
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketChange:
          meta.regularMarketPrice - (meta.chartPreviousClose ?? meta.regularMarketPrice),
        regularMarketChangePercent: meta.chartPreviousClose
          ? ((meta.regularMarketPrice - meta.chartPreviousClose) /
              meta.chartPreviousClose) *
            100
          : 0,
        regularMarketVolume: meta.regularMarketVolume ?? 0,
        averageDailyVolume3Month: 0,
        regularMarketOpen: meta.regularMarketDayHigh ?? meta.regularMarketPrice,
        regularMarketDayHigh: meta.regularMarketDayHigh ?? meta.regularMarketPrice,
        regularMarketDayLow: meta.regularMarketDayLow ?? meta.regularMarketPrice,
        regularMarketPreviousClose: meta.chartPreviousClose ?? meta.regularMarketPrice,
        bid: meta.regularMarketPrice - 0.01,
        ask: meta.regularMarketPrice + 0.01,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? meta.regularMarketPrice,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? meta.regularMarketPrice,
      } satisfies YahooQuoteV7;
    }),
  );

  return results.filter((r) => r !== null) as YahooQuoteV7[];
}

// Map Yahoo quote → our TradierQuote-compatible shape
export function mapYahooQuote(q: YahooQuoteV7) {
  return {
    symbol: q.symbol,
    description: q.shortName ?? q.longName ?? q.symbol,
    last: q.regularMarketPrice,
    change: q.regularMarketChange,
    change_percentage: q.regularMarketChangePercent,
    volume: q.regularMarketVolume,
    average_volume: q.averageDailyVolume3Month ?? 0,
    open: q.regularMarketOpen,
    high: q.regularMarketDayHigh,
    low: q.regularMarketDayLow,
    close: q.regularMarketPreviousClose,
    bid: q.bid,
    ask: q.ask,
    week_52_high: q.fiftyTwoWeekHigh,
    week_52_low: q.fiftyTwoWeekLow,
  };
}

// --- Options (v7 with crumb) ---

interface YahooOption {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  expiration: number;
}

interface YahooOptionsResult {
  underlyingSymbol: string;
  expirationDates: number[];
  quote: YahooQuoteV7;
  options: {
    expirationDate: number;
    calls: YahooOption[];
    puts: YahooOption[];
  }[];
}

export async function getYahooOptions(
  symbol: string,
  expirationUnix?: number,
): Promise<YahooOptionsResult | null> {
  let url = `https://query2.finance.yahoo.com/v7/finance/options/${symbol}`;
  if (expirationUnix) url += `?date=${expirationUnix}`;
  const res = await yahooFetch(url);
  if (!res.ok) throw new Error(`Yahoo options failed: ${res.status}`);
  const data = await res.json();
  return data.optionChain?.result?.[0] ?? null;
}

// Convert unix timestamp to YYYY-MM-DD
function unixToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().split('T')[0];
}

// Get expirations as YYYY-MM-DD strings
export async function getYahooExpirations(symbol: string): Promise<string[]> {
  const result = await getYahooOptions(symbol);
  if (!result) return [];
  return result.expirationDates.map(unixToDate);
}

// Convert YYYY-MM-DD to unix timestamp for Yahoo API
export function dateToUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000);
}
