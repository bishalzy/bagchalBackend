export interface Player {
    id: string;
    socketId: string;
    name: string;
    side: 'bakhra' | 'bagh';
    wantsRematch?: boolean;
}
