// Black-Scholes option pricing model for Greek calculations
// Used when data source doesn't provide greeks (e.g. Yahoo Finance)

const RISK_FREE_RATE = 0.045; // ~4.5% (approximate Fed rate)

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  mid_iv: number;
  bid_iv: number;
  ask_iv: number;
  smv_vol: number;
}

export function calculateGreeks(
  stockPrice: number,
  strike: number,
  daysToExpiry: number,
  impliedVol: number,
  type: 'call' | 'put',
): Greeks {
  const T = Math.max(daysToExpiry / 365, 1 / 365); // min 1 day
  const sigma = Math.max(impliedVol, 0.01);
  const S = stockPrice;
  const K = strike;
  const r = RISK_FREE_RATE;

  const sqrtT = Math.sqrt(T);
  const d1 =
    (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normalCDF(d1);
  const nd1 = normalPDF(d1);
  const Nd2 = normalCDF(d2);

  let delta: number;
  let theta: number;

  if (type === 'call') {
    delta = Nd1;
    theta =
      (-S * nd1 * sigma) / (2 * sqrtT) -
      r * K * Math.exp(-r * T) * Nd2;
  } else {
    delta = Nd1 - 1;
    theta =
      (-S * nd1 * sigma) / (2 * sqrtT) +
      r * K * Math.exp(-r * T) * (1 - Nd2);
  }

  // theta per day
  theta = theta / 365;

  // gamma (same for calls and puts)
  const gamma = nd1 / (S * sigma * sqrtT);

  // vega per 1% move in IV
  const vega = (S * nd1 * sqrtT) / 100;

  return {
    delta: +delta.toFixed(4),
    gamma: +gamma.toFixed(6),
    theta: +theta.toFixed(4),
    vega: +vega.toFixed(4),
    mid_iv: sigma,
    bid_iv: sigma * 0.97,
    ask_iv: sigma * 1.03,
    smv_vol: sigma,
  };
}
