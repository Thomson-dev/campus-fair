import { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

// ── Sub-interfaces ────────────────────────────────────────────────────────────

export interface IMedia {
  url: string;
  publicId: string;
}

export interface IContact {
  whatsapp?: string;
  instagram?: string;
  email?: string;
}

export interface IDeliveryMethod {
  name: 'Campus Delivery' | 'Trade Fair Pickup' | 'Courier';
  fee: number;
}

export interface IBankDetails {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

// ── Main interface ────────────────────────────────────────────────────────────

export type VendorCategory =
  | 'Food & Drinks'
  | 'Fashion'
  | 'Tech & Gadgets'
  | 'Health & Beauty'
  | 'Arts & Crafts'
  | 'Services'
  | 'Other';

export interface IVendorProfile {
  user: Types.ObjectId;
  businessName: string;
  vendorCode: string;
  category: VendorCategory;
  description?: string;
  tagline?: string;
  photo?: IMedia;
  gallery: IMedia[];
  contact?: IContact;
  deliveryMethods: IDeliveryMethod[];
  bankDetails?: IBankDetails;
  hasBankDetails: boolean;
  saveCount: number;
  isProfileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type VendorProfileModelType = Model<IVendorProfile>;
export type VendorProfileDocument = HydratedDocument<IVendorProfile>;

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const mediaSchema = new Schema<IMedia>({ url: { type: String, required: true }, publicId: { type: String, required: true } }, { _id: false });

// ── Main schema ───────────────────────────────────────────────────────────────

const vendorProfileSchema = new Schema<IVendorProfile, VendorProfileModelType>(
  {
    user:         { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 80 },
    vendorCode:   { type: String, unique: true, sparse: true, uppercase: true, index: true },
    category:     { type: String, required: true, enum: ['Food & Drinks', 'Fashion', 'Tech & Gadgets', 'Health & Beauty', 'Arts & Crafts', 'Services', 'Other'] },
    description:  { type: String, maxlength: 500, trim: true },
    tagline:      { type: String, maxlength: 100, trim: true },
    photo:        mediaSchema,
    gallery: {
      type: [mediaSchema],
      validate: { validator: (arr: IMedia[]) => arr.length <= 8, message: 'Gallery max 8 images' },
    },
    contact: {
      whatsapp:  String,
      instagram: String,
      email:     String,
    },
    deliveryMethods: [
      {
        name: { type: String, enum: ['Campus Delivery', 'Trade Fair Pickup', 'Courier'] },
        fee:  { type: Number, default: 0, min: 0 },
        _id:  false,
      },
    ],
    bankDetails: {
      bankName:      String,
      accountNumber: String,
      accountName:   String,
    },
    hasBankDetails:    { type: Boolean, default: false },
    saveCount:         { type: Number, default: 0, min: 0 },
    isProfileComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Auto-generate vendorCode + compute isProfileComplete ──────────────────────

vendorProfileSchema.pre('save', async function (next) {
  this.isProfileComplete = !!(this.businessName && this.category && this.description);

  if (!this.vendorCode && this.businessName) {
    const initials = this.businessName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? 'X')
      .join('');
    for (let i = 0; i < 10; i++) {
      const digits = Math.floor(1000 + Math.random() * 9000).toString();
      const code = `${initials}-${digits}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exists = await (this.constructor as any).findOne({ vendorCode: code });
      if (!exists) { this.vendorCode = code; break; }
    }
  }

  next();
});

const VendorProfile = model<IVendorProfile, VendorProfileModelType>('VendorProfile', vendorProfileSchema);
export default VendorProfile;
