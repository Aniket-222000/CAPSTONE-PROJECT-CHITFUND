import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import auditRoutes from './routes/auditRoutes';
import { connectDB } from './config/db';

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/audit', auditRoutes);

connectDB();
export default app;