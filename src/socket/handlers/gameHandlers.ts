import { Server, Socket } from 'socket.io';
import { RoomService, disconnectionTimeouts } from '../../rooms/RoomService.js';
import { logger } from '../../utils/logger.js';
import { RoomRepository } from '../../rooms/RoomRepository.js';

export const registerGameHandlers = (io: Server, socket: Socket, playerId: string) => {

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
            const actualPlayerId = mapping ? mapping.playerId : playerId;

            const result = await RoomService.leaveRoom(socket.id);
            if (result) {
                if (result.room && result.room.players.length > 0) {
                    io.to(result.roomId).emit('player-disconnected', { timeout: 10 });
                    logger.info(`Player ${actualPlayerId} left room ${result.roomId}, waiting 10s for reconnect`);

                    const timeoutId = setTimeout(async () => {
                        const room = await RoomRepository.getRoom(result.roomId);
                        if (room && room.players.filter((p: any) => p.socketId !== null).length < 2) {
                            await RoomService.destroyRoom(result.roomId);
                            io.to(result.roomId).emit('room-destroyed-info', { message: 'Opponent failed to reconnect. Room closed.' });
                            io.in(result.roomId).socketsLeave(result.roomId);
                        }
                        disconnectionTimeouts.delete(result.roomId);
                    }, 10000);

                    disconnectionTimeouts.set(result.roomId, timeoutId);
                } else {
                    io.to(result.roomId).emit('player-left');
                    logger.info(`Player ${actualPlayerId} left room ${result.roomId}`);
                }
            }
        } catch (err) {
            logger.error('Disconnect handling error:', err);
        }
    });
};
