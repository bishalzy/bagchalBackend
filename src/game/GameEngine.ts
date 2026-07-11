import { GameState } from '../models/GameState.js';
import { ADJ, POS, COLS, ROWS, MAX_BAKHRA, CAPTURE_TO_WIN } from './Rules.js';

export class GameEngine {
    
    static createInitialState(): GameState {
        return {
            baghs: ['a5', 'e5', 'a1', 'e1'],
            bakhras: [],
            turn: 'bakhra',
            bakhrasPlaced: 0,
            bakhrasCaptured: 0,
            gameOver: false,
            winner: null,
            moveHistory: []
        };
    }

    static isOccupied(state: GameState, pos: string): boolean {
        return state.baghs.includes(pos) || state.bakhras.includes(pos);
    }

    static getStepMoves(state: GameState, pos: string): { to: string, capture: string | null }[] {
        return ADJ[pos].filter(n => !this.isOccupied(state, n)).map(n => ({ to: n, capture: null }));
    }

    static getJumpMoves(state: GameState, pos: string): { to: string, capture: string | null }[] {
        const moves: { to: string, capture: string | null }[] = [];
        const from = POS[pos];
        for (const mid of ADJ[pos]) {
            if (!state.bakhras.includes(mid)) continue;
            const midP = POS[mid];
            const dc = midP.col - from.col;
            const dr = midP.row - from.row;
            const landCol = midP.col + dc;
            const landRow = midP.row + dr;
            if (landCol < 0 || landCol > 4 || landRow < 0 || landRow > 4) continue;
            const landKey = COLS[landCol] + ROWS[landRow];
            if (!this.isOccupied(state, landKey) && ADJ[mid].includes(landKey)) {
                moves.push({ to: landKey, capture: mid });
            }
        }
        return moves;
    }

    static getLegalMovesFor(state: GameState, pos: string): { to: string, capture: string | null }[] {
        if (state.baghs.includes(pos)) {
            return [...this.getStepMoves(state, pos), ...this.getJumpMoves(state, pos)];
        }
        if (state.bakhras.includes(pos)) {
            return this.getStepMoves(state, pos);
        }
        return [];
    }

    static checkWinConditions(state: GameState): GameState {
        const newState = { ...state };
        if (newState.bakhrasCaptured >= CAPTURE_TO_WIN) {
            newState.gameOver = true;
            newState.winner = 'bagh';
            return newState;
        }
        let allTrapped = true;
        for (const t of newState.baghs) {
            if (this.getLegalMovesFor(newState, t).length > 0) {
                allTrapped = false;
                break;
            }
        }
        if (allTrapped && newState.baghs.length > 0) {
            newState.gameOver = true;
            newState.winner = 'bakhra';
        }
        return newState;
    }

    static switchTurn(state: GameState): GameState {
        return {
            ...state,
            turn: state.turn === 'bakhra' ? 'bagh' : 'bakhra'
        };
    }

    static processMove(state: GameState, from: string | undefined, to: string): { state: GameState, error?: string } {
        if (state.gameOver) return { state, error: "GAME_ALREADY_FINISHED" };

        let newState = { ...state, baghs: [...state.baghs], bakhras: [...state.bakhras], moveHistory: [...(state.moveHistory || [])] };

        // Goat Placement
        if (state.turn === 'bakhra' && !from) {
            if (state.bakhrasPlaced >= MAX_BAKHRA) return { state, error: "ALL_GOATS_PLACED" };
            if (this.isOccupied(state, to)) return { state, error: "POSITION_OCCUPIED" };
            
            newState.bakhras.push(to);
            newState.bakhrasPlaced++;
            newState.moveHistory.push(`Goat placed at ${to}`);
        }
        // Piece Movement
        else if (from) {
            const isTiger = state.baghs.includes(from);
            const isGoat = state.bakhras.includes(from);

            if (!isTiger && !isGoat) return { state, error: "NO_PIECE_AT_POSITION" };
            if (state.turn === 'bagh' && !isTiger) return { state, error: "NOT_YOUR_TURN" };
            if (state.turn === 'bakhra' && !isGoat) return { state, error: "NOT_YOUR_TURN" };
            if (state.turn === 'bakhra' && state.bakhrasPlaced < MAX_BAKHRA) return { state, error: "MUST_PLACE_ALL_GOATS_FIRST" };

            const legalMoves = this.getLegalMovesFor(state, from);
            const move = legalMoves.find(m => m.to === to);

            if (!move) return { state, error: "INVALID_MOVE" };

            if (isTiger) {
                newState.baghs = newState.baghs.filter(b => b !== from);
                newState.baghs.push(to);
            } else {
                newState.bakhras = newState.bakhras.filter(b => b !== from);
                newState.bakhras.push(to);
            }

            if (move.capture) {
                newState.bakhras = newState.bakhras.filter(b => b !== move.capture);
                newState.bakhrasCaptured++;
            }

            if (isTiger) {
                newState.moveHistory.push(`Tiger moved ${from} -> ${to}${move.capture ? ` (Captured ${move.capture})` : ""}`);
            } else {
                newState.moveHistory.push(`Goat moved ${from} -> ${to}`);
            }
        } else {
             return { state, error: "INVALID_PAYLOAD" };
        }

        newState = this.switchTurn(newState);
        newState = this.checkWinConditions(newState);

        return { state: newState };
    }
}
