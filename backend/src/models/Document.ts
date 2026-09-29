import mongoose, { Schema, Document } from 'mongoose';
import { DocumentType, DocumentStatus } from '../constants/enums';

export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId;
  documentType: DocumentType;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  status: DocumentStatus;
  rejectionReason?: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    documentType: { type: String, enum: Object.values(DocumentType), required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.UNDER_REVIEW,
    },
    rejectionReason: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>('Document', DocumentSchema);
