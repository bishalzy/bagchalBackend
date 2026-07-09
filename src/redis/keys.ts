export const redisKeys = {
    room: (roomId: string) => `room:${roomId}`,
    playerSocket: (socketId: string) => `player:${socketId}`,
};
