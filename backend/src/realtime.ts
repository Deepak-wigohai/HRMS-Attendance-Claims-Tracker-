const { Server } = require('socket.io');

let io: any = null;

const initRealtime = (server: any) => {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  io.on('connection', () => {
    // no-op; can log connections if needed
  });
  return io;
};

const getIO = () => io;

module.exports = { initRealtime, getIO };


