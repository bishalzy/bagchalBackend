export interface Player {
    id: string;
    socketId: string | null;
    name: string;
    side: 'bakhra' | 'bagh';
    wantsRematch?: boolean;
}
