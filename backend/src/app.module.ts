import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { SeedModule } from './seed/seed.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    AppConfigModule,
    SeedModule,
    HealthModule,
    AuthModule,
    SocketModule,
    JobsModule,
  ],
})
export class AppModule {}
