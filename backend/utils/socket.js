import { Server } from 'socket.io';

let io = null;

const normalizeOrigin = (origin = '') => String(origin).trim().replace(/\/$/, '');

const configuredOrigins = [
  ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  process.env.FRONTEND_URL
]
  .filter(Boolean)
  .map(normalizeOrigin);

const staticAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

const allowedOrigins = new Set([...configuredOrigins, ...staticAllowedOrigins].map(normalizeOrigin));

const isAllowedDevLanOrigin = (origin = '') => {
  return /^http:\/\/(\d{1,3}\.){3}\d{1,3}:(3000|3001)$/i.test(normalizeOrigin(origin));
};

const socketOriginValidator = (origin, callback) => {
  const normalized = normalizeOrigin(origin || '');
  if (!origin || allowedOrigins.has(normalized) || isAllowedDevLanOrigin(normalized)) {
    callback(null, true);
    return;
  }
  callback(new Error('Not allowed by CORS'));
};

export const initSocket = (server) => {
  if (io) return io;
  io = new Server(server, {
    cors: {
      origin: socketOriginValidator,
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

    socket.on('joinRestaurantMenu', (restaurantId) => {
      if (restaurantId) socket.join(`restaurant_menu_${restaurantId}`);
    });

    socket.on('leaveRestaurantMenu', (restaurantId) => {
      if (restaurantId) socket.leave(`restaurant_menu_${restaurantId}`);
    });
  });

  return io;
};

export const getIO = () => io;
