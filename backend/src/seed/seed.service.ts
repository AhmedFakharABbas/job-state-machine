import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../config/app-config.service';
import bundledSeed from './seed.data.json';

interface SeedUser {
  user_id: string;
  name: string;
  token: string;
}

interface SeedAsset {
  asset_id: string;
}

interface SeedData {
  users: SeedUser[];
  assets: SeedAsset[];
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private tokenToUser = new Map<string, string>();
  private assetIds = new Set<string>();

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    const data = this.loadSeedData();
    for (const user of data.users) {
      this.tokenToUser.set(user.token, user.user_id);
    }
    for (const asset of data.assets) {
      this.assetIds.add(asset.asset_id);
    }
    this.logger.log(
      JSON.stringify({
        event: 'seed_loaded',
        users: this.tokenToUser.size,
        assets: this.assetIds.size,
      }),
    );
  }

  private loadSeedData(): SeedData {
    const fallbacks = [
      this.config.seedDataPath,
      path.resolve(__dirname, 'seed.data.json'),
      path.resolve(__dirname, '../../data/seed.json'),
    ];

    for (const seedPath of fallbacks) {
      try {
        if (fs.existsSync(seedPath)) {
          return JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as SeedData;
        }
      } catch {
        // try next path
      }
    }

    this.logger.warn(
      JSON.stringify({
        event: 'seed_fallback',
        message: 'Using bundled seed data',
      }),
    );
    return bundledSeed as SeedData;
  }

  userIdForToken(token: string): string | undefined {
    return this.tokenToUser.get(token);
  }

  assetExists(assetId: string): boolean {
    return this.assetIds.has(assetId);
  }
}
