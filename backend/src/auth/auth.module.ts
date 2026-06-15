import { Module } from '@nestjs/common';
import { SeedModule } from '../seed/seed.module';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [SeedModule],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
