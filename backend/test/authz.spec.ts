import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

const ALICE_TOKEN = 'tok_alice_a1b2c3d4e5f6';
const BOB_TOKEN = 'tok_bob_b2c3d4e5f6a1';

describe('Authorization (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SEED_DATA_PATH = path.resolve(
      __dirname,
      '../../data/seed.json',
    );
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('user A cannot read user B job', async () => {
    const start = new Date(Date.now() + 2 * 3600_000);
    const end = new Date(start.getTime() + 3600_000);
    const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '.000Z');
    const body = {
      asset_id: 'asset-001',
      operation: 'charge',
      start_time: fmt(start),
      end_time: fmt(end),
    };

    const createRes = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${ALICE_TOKEN}`)
      .send(body)
      .expect(201);

    const jobId = createRes.body.id as string;

    await request(app.getHttpServer())
      .get(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${BOB_TOKEN}`)
      .expect(404);
  });
});
