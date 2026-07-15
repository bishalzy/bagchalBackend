export interface GameState {
    baghs: string[];
    bakhras: string[];
    turn: 'bakhra' | 'bagh';
    bakhrasPlaced: number;
    bakhrasCaptured: number;
    gameOver: boolean;
    winner: 'bakhra' | 'bagh' | null;
    moveHistory: string[];
    lastMove: { from?: string | null, to: string } | null;
}
