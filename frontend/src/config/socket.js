import { io } from 'socket.io-client';
import { BACKEND_URL } from './api';

export const createAppSocket = () => io(BACKEND_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 500
});
