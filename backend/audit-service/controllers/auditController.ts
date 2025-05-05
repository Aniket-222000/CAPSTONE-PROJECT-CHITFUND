import { Request, Response } from 'express';
import AuditService from '../services/auditService';

const auditService = new AuditService();

export const createLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { activityType, details, userId, groupId } = req.body;
    const log = await auditService.createLog(activityType, details, userId, groupId);
    res.status(201).json(log);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error creating log' });
  }
};

export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = req.query || {};
    const logs = await auditService.getLogs(filter);
    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching logs' });
  }
};

export const getLogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const log = await auditService.getLogById(req.params.id);
    if (!log)  res.status(404).json({ message: 'Log not found' });
    res.status(200).json(log);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching log' });
  }
};