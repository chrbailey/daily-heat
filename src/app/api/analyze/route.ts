import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  const { headlines, ticker } = await request.json();

  if (!headlines?.length) {
    return NextResponse.json({ error: 'headlines array required' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Return mock analysis when no API key
    return NextResponse.json({
      analyses: headlines.map((h: string, i: number) => ({
        headline: h,
        classification: i % 3 === 0 ? 'SIGNAL' : 'NOISE',
        sector: 'Technology',
        sentiment: i % 2 === 0 ? 'bullish' : 'neutral',
        urgency: i === 0 ? 'high' : 'low',
        reasoning: 'Mock analysis — set ANTHROPIC_API_KEY for real analysis',
      })),
    });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a financial analyst applying the H.E.A.T. framework (Hedge, Edge, Asymmetry, Theme).

Classify each headline as SIGNAL (actionable market-moving information) or NOISE (short-term distraction).

For each SIGNAL, provide:
- sector: the relevant market sector
- sentiment: bullish | bearish | neutral
- urgency: high | medium | low
- reasoning: 1-2 sentences on WHY this matters for positioning

${ticker ? `Focus context: ${ticker}` : ''}

Headlines:
${headlines.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}

Respond as a JSON array:
[{"headline": "...", "classification": "SIGNAL|NOISE", "sector": "...", "sentiment": "...", "urgency": "...", "reasoning": "..."}]

Return ONLY the JSON array, no markdown.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const analyses = JSON.parse(content.text);
    return NextResponse.json({ analyses });
  } catch (e) {
    console.error('Claude analysis error:', e);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 },
    );
  }
}
