import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  type: string;
  to: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp: Date;
  error?: string;
}

const NotificationSchema: Schema = new Schema({
  type: { type: String, required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['pending','sent','failed'], default: 'pending' },
  error: { type: String },
  timestamp: { type: Date, default: Date.now },
}, {
  collection: 'notifications',
  versionKey: false,
});

export default mongoose.model<INotification>('Notification', NotificationSchema);