import { redis } from '../redis/client.js';
import { redisKeys } from '../redis/keys.js';
import { Room } from '../models/Room.js';

const ROOM_TTL = 3600; // 1 hour

export class RoomRepository {
    static async saveRoom(room: Room): Promise<void> {
        const key = redisKeys.room(room.id);
        await redis.set(key, JSON.stringify(room), 'EX', ROOM_TTL);
    }

    static async getRoom(roomId: string): Promise<Room | null> {
        const key = redisKeys.room(roomId);
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    static async deleteRoom(roomId: string): Promise<void> {
        const key = redisKeys.room(roomId);
        await redis.del(key);
    }

    static async mapSocketToPlayer(socketId: string, playerId: string, roomId: string): Promise<void> {
        const key = redisKeys.playerSocket(socketId);
        await redis.set(key, JSON.stringify({ playerId, roomId }), 'EX', ROOM_TTL);
    }

    static async getPlayerBySocket(socketId: string): Promise<{ playerId: string, roomId: string } | null> {
        const key = redisKeys.playerSocket(socketId);
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    static async removeSocketMapping(socketId: string): Promise<void> {
        const key = redisKeys.playerSocket(socketId);
        await redis.del(key);
    }
}
