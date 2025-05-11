import mongoose, { Schema, Document, CallbackError } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  PARTICIPANT = 'participant',
  ORGANIZER = 'organizer',
}

export interface IUser extends Document {
  userId: string;
  userName: string;
  userEmail: string;
  password: string;
  userMobileNum: string;
  userAddress: string;
  userRole: UserRole;
  groupIds: string[];
}

// Counter schema for auto-increment
const counterSchema = new Schema({ _id: String, seq: Number });
const Counter = mongoose.model('Counter', counterSchema);

const userSchema = new Schema<IUser>({
  userId: { type: String, unique: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true, select: false },
  userMobileNum: { type: String, required: true },
  userAddress: { type: String, required: true },
  userRole: { type: String, required: true, enum: Object.values(UserRole) },
  groupIds: { type: [String], default: [] },
}, {
  timestamps: true,
});

// Auto-increment userId
userSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.userId = 'user' + counter.seq;
    next();
  } catch (err) {
    next(err as CallbackError);
  }
});

export default mongoose.model<IUser>('User', userSchema);