import mongoose, { Schema, Document } from 'mongoose';

interface IAuditLog extends Document {
    activityType: string;
    details: string;
    timestamp: Date;
    userId: string;  // User who performed the action
    groupId: string; // Group where action occurred
}

const auditLogSchema: Schema<IAuditLog> = new Schema({
    activityType: { type: String, required: true },
    details: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    userId: { type: String, required: true },
    groupId: { type: String, required: true }
}, {
    collection: 'auditLogs',
    versionKey: false,
    timestamps: true
});

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
