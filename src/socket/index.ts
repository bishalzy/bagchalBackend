import { Server, Socket } from 'socket.io';
import { generatePlayerId } from '../utils/idGenerator.js';
import { registerRoomHandlers } from './handlers/roomHandlers.js';
import { registerGameHandlers } from './handlers/gameHandlers.js';
import { logger } from '../utils/logger.js';
import { ClientToServerEvents, ServerToClientEvents } from '../models/SocketEvents.js';

export interface SocketSession {
    playerId: string;
}

export const initializeSocket = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    io.on('connection', (socket: Socket) => {
        const session: SocketSession = { playerId: generatePlayerId() };
        logger.info(`New connection: Socket ${socket.id} assigned Player ${session.playerId}`);
        
        socket.emit('connected', { playerId: session.playerId });

        registerRoomHandlers(io as any, socket, session);
        registerGameHandlers(io as any, socket, session);
    });
};
