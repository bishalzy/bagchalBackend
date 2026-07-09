import { Server, Socket } from 'socket.io';
import { RoomService } from '../../rooms/RoomService.js';
import { logger } from '../../utils/logger.js';

export const registerRoomHandlers = (io: Server, socket: Socket, playerId: string) => {
    
    socket.on('create-room', async (callback) => {
        try {
            const room = await RoomService.createRoom(playerId, socket.id);
            socket.join(room.id);
            socket.emit('room-created', { roomId: room.id });
            logger.info(`Player ${playerId} created room ${room.id}`);
            if (callback) callback({ success: true, roomId: room.id });
        } catch (err) {
            logger.error('Create room error:', err);
            socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to create room' });
            if (callback) callback({ error: 'SERVER_ERROR' });
        }
    });

    socket.on('join-room', async (roomId, callback) => {
        try {
            roomId = roomId.toUpperCase();
            const { room, error } = await RoomService.joinRoom(roomId, playerId, socket.id);
            if (error) {
                socket.emit('error', { code: error, message: error });
                if (callback) callback({ error });
                return;
            }

            socket.join(roomId);
            socket.emit('room-joined', { roomId, state: room!.gameState });
            
            io.to(roomId).emit('game-start', { state: room!.gameState });
            logger.info(`Player ${playerId} joined room ${roomId}`);
            if (callback) callback({ success: true, roomId });
        } catch (err) {
            logger.error('Join room error:', err);
            socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join room' });
            if (callback) callback({ error: 'SERVER_ERROR' });
        }
    });

};
