import { Module, forwardRef } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { SocketModule } from '../socket/socket.module';
import { StateMachineService } from './state-machine.service';

@Module({
  imports: [forwardRef(() => JobsModule), SocketModule],
  providers: [StateMachineService],
  exports: [StateMachineService],
})
export class StateMachineModule {}
