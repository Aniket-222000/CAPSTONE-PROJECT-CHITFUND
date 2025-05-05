import { Router } from 'express';
import { sendEmailNotification } from '../controllers/notificationController';

const router = Router();
router.post('/notify/email', sendEmailNotification);
export default router;