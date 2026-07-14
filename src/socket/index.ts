import { Server, Socket } from 'socket.io';
import { generatePlayerId } from '../utils/idGenerator.js';
import { registerRoomHandlers } from './handlers/roomHandlers.js';
import { registerGameHandlers } from './handlers/gameHandlers.js';
import { logger } from '../utils/logger.js';
import { ClientToServerEvents, ServerToClientEvents } from '../models/SocketEvents.js';

export const initializeSocket = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    io.on('connection', (socket: Socket) => {
        let playerId = generatePlayerId();
        logger.info(`New connection: Socket ${socket.id} assigned Player ${playerId}`);
        
        socket.emit('connected', { playerId });

        // Allow playerId to be updated on rejoin
        socket.on('rejoin-room', (data: any) => {
            playerId = data.playerId;
        });

        registerRoomHandlers(io as any, socket, playerId);
        registerGameHandlers(io as any, socket, playerId);
    });
};
