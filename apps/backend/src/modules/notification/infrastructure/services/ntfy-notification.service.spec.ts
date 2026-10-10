import type { ConfigService } from '@nestjs/config';
import { NtfyNotificationService } from './ntfy-notification.service';
import { NotificationPriority } from '../../domain/services/notification.service';
import { NotificationMessage } from '../../domain/value-objects/notification-message';
import { NotificationTitle } from '../../domain/value-objects/notification-title';
import { NotificationTopic } from '../../domain/value-objects/notification-topic';

describe('NtfyNotificationService', () => {
  let fetchSpy: jest.SpyInstance<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >;

  const buildService = (config: Record<string, string> = {}) =>
    new NtfyNotificationService({
      get: (key: string) => config[key],
    } as unknown as ConfigService);

  const baseRequest = () => ({
    topic: NotificationTopic.of('alerts'),
    message: NotificationMessage.of('hello'),
  });

  const sentInit = () => fetchSpy.mock.calls[0][1] as RequestInit;
  const sentBody = () =>
    JSON.parse(sentInit().body as string) as Record<string, unknown>;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('sends only topic and message when nothing else is provided', async () => {
    await buildService().send(baseRequest());

    expect(sentBody()).toEqual({ topic: 'alerts', message: 'hello' });
  });

  it('includes title, priority and tags when provided', async () => {
    await buildService().send({
      ...baseRequest(),
      title: NotificationTitle.of('Heads up'),
      priority: NotificationPriority.HIGH,
      tags: ['warning'],
    });

    expect(sentBody()).toEqual({
      topic: 'alerts',
      message: 'hello',
      title: 'Heads up',
      priority: NotificationPriority.HIGH,
      tags: ['warning'],
    });
  });

  it('omits empty tags', async () => {
    await buildService().send({ ...baseRequest(), tags: [] });

    expect(sentBody()).not.toHaveProperty('tags');
  });

  it('posts to ntfy.sh by default without an Authorization header', async () => {
    await buildService().send(baseRequest());

    expect(fetchSpy.mock.calls[0][0]).toBe('https://ntfy.sh');
    expect(sentInit().method).toBe('POST');
    expect(sentInit().headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('uses the configured base URL and bearer token', async () => {
    await buildService({
      NTFY_BASE_URL: 'https://ntfy.example.com',
      NTFY_API_KEY: 'secret',
    }).send(baseRequest());

    expect(fetchSpy.mock.calls[0][0]).toBe('https://ntfy.example.com');
    expect(sentInit().headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret',
    });
  });

  it('passes an abort signal to fetch', async () => {
    await buildService().send(baseRequest());

    expect(sentInit().signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects with the status exactly once on a non-OK response', async () => {
    fetchSpy.mockResolvedValue(
      new Response('nope', { status: 500, statusText: 'Server Error' }),
    );

    const error = await buildService()
      .send(baseRequest())
      .catch((e: Error) => e);

    expect((error as Error).message).toBe(
      'Failed to send notification: 500 Server Error - nope',
    );
  });

  it('rejects with a prefixed message and the cause on a network error', async () => {
    const cause = new Error('connect ECONNREFUSED');
    fetchSpy.mockRejectedValue(cause);

    const error = await buildService()
      .send(baseRequest())
      .catch((e: Error) => e);

    expect((error as Error).message).toBe(
      'Failed to send notification: connect ECONNREFUSED',
    );
    expect((error as Error).cause).toBe(cause);
  });

  it('rejects when the request times out', async () => {
    const timeout = Object.assign(new Error('timed out'), {
      name: 'TimeoutError',
    });
    fetchSpy.mockRejectedValue(timeout);

    await expect(buildService().send(baseRequest())).rejects.toThrow(
      'Failed to send notification: timed out',
    );
  });

  it('prefixes non-Error rejections with an unknown error message', async () => {
    fetchSpy.mockRejectedValue('boom');

    const error = await buildService()
      .send(baseRequest())
      .catch((e: Error) => e);

    expect((error as Error).message).toBe(
      'Failed to send notification: Unknown error',
    );
    expect((error as Error).cause).toBe('boom');
  });
});
