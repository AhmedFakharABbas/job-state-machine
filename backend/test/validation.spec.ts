import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';
import { AppConfigModule } from '../src/config/app-config.module';
import { SeedModule } from '../src/seed/seed.module';
import { SeedService } from '../src/seed/seed.service';
import {
  BusinessRuleError,
  JobValidationService,
} from '../src/jobs/job-validation.service';

const SEED_PATH = path.resolve(__dirname, '../../data/seed.json');

function futureWindow(minutesAhead = 60, durationMinutes = 60) {
  const start = new Date(Date.now() + minutesAhead * 60_000);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '.000Z');
  return {
    asset_id: 'asset-001',
    operation: 'charge',
    start_time: fmt(start),
    end_time: fmt(end),
  };
}

describe('JobValidationService', () => {
  let validationService: JobValidationService;

  beforeAll(async () => {
    process.env.SEED_DATA_PATH = SEED_PATH;
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule, SeedModule],
      providers: [JobValidationService],
    }).compile();
    await module.init();
    validationService = module.get(JobValidationService);
  });

  it('rejects start_time in the past with 422', () => {
    const past = new Date(Date.now() - 2 * 3600_000);
    const end = new Date(past.getTime() + 3600_000);
    const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '.000Z');
    expect(() =>
      validationService.validate({
        asset_id: 'asset-001',
        operation: 'charge',
        start_time: fmt(past),
        end_time: fmt(end),
      }),
    ).toThrow(BusinessRuleError);
  });

  it('rejects unknown asset_id with 422', () => {
    const body = futureWindow();
    body.asset_id = 'asset-does-not-exist';
    expect(() => validationService.validate(body)).toThrow(BusinessRuleError);
  });

  it('rejects duration under 15 minutes with 422', () => {
    const body = futureWindow(60, 5);
    expect(() => validationService.validate(body)).toThrow(BusinessRuleError);
  });
});
