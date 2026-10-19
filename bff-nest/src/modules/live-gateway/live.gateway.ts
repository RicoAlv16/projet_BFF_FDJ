import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/live',
})
export class LiveGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LiveGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly redisService: RedisService) {}

  /**
   * Initialisation de la passerelle et souscription au bus Redis Pub/Sub
   */
  async afterInit(server: Server) {
    this.logger.log(
      '⚡ [WEBSOCKET] Gateway Socket.IO initialisée sur le namespace /live',
    );

    // 1. Écoute du canal Redis des cotes en direct
    await this.redisService.subscribe('odds:channel', (message: string) => {
      try {
        const oddData = JSON.parse(message);
        const roomName = `match:${oddData.matchId}`;

        // Diffusion ciblée uniquement aux clients qui regardent ce match
        this.server.to(roomName).emit('odd_updated', oddData);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Erreur décodage cote match Pub/Sub: ${message}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    });

    // 2. Écoute du canal Redis des événements de match (But, VAR)
    await this.redisService.subscribe(
      'match-events:channel',
      (message: string) => {
        try {
          const eventData = JSON.parse(message);
          const roomName = `match:${eventData.matchId}`;

          this.logger.warn(
            `⚽ [WEBSOCKET] Émission événement match sur ${roomName}: ${eventData.eventType}`,
          );
          this.server.to(roomName).emit('match_event', eventData);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Erreur décodage événement match Pub/Sub: ${message}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      },
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`🟢 [CLIENT CONNECTÉ] ID: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔴 [CLIENT DÉCONNECTÉ] ID: ${client.id}`);
  }

  /**
   * Le client rejoint la room d'un match spécifique pour recevoir son flux en direct
   */
  @SubscribeMessage('join_match')
  handleJoinMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ) {
    const roomName = `match:${matchId}`;
    client.join(roomName);
    this.logger.log(`🏟️ Client ${client.id} a rejoint la room: ${roomName}`);

    client.emit('joined_match', {
      status: 'OK',
      room: roomName,
      message: `Connecté au flux direct du match ${matchId}`,
    });
  }

  /**
   * Le client quitte la room d'un match
   */
  @SubscribeMessage('leave_match')
  handleLeaveMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ) {
    const roomName = `match:${matchId}`;
    client.leave(roomName);
    this.logger.log(`🚪 Client ${client.id} a quitté la room: ${roomName}`);

    client.emit('left_match', {
      status: 'OK',
      room: roomName,
    });
  }
}
