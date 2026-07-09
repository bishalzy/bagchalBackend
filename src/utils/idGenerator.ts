import { v4 as uuidv4 } from 'uuid';

export const generatePlayerId = (): string => {
    return `player_${uuidv4().substring(0, 8)}`;
};
