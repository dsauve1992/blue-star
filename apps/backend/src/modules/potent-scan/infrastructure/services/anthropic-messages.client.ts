import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';

export interface AnthropicMessages {
  create(
    params: Anthropic.MessageCreateParamsNonStreaming,
  ): Promise<Anthropic.Message>;
}

export function lazyAnthropicMessages(
  config: ConfigService,
): AnthropicMessages {
  let client: Anthropic | null = null;
  return {
    async create(params) {
      const apiKey = config.get<string>('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set');
      }
      client ??= new Anthropic({ apiKey });
      return client.messages.create(params);
    },
  };
}
