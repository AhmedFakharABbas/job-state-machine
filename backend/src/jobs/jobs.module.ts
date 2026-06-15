import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeedModule } from '../seed/seed.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { JobValidationService } from './job-validation.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [AuthModule, SeedModule, forwardRef(() => StateMachineModule)],
  controllers: [JobsController],
  providers: [JobsService, JobValidationService],
  exports: [JobsService],
})
export class JobsModule {}
