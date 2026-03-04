import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { createTestApp, MockCliService } from './utils/test-app';

describe('App (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let mockCliService: MockCliService;

  beforeAll(async () => {
    ({ app, module, mockCliService } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) should return 200', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/')
      .expect(200);
  });

  it('/api/health (GET) should return health status', async () => {
    const res = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/health')
      .expect(200);

    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('cli');
    expect(res.body.cli).toHaveProperty('gemini');
    expect(res.body.cli).toHaveProperty('claude');
  });

  it('/api/history (GET) should return empty array initially', async () => {
    const res = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/history')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('/api/generate (POST) should reject empty prompt', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/generate')
      .send({ prompt: '' })
      .expect(400);
  });

  it('/api/generate (POST) should reject missing prompt', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/generate')
      .send({})
      .expect(400);
  });
});
