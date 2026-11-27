import Anthropic from '@anthropic-ai/sdk';
import { ResearchUsage } from '../../domain/value-objects/hit-research';

export interface ModelPricing {
  model: string;
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  longPrompt?: {
    aboveInputTokens: number;
    inputUsdPerMTok: number;
    outputUsdPerMTok: number;
  };
}

export const CLAUDE_HAIKU_5_5: ModelPricing = {
  model: 'claude-haiku-5-5',
  inputUsdPerMTok: 0.1,
  outputUsdPerMTok: 0.5,
  longPrompt: {
    aboveInputTokens: 100_000,
    inputUsdPerMTok: 0.5,
    outputUsdPerMTok: 2.5,
  },
};

export const CLAUDE_SONNET_5_5: ModelPricing = {
  model: 'claude-sonnet-5-5',
  inputUsdPerMTok: 2,
  outputUsdPerMTok: 10,
};

export const WEB_SEARCH_USD_PER_REQUEST = 0.01;

export function costOf(
  pricing: ModelPricing,
  inputTokens: number,
  outputTokens: number,
  webSearchRequests: number,
): number {
  const rates =
    pricing.longPrompt && inputTokens > pricing.longPrompt.aboveInputTokens
      ? pricing.longPrompt
      : pricing;
  return (
    (inputTokens * rates.inputUsdPerMTok +
      outputTokens * rates.outputUsdPerMTok) /
      1_000_000 +
    webSearchRequests * WEB_SEARCH_USD_PER_REQUEST
  );
}

export function usageOf(
  pricing: ModelPricing,
  message: Anthropic.Message,
): ResearchUsage {
  const usage = message.usage;
  const inputTokens =
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);
  const webSearchRequests = usage.server_tool_use?.web_search_requests ?? 0;
  return {
    inputTokens,
    outputTokens: usage.output_tokens,
    webSearchRequests,
    costUsd: costOf(
      pricing,
      inputTokens,
      usage.output_tokens,
      webSearchRequests,
    ),
  };
}

export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}
