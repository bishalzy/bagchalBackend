import { Room } from '../models/Room.js';
import { RoomRepository } from './RoomRepository.js';
import { generateRoomCode } from '../utils/roomCode.js';
import { GameEngine } from '../game/GameEngine.js';
import { redlock } from '../redis/client.js';

export const disconnectionTimeouts = new Map<string, NodeJS.Timeout>();

export class RoomService {
    static async createRoom(playerId: string, socketId: string, name: string, preferredSide: 'bakhra' | 'bagh'): Promise<Room> {
        const roomId = generateRoomCode();
        const room: Room = {
            id: roomId,
            players: [{ id: playerId, socketId, name, side: preferredSide, wantsRematch: false }],
            gameState: GameEngine.createInitialState(),
            status: 'waiting',
            createdAt: Date.now()
        };

        await RoomRepository.saveRoom(room);
        await RoomRepository.mapSocketToPlayer(socketId, playerId, roomId);

        return room;
    }

    static async joinRoom(roomId: string, playerId: string, socketId: string, name: string): Promise<{ room: Room | null, error?: string }> {
        const room = await RoomRepository.getRoom(roomId);
        
        if (!room) return { room: null, error: 'ROOM_NOT_FOUND' };
        if (room.players.length >= 2) return { room: null, error: 'ROOM_FULL' };
        if (room.players.some(p => p.id === playerId)) return { room: null, error: 'ALREADY_IN_ROOM' };

        const creatorSide = room.players[0].side;
        const joinerSide = creatorSide === 'bakhra' ? 'bagh' : 'bakhra';

        room.players.push({ id: playerId, socketId, name, side: joinerSide, wantsRematch: false });
        room.status = 'playing';

        await RoomRepository.saveRoom(room);
        await RoomRepository.mapSocketToPlayer(socketId, playerId, roomId);

        return { room };
    }

    static async rejoinRoom(roomId: string, playerId: string, newSocketId: string): Promise<{ room: Room | null, error?: string }> {
        const room = await RoomRepository.getRoom(roomId);
        if (!room) return { room: null, error: 'ROOM_NOT_FOUND' };

        const player = room.players.find((p: any) => p.id === playerId);
        if (!player) return { room: null, error: 'PLAYER_NOT_IN_ROOM' };

        player.socketId = newSocketId;
        
        // If both players are present, resume game
        if (room.players.length === 2 && room.players.every((p: any) => p.socketId !== null)) {
            room.status = 'playing';
        }

        await RoomRepository.saveRoom(room);
        await RoomRepository.mapSocketToPlayer(newSocketId, playerId, roomId);

        return { room };
    }

    static async leaveRoom(socketId: string): Promise<{ roomId: string, room: Room } | null> {
        const mapping = await RoomRepository.getPlayerBySocket(socketId);
        if (!mapping) return null;

        const room = await RoomRepository.getRoom(mapping.roomId);
        if (room) {
            const player = room.players.find((p: any) => p.socketId === socketId);
            if (player) {
                player.socketId = null; // Mark as disconnected
            }
            
            const connectedPlayers = room.players.filter((p: any) => p.socketId !== null);
            
            if (connectedPlayers.length === 0) {
                await RoomRepository.deleteRoom(room.id);
            } else {
                room.status = 'waiting'; 
                await RoomRepository.saveRoom(room);
            }
        }

        await RoomRepository.removeSocketMapping(socketId);
        return room ? { roomId: mapping.roomId, room } : null;
    }

    static async handleMove(roomId: string, playerId: string, from: string | undefined, to: string): Promise<{ room: Room | null, error?: string }> {
        const lockKey = `locks:room:${roomId}`;
        let lock;
        try {
            lock = await redlock.acquire([lockKey], 5000);

            const room = await RoomRepository.getRoom(roomId);
            if (!room) return { room: null, error: 'ROOM_NOT_FOUND' };
            if (room.status !== 'playing') return { room: null, error: 'GAME_NOT_IN_PROGRESS' };

            const player = room.players.find((p: any) => p.id === playerId);
            if (!player) return { room: null, error: 'PLAYER_NOT_IN_ROOM' };

            if (room.gameState.turn !== player.side) return { room: null, error: 'NOT_YOUR_TURN' };

            const { state, error } = GameEngine.processMove(room.gameState, from, to);
            
            if (error) {
                return { room: null, error };
            }

            room.gameState = state;
            if (state.gameOver) {
                room.status = 'finished';
            }

            await RoomRepository.saveRoom(room);
            return { room };
        } catch (err: any) {
            return { room: null, error: err.message === 'The operation was unable to achieve a quorum during its retry window.' ? 'CONCURRENT_MOVE_REJECTED' : 'SERVER_ERROR' };
        } finally {
            if (lock) {
                await lock.release().catch(console.error);
            }
        }
    }

    static async playAgain(roomId: string, playerId: string): Promise<{ room: Room | null, rematchStarted: boolean, error?: string }> {
        const room = await RoomRepository.getRoom(roomId);
        if (!room) return { room: null, rematchStarted: false, error: 'ROOM_NOT_FOUND' };
        if (room.status !== 'finished') return { room: null, rematchStarted: false, error: 'GAME_NOT_FINISHED' };

        const player = room.players.find((p: any) => p.id === playerId);
        if (!player) return { room: null, rematchStarted: false, error: 'PLAYER_NOT_IN_ROOM' };

        player.wantsRematch = true;
        let rematchStarted = false;

        if (room.players.every((p: any) => p.wantsRematch)) {
            // Swap sides
            room.players[0].side = room.players[0].side === 'bakhra' ? 'bagh' : 'bakhra';
            room.players[1].side = room.players[1].side === 'bakhra' ? 'bagh' : 'bakhra';
            
            // Reset state
            room.gameState = GameEngine.createInitialState();
            room.players.forEach((p: any) => p.wantsRematch = false);
            room.status = 'playing';
            rematchStarted = true;
        }

        await RoomRepository.saveRoom(room);
        return { room, rematchStarted };
    }

    static async destroyRoom(roomId: string): Promise<void> {
        const room = await RoomRepository.getRoom(roomId);
        if (room) {
            for (const p of room.players) {
                if (p.socketId) {
                    await RoomRepository.removeSocketMapping(p.socketId);
                }
            }
            await RoomRepository.deleteRoom(roomId);
        }
    }
}
