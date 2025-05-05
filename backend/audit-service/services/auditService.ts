import AuditLog, { IAuditLog } from '../models/auditLog';

export default class AuditService {
  async createLog(
    activityType: string,
    details: string,
    userId: string,
    groupId?: string
  ): Promise<IAuditLog> {
    const log = new AuditLog({ activityType, details, userId, groupId });
    return log.save();
  }

  async getLogs(filter: any = {}): Promise<IAuditLog[]> {
    return AuditLog.find(filter).sort({ timestamp: -1 });
  }

  async getLogById(id: string): Promise<IAuditLog | null> {
    return AuditLog.findById(id);
  }
}