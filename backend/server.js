import express from "express";
import cors from "cors";
import 'dotenv/config';
import cookieParser from "cookie-parser";
import http from 'http';

import connectDB from './config/mongodb.js'
import authRouter from './routes/authRoutes.js'
import menuRouter from './routes/menuRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import chatRouter from './routes/chatRoutes.js'
import notificationRouter from './routes/notificationRoutes.js'
import esewaRouter from './routes/esewaRoutes.js'
import { initSocket } from './utils/socket.js';

const app = express();
const port = process.env.PORT || 4000

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: function(origin, callback) {
    const normalized = normalizeOrigin(origin || '');
    if (!origin || allowedOrigins.has(normalized) || isAllowedDevLanOrigin(normalized)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}))

//Api Endpoints 
app.get('/', (req, res)=> res.send("API Working fine "));
app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', orderRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/esewa', esewaRouter);

const startServer = async () => {
  await connectDB();
  const server = http.createServer(app);
  server.listen(port, ()=> console.log(`Server started on PORT: ${port}`));
  initSocket(server);
}; 

startServer();