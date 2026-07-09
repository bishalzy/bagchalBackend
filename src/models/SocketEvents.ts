export interface ServerToClientEvents {
    'connected': (data: { playerId: string }) => void;
    'room-created': (data: { roomId: string }) => void;
    'room-joined': (data: { roomId: string, state: any }) => void;
    'game-start': (data: { state: any }) => void;
    'state-update': (data: { state: any }) => void;
    'invalid-move': (data: { message: string }) => void;
    'game-over': (data: { winner: string, state: any }) => void;
    'player-left': () => void;
    'error': (data: { code: string, message: string }) => void;
}

export interface ClientToServerEvents {
    'create-room': (callback: (res: any) => void) => void;
    'join-room': (roomId: string, callback: (res: any) => void) => void;
    'make-move': (data: { from?: string, to: string }, callback: (res: any) => void) => void;
    'leave-room': () => void;
}
