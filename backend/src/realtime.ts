const { Server } = require('socket.io');

let io: any = null;

const initRealtime = (server: any) => {
  const allowedOrigins = String(process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : ['http://localhost:5173'],
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });
  io.on('connection', () => {
    // no-op; can log connections if needed
  });
  return io;
};

const getIO = () => io;

module.exports = { initRealtime, getIO };

