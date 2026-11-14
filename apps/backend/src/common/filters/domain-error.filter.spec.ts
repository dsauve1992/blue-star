import type { Server } from 'http';
import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
  Logger,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthorizationError, DomainError, NotFoundError } from '../errors';
import { DomainErrorFilter } from './domain-error.filter';

class SomeDomainError extends DomainError {}

@Controller('throwing')
class ThrowingController {
  @Get('domain')
  domain(): never {
    throw new SomeDomainError('bad state');
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundError('missing');
  }

  @Get('forbidden')
  forbidden(): never {
    throw new AuthorizationError('nope');
  }

  @Get('http')
  http(): never {
    throw new BadRequestException('x');
  }

  @Get('unknown')
  unknown(): never {
    throw new Error('secret');
  }
}

describe('DomainErrorFilter', () => {
  let app: INestApplication;
  let loggerError: jest.SpyInstance;
  const server = () => app.getHttpServer() as Server;

  beforeEach(async () => {
    loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      controllers: [ThrowingController],
      providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    loggerError.mockRestore();
  });

  it('maps a plain DomainError to 400', async () => {
    const response = await request(server())
      .get('/throwing/domain')
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: 'bad state',
      error: 'Bad Request',
    });
  });

  it('maps NotFoundError to 404', async () => {
    const response = await request(server())
      .get('/throwing/not-found')
      .expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      message: 'missing',
      error: 'Not Found',
    });
  });

  it('maps AuthorizationError to 403', async () => {
    const response = await request(server())
      .get('/throwing/forbidden')
      .expect(403);

    expect(response.body).toEqual({
      statusCode: 403,
      message: 'nope',
      error: 'Forbidden',
    });
  });

  it('passes an HttpException through with its own status and body', async () => {
    const response = await request(server()).get('/throwing/http').expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: 'x',
      error: 'Bad Request',
    });
  });

  it('answers an unknown error with a generic JSON 500 and logs it', async () => {
    const response = await request(server())
      .get('/throwing/unknown')
      .expect(500);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(response.text).not.toContain('secret');
    expect(loggerError).toHaveBeenCalled();
  });
});
