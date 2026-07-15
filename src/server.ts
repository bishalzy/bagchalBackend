import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { initializeSocket } from './socket/index.js';
import { logger } from './utils/logger.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { publisher, subscriber } from './redis/client.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const isProduction = process.env.MODE === 'production';
if (isProduction && !process.env.ALLOWED_HOST) {
    console.warn('[WARN] ALLOWED_HOST not set in production — CORS will block all cross-origin requests.');
}

const io = new Server(server, {
    cors: {
        origin: isProduction ? (process.env.ALLOWED_HOST || false) : "*",
        methods: ['GET', 'POST'],
    },
    adapter: createAdapter(publisher, subscriber)
});

initializeSocket(io);

server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
