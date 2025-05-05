// models/groups.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  groupId: string;
  groupName: string;
  groupType: string;
  interest: number;
  organizerId: string;
  members: number;
  duration: number;
  totalAmount: number;
  ticketValue: number;
  participants: string[];
  joinRequests: string[];
  monthlyDraw: string[];
  description: string;

  // New fields for chit-fund features
  penalties: Array<{ userId: string; penalty: number }>;
  lateralRequests: string[];
  bids: Array<{ userId: string; bidAmount: number; month: number; timestamp: Date }>;
  contributions: Array<{ userId: string; month: number | 'backdated'; amount: number; timestamp: Date }>;
  warnings: Array<{ userId: string; month?: number; count: number }>;
  lateralMembers: Array<{ userId: string; paidBackdated: boolean }>;
  organizerCompensations: Array<{ month: number; amount: number; timestamp: Date }>;
  bidAdjustments: Array<{ month: number; oldAmount: number; newAmount: number; timestamp: Date }>;

  createdAt: Date;
  updatedAt: Date;
}

const groupSchema: Schema<IGroup> = new Schema(
  {
    groupId: { type: String, required: true, unique: true },
    groupName: { type: String, required: true, unique: true },
    groupType: { type: String, required: true },
    interest: { type: Number, required: true },
    organizerId: { type: String, required: true },
    members: { type: Number, required: true },
    duration: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    ticketValue: { type: Number, required: true },
    participants: { type: [String], default: [] },
    joinRequests: { type: [String], default: [] },
    monthlyDraw: { type: [String], default: [] },
    description: { type: String, required: true },

    // Penalty tracking
    penalties: [
      {
        userId: { type: String, required: true },
        penalty: { type: Number, required: true },
      },
    ],

    // Lateral member requests
    lateralRequests: { type: [String], default: [] },

    // Bid records
    bids: [
      {
        userId: { type: String, required: true },
        bidAmount: { type: Number, required: true },
        month: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Contributions and back-dated payments
    contributions: [
      {
        userId: { type: String, required: true },
        month: { type: Schema.Types.Mixed, required: true },
        amount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Warnings for missed payments
    warnings: [
      {
        userId: { type: String, required: true },
        month: { type: Number },
        count: { type: Number, required: true, default: 0 },
      },
    ],

    // Approved lateral members
    lateralMembers: [
      {
        userId: { type: String, required: true },
        paidBackdated: { type: Boolean, required: true, default: false },
      },
    ],

    // Organizer compensation records
    organizerCompensations: [
      {
        month: { type: Number, required: true },
        amount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Bid adjustments by organizer
    bidAdjustments: [
      {
        month: { type: Number, required: true },
        oldAmount: { type: Number, required: true },
        newAmount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    collection: 'groups',
    versionKey: false,
    timestamps: true,
  }
);

const Group = mongoose.model<IGroup>('Group', groupSchema);
export default Group;
