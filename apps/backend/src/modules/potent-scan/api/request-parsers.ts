import { BadRequestException } from '@nestjs/common';
import { Symbol } from '../../../shared/value-objects/symbol';

export function parseText(raw: unknown, field: string): string {
  if (typeof raw !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  return raw;
}

export function parseOptionalText(
  raw: unknown,
  field: string,
): string | undefined {
  return raw === undefined ? undefined : parseText(raw, field);
}

export function parseTicker(raw: unknown, field = 'ticker'): Symbol {
  try {
    return Symbol.of(parseText(raw, field));
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Invalid ticker',
    );
  }
}

export function parseTickers(raw: unknown, field: string): Symbol[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException(`${field} must be an array`);
  }
  return raw.map((ticker) => parseTicker(ticker, `${field} items`));
}
