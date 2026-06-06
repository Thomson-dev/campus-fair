import { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

export interface IProduct {
  vendor: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  imagePublicId?: string;
  available: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

type ProductModelType = Model<IProduct>;
export type ProductDocument = HydratedDocument<IProduct>;

const productSchema = new Schema<IProduct, ProductModelType>(
  {
    vendor:         { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },
    name:           { type: String, required: true, trim: true, maxlength: 100 },
    description:    { type: String, trim: true, maxlength: 500 },
    price:          { type: Number, required: true, min: 0 },
    imageUrl:       String,
    imagePublicId:  String,
    available:      { type: Boolean, default: true },
    position:       { type: Number, default: () => Date.now() },
  },
  { timestamps: true }
);

productSchema.index({ vendor: 1, available: 1 });

const Product = model<IProduct, ProductModelType>('Product', productSchema);
export default Product;
