import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import { connectDB } from './config/db';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use('/api/users', userRoutes);
connectDB();
export default app;