import { Server, Socket } from 'socket.io';
import { RoomService } from '../../rooms/RoomService.js';
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

            const { room, error } = await RoomService.handleMove(mapping.roomId, playerId, data.from, data.to);
            if (error) {
                socket.emit('invalid-move', { message: error });
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

            const { room, rematchStarted, error } = await RoomService.playAgain(mapping.roomId, playerId);
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
            io.to(mapping.roomId).emit('room-destroyed');
            io.in(mapping.roomId).socketsLeave(mapping.roomId);
        } catch (err) {
            logger.error('Cancel game error:', err);
        }
    });

    socket.on('disconnect', async () => {
        try {
            const result = await RoomService.leaveRoom(socket.id);
            if (result) {
                io.to(result.roomId).emit('player-left');
                logger.info(`Player ${playerId} left room ${result.roomId}`);
            }
        } catch (err) {
            logger.error('Disconnect handling error:', err);
        }
    });
};
