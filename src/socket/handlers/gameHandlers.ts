import { Server, Socket } from 'socket.io';
import { RoomService, disconnectionTimeouts } from '../../rooms/RoomService.js';
import { logger } from '../../utils/logger.js';
import { RoomRepository } from '../../rooms/RoomRepository.js';
import { SocketSession } from '../index.js';

export const registerGameHandlers = (io: Server, socket: Socket, session: SocketSession) => {

    socket.on('make-move', async (data, callback) => {
        try {
            const mapping = await RoomRepository.getPlayerBySocket(socket.id);
            if (!mapping) {
                socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You are not in a room.' });
                return;
            }

            const { room, error } = await RoomService.handleMove(mapping.roomId, mapping.playerId, data.from, data.to);
            if (error) {
                const currentRoom = await RoomRepository.getRoom(mapping.roomId);
                socket.emit('invalid-move', { message: error, state: currentRoom?.gameState });
                if (callback) callback({ error });
                return;
            }

            io.to(room!.id).emit('state-update', { state: room!.gameState, move: { from: data.from, to: data.to } });

            if (room!.gameState.gameOver) {
                io.to(room!.id).emit('game-over', {
                    winner: room!.gameState.winner,
                    state: room!.gameState
                });
            }

            if (callback) callback({ success: true });
        } catch (err) {
            logger.error('Make move error:', err);
            socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to process move' });
        }
    });

    socket.on('play-again', async () => {
        try {
            const mapping = await RoomRepository.getPlayerBySocket(socket.id);
            if (!mapping) return;

            const { room, rematchStarted, error } = await RoomService.playAgain(mapping.roomId, mapping.playerId);
            if (error) {
                socket.emit('error', { code: error, message: error });
                return;
            }

            if (rematchStarted) {
                io.to(room!.id).emit('rematch-started', { state: room!.gameState, players: room!.players });
            }
        } catch (err) {
            logger.error('Play again error:', err);
        }
    });

    socket.on('cancel-game', async () => {
        try {
            const mapping = await RoomRepository.getPlayerBySocket(socket.id);
            if (!mapping) return;

            // Clear any pending disconnect timeouts for this room
            const timeouts = disconnectionTimeouts.get(mapping.roomId);
            if (timeouts) {
                for (const t of timeouts) clearTimeout(t);
                disconnectionTimeouts.delete(mapping.roomId);
            }

            await RoomService.destroyRoom(mapping.roomId);
            io.to(mapping.roomId).emit('room-destroyed', { by: socket.id });
            io.in(mapping.roomId).socketsLeave(mapping.roomId);
        } catch (err) {
            logger.error('Cancel game error:', err);
        }
    });

    socket.on('disconnect', async () => {
        try {
            const mapping = await RoomRepository.getPlayerBySocket(socket.id);
            const actualPlayerId = mapping ? mapping.playerId : session.playerId;

            const result = await RoomService.leaveRoom(socket.id);
            if (!result) return;

            const connectedPlayers = result.room
                ? result.room.players.filter((p: any) => p.socketId !== null)
                : [];

            if (connectedPlayers.length > 0) {
                // At least one player is still connected — notify them and set a timeout
                io.to(result.roomId).emit('player-disconnected', { timeout: 10 });
                logger.info(`Player ${actualPlayerId} left room ${result.roomId}, waiting 10s for reconnect`);

                const timeoutId = setTimeout(async () => {
                    const room = await RoomRepository.getRoom(result.roomId);
                    if (room && room.players.filter((p: any) => p.socketId !== null).length < 2) {
                        await RoomService.destroyRoom(result.roomId);
                        io.to(result.roomId).emit('room-destroyed-info', { message: 'Opponent failed to reconnect. Room closed.' });
                        io.in(result.roomId).socketsLeave(result.roomId);
                    }
                    // Clean up this specific timeout from the set
                    const set = disconnectionTimeouts.get(result.roomId);
                    if (set) {
                        set.delete(timeoutId);
                        if (set.size === 0) disconnectionTimeouts.delete(result.roomId);
                    }
                }, 10000);

                // Store timeout in a Set to handle multiple simultaneous disconnects
                if (!disconnectionTimeouts.has(result.roomId)) {
                    disconnectionTimeouts.set(result.roomId, new Set());
                }
                disconnectionTimeouts.get(result.roomId)!.add(timeoutId);
            } else {
                // No connected players remaining — room was already cleaned up by leaveRoom
                logger.info(`Player ${actualPlayerId} left room ${result.roomId}, no players remaining`);
            }
        } catch (err) {
            logger.error('Disconnect handling error:', err);
        }
    });
};

