import { Request, Response } from 'express';
import NotificationService from '../services/notificationService';

const service = new NotificationService();

export const sendEmailNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
       res.status(400).json({ message: 'Missing to, subject or body' });
    }
    const result = await service.sendEmail(to, subject, body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error sending notification' });
  }
};