import AuditLog from '../models/auditLog';

export function logActivity(activityType: string, details: string, userId: string, groupId: string) {
  const log = new AuditLog({
    activityType,
    details,
    timestamp: new Date(),
    userId,
    groupId,
  });

  log.save()
    .then(() => console.log(`Activity logged: ${activityType}`))
    .catch(err => console.error(`Error logging activity: ${err}`));
}
