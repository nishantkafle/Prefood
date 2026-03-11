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
import { initSocket } from './utils/socket.js';

const app = express();
const port = process.env.PORT || 4000

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
  origin: function(origin, callback) {
    const allowed = ['http://localhost:3000', 'http://localhost:3001'];
    if (!origin || allowed.includes(origin)) {
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

const startServer = async () => {
  await connectDB();
  const server = http.createServer(app);
  server.listen(port, ()=> console.log(`Server started on PORT: ${port}`));
  initSocket(server);
};

startServer();