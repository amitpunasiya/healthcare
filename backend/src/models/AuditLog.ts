import mongoose, { Schema, Document } from 'mongoose';

export type AuditActionType = 'BLOCK' | 'UNBLOCK' | 'ROLE_CHANGE' | 'STATUS_CHANGE';

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  action: AuditActionType;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['BLOCK', 'UNBLOCK', 'ROLE_CHANGE', 'STATUS_CHANGE'],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Helpful compound indexes for fast timeline retrieval
AuditLogSchema.index({ targetUserId: 1, createdAt: -1 });
AuditLogSchema.index({ adminId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
