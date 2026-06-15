import { Injectable } from '@nestjs/common';
import * as path from 'path';

@Injectable()
export class AppConfigService {
  readonly port = this.envNumber('PORT', 8000);
  readonly seedDataPath =
    process.env.SEED_DATA_PATH ??
    path.resolve(__dirname, '../../data/seed.json');
  readonly corsOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000'
  ).split(',');
  readonly transitionToRunningSeconds = this.envNumber(
    'TRANSITION_TO_RUNNING_SECONDS',
    1.0,
  );
  readonly transitionToTerminalSeconds = this.envNumber(
    'TRANSITION_TO_TERMINAL_SECONDS',
    1.0,
  );
  readonly faultAssetId = 'asset-fault';
  readonly faultErrorMessage = 'Simulated failure (asset-fault)';

  private envNumber(name: string, fallback: number): number {
    const value = process.env[name];
    return value !== undefined ? Number(value) : fallback;
  }
}
