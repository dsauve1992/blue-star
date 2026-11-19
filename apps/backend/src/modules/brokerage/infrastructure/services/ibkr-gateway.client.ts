import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Agent, request as httpsRequest } from 'node:https';
import {
  BrokerRejectedError,
  BrokerUnavailableError,
} from '../../domain/domain-errors';

const REQUEST_TIMEOUT_MS = 15_000;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type HttpMethod = 'GET' | 'POST' | 'DELETE';

@Injectable()
export class IbkrGatewayClient {
  constructor(private readonly configService: ConfigService) {}

  async request<T>(
    method: HttpMethod,
    path: string,
    body?: object,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl()}${path}`);
    const payload = body === undefined ? undefined : JSON.stringify(body);

    const { status, text } = await this.send(url, method, payload);
    const json = parseJson(text);

    if (status === 401) {
      throw new BrokerUnavailableError(
        `The IBKR gateway session is not authenticated: log in at ${url.origin}`,
      );
    }
    if (status === 429) {
      throw new BrokerUnavailableError(
        'The IBKR gateway is rate limiting requests: retry in a few seconds',
      );
    }
    if (status >= 400 && status < 500) {
      throw new BrokerRejectedError(
        `IBKR rejected ${method} ${path}: ${errorMessage(json) ?? text}`,
      );
    }
    if (status >= 500) {
      throw new Error(`IBKR gateway error ${status} on ${method} ${path}`);
    }
    return json as T;
  }

  private baseUrl(): string {
    const baseUrl = this.configService.get<string>('IBKR_GATEWAY_URL');
    if (!baseUrl) {
      throw new BrokerUnavailableError(
        'The IBKR gateway is not configured: set IBKR_GATEWAY_URL',
      );
    }
    return baseUrl.replace(/\/$/, '');
  }

  private send(
    url: URL,
    method: HttpMethod,
    payload: string | undefined,
  ): Promise<{ status: number; text: string }> {
    const acceptsSelfSignedCertificate = LOOPBACK_HOSTS.has(url.hostname);
    const agent = new Agent({
      rejectUnauthorized: !acceptsSelfSignedCertificate,
    });

    return new Promise((resolve, reject) => {
      const req = httpsRequest(
        url,
        {
          method,
          agent,
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'blue-star',
            ...(payload === undefined
              ? {}
              : { 'Content-Length': Buffer.byteLength(payload) }),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () =>
            resolve({
              status: res.statusCode ?? 0,
              text: Buffer.concat(chunks).toString('utf8'),
            }),
          );
          res.on('error', reject);
        },
      );

      req.on('timeout', () =>
        req.destroy(
          new BrokerUnavailableError(
            `The IBKR gateway did not answer within ${REQUEST_TIMEOUT_MS} ms`,
          ),
        ),
      );
      req.on('error', (error: NodeJS.ErrnoException) =>
        reject(
          error.code === 'ECONNREFUSED'
            ? new BrokerUnavailableError(
                `The IBKR gateway is not running at ${url.origin}`,
              )
            : error,
        ),
      );

      if (payload !== undefined) {
        req.write(payload);
      }
      req.end();
    });
  }
}

function parseJson(text: string): unknown {
  if (text.trim() === '') {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(json: unknown): string | undefined {
  if (json && typeof json === 'object' && 'error' in json) {
    return String((json as { error: unknown }).error);
  }
  return undefined;
}
