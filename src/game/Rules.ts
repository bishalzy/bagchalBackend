export const COLS = ['a', 'b', 'c', 'd', 'e'];
export const ROWS = ['1', '2', '3', '4', '5'];

export const ALL_POS: string[] = [];
export const POS: Record<string, { col: number, row: number }> = {};

for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
        const key = COLS[c] + ROWS[r];
        ALL_POS.push(key);
        POS[key] = { col: c, row: r };
    }
}

export const ADJ: Record<string, string[]> = {};
ALL_POS.forEach(k => ADJ[k] = []);

function addEdge(a: string, b: string) {
    if (!ADJ[a].includes(b)) ADJ[a].push(b);
    if (!ADJ[b].includes(a)) ADJ[b].push(a);
}

// Horizontal
for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
        addEdge(COLS[c] + ROWS[r], COLS[c + 1] + ROWS[r]);
    }
}
// Vertical
for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 4; r++) {
        addEdge(COLS[c] + ROWS[r], COLS[c] + ROWS[r + 1]);
    }
}
// Diagonals
['a5', 'b4', 'c3', 'd2', 'e1'].reduce((prev, cur) => { addEdge(prev, cur); return cur; });
['e5', 'd4', 'c3', 'b2', 'a1'].reduce((prev, cur) => { addEdge(prev, cur); return cur; });
['c5', 'd4', 'e3', 'd2', 'c1', 'b2', 'a3', 'b4', 'c5'].reduce((prev, cur) => { addEdge(prev, cur); return cur; });

export const MAX_BAKHRA = 20;
export const CAPTURE_TO_WIN = 5;
