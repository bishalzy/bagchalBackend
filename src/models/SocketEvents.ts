export interface ServerToClientEvents {
    'connected': (data: { playerId: string }) => void;
    'room-created': (data: { roomId: string }) => void;
    'room-joined': (data: { roomId: string, state: any, players: any[] }) => void;
    'game-start': (data: { state: any, players: any[] }) => void;
    'state-update': (data: { state: any }) => void;
    'invalid-move': (data: { message: string }) => void;
    'game-over': (data: { winner: string, state: any }) => void;
    'player-left': () => void;
    'rematch-started': (data: { state: any, players: any[] }) => void;
    'room-destroyed': () => void;
    'error': (data: { code: string, message: string }) => void;
}

export interface ClientToServerEvents {
    'create-room': (data: { name: string, preferredSide: 'bakhra' | 'bagh' }, callback: (res: any) => void) => void;
    'join-room': (data: { roomId: string, name: string }, callback: (res: any) => void) => void;
    'make-move': (data: { from?: string, to: string }, callback: (res: any) => void) => void;
    'play-again': () => void;
    'cancel-game': () => void;
    'leave-room': () => void;
}
