import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  activityType: string;
  details: string;
  userId: string;
  groupId?: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
  activityType: { type: String, required: true },
  details: { type: String, required: true },
  userId: { type: String, required: true },
  groupId: { type: String },
  timestamp: { type: Date, default: Date.now },
}, {
  collection: 'auditLogs',
  versionKey: false,
});

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);