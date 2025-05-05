import UserAuditLog from '../models/auditLog';

export function logActivity(
  activityType: string,
  details: string,
  userId: string,
  groupId?: string
): void {
  const log = new UserAuditLog({ activityType, details, userId, groupId });
  log.save().catch(err => console.error('UserAuditLog error:', err));
}