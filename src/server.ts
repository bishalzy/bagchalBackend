import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { initializeSocket } from './socket/index.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.MODE === 'production' ? process.env.ALLOWED_HOST || "*" : "*",
        methods: ['GET', 'POST'],
    }
});

initializeSocket(io);

server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
