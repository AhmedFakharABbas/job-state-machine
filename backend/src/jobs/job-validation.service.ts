import { Injectable } from '@nestjs/common';
import { SeedService } from '../seed/seed.service';
import { CreateJobDto } from './dto/create-job.dto';

const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|\+00:00)$/;

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 4 * 60 * 60 * 1000;

export class MalformedRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedRequestError';
  }
}

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

@Injectable()
export class JobValidationService {
  constructor(private readonly seedService: SeedService) {}

  validate(body: Record<string, unknown>): CreateJobDto {
    const required = ['asset_id', 'operation', 'start_time', 'end_time'] as const;
    for (const field of required) {
      if (!(field in body)) {
        throw new MalformedRequestError(`Missing required field: ${field}`);
      }
    }

    const assetId = body.asset_id;
    if (typeof assetId !== 'string' || !assetId) {
      throw new MalformedRequestError('asset_id must be a non-empty string');
    }
    if (!this.seedService.assetExists(assetId)) {
      throw new BusinessRuleError(`Unknown asset_id: ${assetId}`);
    }

    const operation = body.operation;
    if (typeof operation !== 'string' || !operation) {
      throw new MalformedRequestError('operation must be a non-empty string');
    }
    if (operation.length > 64) {
      throw new BusinessRuleError('operation must be at most 64 characters');
    }

    const startTime = this.parseIsoTimestamp(body.start_time, 'start_time');
    const endTime = this.parseIsoTimestamp(body.end_time, 'end_time');

    if (startTime >= endTime) {
      throw new BusinessRuleError('start_time must be before end_time');
    }

    if (startTime <= new Date()) {
      throw new BusinessRuleError('start_time must be in the future');
    }

    const duration = endTime.getTime() - startTime.getTime();
    if (duration < MIN_DURATION_MS) {
      throw new BusinessRuleError('Job duration must be at least 15 minutes');
    }
    if (duration > MAX_DURATION_MS) {
      throw new BusinessRuleError('Job duration must be at most 4 hours');
    }

    return {
      asset_id: assetId,
      operation,
      start_time: body.start_time as string,
      end_time: body.end_time as string,
    };
  }

  private parseIsoTimestamp(value: unknown, fieldName: string): Date {
    if (typeof value !== 'string') {
      throw new MalformedRequestError(`${fieldName} must be a string`);
    }
    if (!ISO_8601_PATTERN.test(value)) {
      throw new MalformedRequestError(
        `${fieldName} must be a valid ISO-8601 UTC timestamp`,
      );
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new MalformedRequestError(
        `${fieldName} must be a valid ISO-8601 UTC timestamp`,
      );
    }
    return date;
  }
}
