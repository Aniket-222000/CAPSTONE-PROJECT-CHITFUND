import { Router } from 'express';
import { createLog, getLogs, getLogById } from '../controllers/auditController';

const router = Router();

router.post('/logs', createLog);
router.get('/logs', getLogs);
router.get('/logs/:id', getLogById);

export default router;