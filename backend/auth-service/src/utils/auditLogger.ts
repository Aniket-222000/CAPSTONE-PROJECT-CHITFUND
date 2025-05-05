// utils/auditLogger.ts
import axios from 'axios';

export async function logActivity(
  activityType: string,
  details: string,
  userId: string
): Promise<void> {
  // You could POST this to a new audit-service, or simply console.log/store in DB.
  console.log(`[AUDIT] ${activityType} — ${details} (by ${userId})`);
  // e.g. axios.post('http://audit-service/logs', { activityType, details, userId });
}
