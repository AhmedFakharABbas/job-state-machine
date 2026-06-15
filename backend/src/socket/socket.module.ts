import { Module } from '@nestjs/common';
import { SeedModule } from '../seed/seed.module';
import { JobsGateway } from './jobs.gateway';

@Module({
  imports: [SeedModule],
  providers: [JobsGateway],
  exports: [JobsGateway],
})
export class SocketModule {}
