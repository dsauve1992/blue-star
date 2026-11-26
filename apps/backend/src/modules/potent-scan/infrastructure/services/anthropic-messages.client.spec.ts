import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { lazyAnthropicMessages } from './anthropic-messages.client';

jest.mock('@anthropic-ai/sdk');

const PARAMS: Anthropic.MessageCreateParamsNonStreaming = {
  model: 'claude-haiku-5-5',
  max_tokens: 10,
  messages: [{ role: 'user', content: 'hi' }],
};

const configWith = (key: string | undefined) =>
  ({ get: jest.fn().mockReturnValue(key) }) as unknown as ConfigService;

describe('lazyAnthropicMessages', () => {
  beforeEach(() => jest.mocked(Anthropic).mockClear());

  it('should build no client until a call is made', () => {
    lazyAnthropicMessages(configWith('sk-test'));

    expect(Anthropic).not.toHaveBeenCalled();
  });

  it.each([undefined, ''])(
    'should reject the call without creating a client when the key is %p',
    async (key) => {
      const messages = lazyAnthropicMessages(configWith(key));

      await expect(messages.create(PARAMS)).rejects.toThrow(
        'ANTHROPIC_API_KEY is not set',
      );
      expect(Anthropic).not.toHaveBeenCalled();
    },
  );

  it('should pass the configured key explicitly and reuse one client', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'msg' });
    jest
      .mocked(Anthropic)
      .mockImplementation(
        () => ({ messages: { create } }) as unknown as Anthropic,
      );
    const messages = lazyAnthropicMessages(configWith('sk-test'));

    await messages.create(PARAMS);
    await messages.create(PARAMS);

    expect(Anthropic).toHaveBeenNthCalledWith(1, { apiKey: 'sk-test' });
    expect(Anthropic).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenNthCalledWith(2, PARAMS);
  });
});
