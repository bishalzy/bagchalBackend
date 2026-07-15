import { Server, Socket } from 'socket.io';
import { RoomService, disconnectionTimeouts } from '../../rooms/RoomService.js';
import { logger } from '../../utils/logger.js';
import { SocketSession } from '../index.js';

export const registerRoomHandlers = (io: Server, socket: Socket, session: SocketSession) => {
    
    socket.on('create-room', async (data: { name: string, preferredSide: 'bakhra' | 'bagh' }, callback) => {
        try {
            const room = await RoomService.createRoom(session.playerId, socket.id, data.name, data.preferredSide);
            socket.join(room.id);
            socket.emit('room-created', { roomId: room.id });
            logger.info(`Player ${session.playerId} created room ${room.id} as ${data.preferredSide}`);
            if (callback) callback({ success: true, roomId: room.id });
        } catch (err) {
            logger.error('Create room error:', err);
            socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to create room' });
            if (callback) callback({ error: 'SERVER_ERROR' });
        }
    });

    socket.on('join-room', async (data: { roomId: string, name: string }, callback) => {
        try {
            const roomId = data.roomId.toUpperCase();
            const { room, error } = await RoomService.joinRoom(roomId, session.playerId, socket.id, data.name);
            if (error) {
                socket.emit('error', { code: error, message: error });
                if (callback) callback({ error });
                return;
            }

            socket.join(roomId);
            
            const joinTimeouts = disconnectionTimeouts.get(roomId);
            if (joinTimeouts) {
                for (const t of joinTimeouts) clearTimeout(t);
                disconnectionTimeouts.delete(roomId);
            }
            
            socket.emit('room-joined', { roomId, state: room!.gameState, players: room!.players });
            
            // Notify OTHER sockets only — the joining socket already got room-joined
            socket.to(roomId).emit('game-start', { state: room!.gameState, players: room!.players });
            logger.info(`Player ${session.playerId} joined room ${roomId}`);
            if (callback) callback({ success: true, roomId });
        } catch (err) {
            logger.error('Join room error:', err);
            socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join room' });
            if (callback) callback({ error: 'SERVER_ERROR' });
        }
    });

    socket.on('rejoin-room', async (data: { roomId: string, playerId: string }, callback) => {
        try {
            const roomId = data.roomId.toUpperCase();
            // Update session with the client's original playerId
            session.playerId = data.playerId;

            const { room, error } = await RoomService.rejoinRoom(roomId, data.playerId, socket.id);
            if (error) {
                socket.emit('error', { code: error, message: error });
                if (callback) callback({ error });
                return;
            }

            socket.join(roomId);
            
            const rejoinTimeouts = disconnectionTimeouts.get(roomId);
            if (rejoinTimeouts) {
                for (const t of rejoinTimeouts) clearTimeout(t);
                disconnectionTimeouts.delete(roomId);
            }
            
            socket.emit('room-joined', { roomId, state: room!.gameState, players: room!.players });
            // Notify OTHER sockets only — the rejoining socket already got room-joined
            socket.to(roomId).emit('game-start', { state: room!.gameState, players: room!.players });
            logger.info(`Player ${data.playerId} rejoined room ${roomId}`);
            if (callback) callback({ success: true, roomId });
        } catch (err) {
            logger.error('Rejoin room error:', err);
            socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to rejoin room' });
            if (callback) callback({ error: 'SERVER_ERROR' });
        }
    });

};
