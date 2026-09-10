import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceCategory extends Document {
  name: string; // Physiotherapy, Occupational Therapy, Child Care, Elder Care, Lab Tests
  slug: string;
  description: string;
  iconName: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceCategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    iconName: { type: String, default: 'Activity' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IServiceCategory>('ServiceCategory', ServiceCategorySchema);
