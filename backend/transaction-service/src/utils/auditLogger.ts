import AuditLog from '../models/auditLog'; 

export function logActivity(
  activityType: string,
  details: string,
  userId: string,
  groupId: string
): void {
  const log = new AuditLog({ activityType, details, userId, groupId });
  log.save()
    .then(() => console.log(`Logged activity: ${activityType}`))
    .catch(err => console.error('AuditLog error:', err));
}