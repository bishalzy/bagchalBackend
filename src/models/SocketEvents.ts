import { GameState } from './GameState.js';
import { Player } from './Player.js';

export interface ServerToClientEvents {
    'connected': (data: { playerId: string }) => void;
    'room-created': (data: { roomId: string }) => void;
    'room-joined': (data: { roomId: string, state: GameState, players: Player[] }) => void;
    'game-start': (data: { state: GameState, players: Player[] }) => void;
    'state-update': (data: { state: GameState, move: { from?: string, to: string } }) => void;
    'invalid-move': (data: { message: string, state?: GameState }) => void;
    'game-over': (data: { winner: string | null, state: GameState }) => void;
    'player-left': () => void;
    'player-disconnected': (data: { timeout: number }) => void;
    'rematch-started': (data: { state: GameState, players: Player[] }) => void;
    'room-destroyed': (data: { by: string }) => void;
    'room-destroyed-info': (data: { message: string }) => void;
    'error': (data: { code: string, message: string }) => void;
}

export interface ClientToServerEvents {
    'create-room': (data: { name: string, preferredSide: 'bakhra' | 'bagh' }, callback?: (res: any) => void) => void;
    'join-room': (data: { roomId: string, name: string }, callback?: (res: any) => void) => void;
    'make-move': (data: { from?: string, to: string }, callback?: (res: any) => void) => void;
    'rejoin-room': (data: { roomId: string, playerId: string }, callback?: (res: any) => void) => void;
    'play-again': () => void;
    'cancel-game': () => void;
    'leave-room': () => void;
}
