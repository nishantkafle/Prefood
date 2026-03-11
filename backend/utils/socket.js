import { Server } from 'socket.io';

let io = null;

export const initSocket = (server) => {
  if (io) return io;
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // optional: client can join rooms for order updates
    socket.on('joinOrder', (orderId) => {
      if (orderId) socket.join(`order_${orderId}`);
    });
    socket.on('leaveOrder', (orderId) => {
      if (orderId) socket.leave(`order_${orderId}`);
    });

    socket.on('joinUser', (userId) => {
      if (userId) socket.join(`user_${userId}`);
    });

    socket.on('leaveUser', (userId) => {
      if (userId) socket.leave(`user_${userId}`);
    });
  });

  return io;
};

export const getIO = () => io;
