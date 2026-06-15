import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { JobsService } from '../src/jobs/jobs.service';

const ALICE_TOKEN = 'tok_alice_a1b2c3d4e5f6';

describe('State machine (e2e)', () => {
  let app: INestApplication;
  let jobsService: JobsService;

  beforeAll(async () => {
    process.env.SEED_DATA_PATH = path.resolve(
      __dirname,
      '../../data/seed.json',
    );
    process.env.TRANSITION_TO_RUNNING_SECONDS = '0.3';
    process.env.TRANSITION_TO_TERMINAL_SECONDS = '0.3';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    jobsService = app.get(JobsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('submitted job reaches COMPLETED within ~3 seconds', async () => {
    const start = new Date(Date.now() + 2 * 3600_000);
    const end = new Date(start.getTime() + 3600_000);
    const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '.000Z');
    const body = {
      asset_id: 'asset-002',
      operation: 'discharge',
      start_time: fmt(start),
      end_time: fmt(end),
    };

    const createRes = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${ALICE_TOKEN}`)
      .send(body)
      .expect(201);

    const jobId = createRes.body.id as string;
    const deadline = Date.now() + 3000;

    while (Date.now() < deadline) {
      const job = jobsService.findById(jobId);
      if (job?.state === 'COMPLETED') {
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    const job = jobsService.findById(jobId);
    expect(job?.state).toBe('COMPLETED');
  });
});
