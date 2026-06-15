import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SeedService } from '../seed/seed.service';
import { JobUpdateEventDto } from '../jobs/dto/job.dto';

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(
  ',',
);

@WebSocketGateway({
  path: '/socket.io',
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
})
export class JobsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(JobsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly seedService: SeedService) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.query.token;
    const tokenStr = Array.isArray(token) ? token[0] : token;

    if (!tokenStr || typeof tokenStr !== 'string') {
      this.logger.log(
        JSON.stringify({ event: 'socket_rejected', reason: 'missing_token' }),
      );
      client.disconnect(true);
      return;
    }

    const userId = this.seedService.userIdForToken(tokenStr);
    if (!userId) {
      this.logger.log(
        JSON.stringify({ event: 'socket_rejected', reason: 'invalid_token' }),
      );
      client.disconnect(true);
      return;
    }

    void client.join(`user:${userId}`);
    this.logger.log(
      JSON.stringify({
        event: 'socket_connected',
        user_id: userId,
        sid: client.id,
      }),
    );
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(
      JSON.stringify({ event: 'socket_disconnected', sid: client.id }),
    );
  }

  emitJobUpdate(userId: string, payload: JobUpdateEventDto): void {
    this.server.to(`user:${userId}`).emit('job_update', payload);
  }
}
