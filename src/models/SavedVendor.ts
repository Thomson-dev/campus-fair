import { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

export interface ISavedVendor {
  student: Types.ObjectId;
  vendor: Types.ObjectId;
  savedAt: Date;
  muted: boolean;
}

type SavedVendorModelType = Model<ISavedVendor>;
export type SavedVendorDocument = HydratedDocument<ISavedVendor>;

const savedVendorSchema = new Schema<ISavedVendor, SavedVendorModelType>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendor:  { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
    savedAt: { type: Date, default: Date.now },
    muted:   { type: Boolean, default: false },
  },
  { timestamps: false }
);

savedVendorSchema.index({ student: 1, vendor: 1 }, { unique: true });
savedVendorSchema.index({ student: 1 });

const SavedVendor = model<ISavedVendor, SavedVendorModelType>('SavedVendor', savedVendorSchema);
export default SavedVendor;
