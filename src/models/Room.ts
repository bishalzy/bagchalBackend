import { Player } from './Player.js';
import { GameState } from './GameState.js';

export interface Room {
    id: string;
    players: Player[];
    gameState: GameState;
    status: 'waiting' | 'playing' | 'finished';
    createdAt: number;
}
