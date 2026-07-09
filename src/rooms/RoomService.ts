import { Room } from '../models/Room.js';
import { RoomRepository } from './RoomRepository.js';
import { generateRoomCode } from '../utils/roomCode.js';
import { GameEngine } from '../game/GameEngine.js';

export class RoomService {
    static async createRoom(playerId: string, socketId: string): Promise<Room> {
        const roomId = generateRoomCode();
        const room: Room = {
            id: roomId,
            players: [{ id: playerId, socketId }],
            gameState: GameEngine.createInitialState(),
            status: 'waiting',
            createdAt: Date.now()
        };

        await RoomRepository.saveRoom(room);
        await RoomRepository.mapSocketToPlayer(socketId, playerId, roomId);

        return room;
    }

    static async joinRoom(roomId: string, playerId: string, socketId: string): Promise<{ room: Room | null, error?: string }> {
        const room = await RoomRepository.getRoom(roomId);
        
        if (!room) return { room: null, error: 'ROOM_NOT_FOUND' };
        if (room.players.length >= 2) return { room: null, error: 'ROOM_FULL' };
        if (room.players.some((p: any) => p.id === playerId)) return { room: null, error: 'ALREADY_IN_ROOM' };

        room.players.push({ id: playerId, socketId });
        room.status = 'playing';

        await RoomRepository.saveRoom(room);
        await RoomRepository.mapSocketToPlayer(socketId, playerId, roomId);

        return { room };
    }

    static async leaveRoom(socketId: string): Promise<{ roomId: string, room: Room } | null> {
        const mapping = await RoomRepository.getPlayerBySocket(socketId);
        if (!mapping) return null;

        const room = await RoomRepository.getRoom(mapping.roomId);
        if (room) {
            room.players = room.players.filter((p: any) => p.socketId !== socketId);
            
            if (room.players.length === 0) {
                await RoomRepository.deleteRoom(room.id);
            } else {
                room.status = 'finished'; // Other player wins/game aborts
                room.gameState.gameOver = true;
                // If the player who left was playing as Goat, Tiger wins, etc. For simplicity, just mark over.
                await RoomRepository.saveRoom(room);
            }
        }

        await RoomRepository.removeSocketMapping(socketId);
        return room ? { roomId: mapping.roomId, room } : null;
    }

    static async handleMove(roomId: string, playerId: string, from: string | undefined, to: string): Promise<{ room: Room | null, error?: string }> {
        const room = await RoomRepository.getRoom(roomId);
        if (!room) return { room: null, error: 'ROOM_NOT_FOUND' };
        if (room.status !== 'playing') return { room: null, error: 'GAME_NOT_IN_PROGRESS' };

        const playerIndex = room.players.findIndex((p: any) => p.id === playerId);
        if (playerIndex === -1) return { room: null, error: 'PLAYER_NOT_IN_ROOM' };

        // Player 0 is Goat (bakhra), Player 1 is Tiger (bagh) based on join order
        const expectedTurn = playerIndex === 0 ? 'bakhra' : 'bagh';
        if (room.gameState.turn !== expectedTurn) return { room: null, error: 'NOT_YOUR_TURN' };

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
    }
}
