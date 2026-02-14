import express from "express";
import cors from "cors";
import 'dotenv/config';
import cookieParser from "cookie-parser";

import connectDB from './config/mongodb.js'
import authRouter from './routes/authRoutes.js'
import menuRouter from './routes/menuRoutes.js'
import orderRouter from './routes/orderRoutes.js'
const app = express();
const port = process.env.PORT || 4000
connectDB();

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))

//Api Endpoints 
app.get('/', (req, res)=> res.send("API Working fine "));
app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', orderRouter);

app.listen(port, ()=> console.log(`Server started on PORT: ${port}`)); 