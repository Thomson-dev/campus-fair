import { Schema, model, Model, HydratedDocument, Types } from 'mongoose';
import crypto from 'crypto';

export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface IStatusEvent {
  status: string;
  timestamp: Date;
}

export interface IOrder {
  orderId: string;
  student: Types.ObjectId;
  studentName: string;
  studentPhone?: string;
  vendor: Types.ObjectId;
  vendorUser: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  deliveryMethod: 'campus_delivery' | 'trade_fair_pickup' | 'courier';
  deliveryFee: number;
  deliveryAddress?: string;
  totalAmount: number;
  platformFee: number;
  vendorReceives: number;
  status: 'pending' | 'confirmed' | 'ready' | 'delivered' | 'rejected' | 'disputed';
  studentNote?: string;
  rejectionReason?: string;
  paystackReference: string;
  paidAt?: Date;
  statusHistory: IStatusEvent[];
  createdAt: Date;
  updatedAt: Date;
}

type OrderModelType = Model<IOrder>;
export type OrderDocument = HydratedDocument<IOrder>;

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId:   { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    price:       { type: Number, required: true, min: 0 },
    quantity:    { type: Number, required: true, min: 1 },
    subtotal:    { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const statusEventSchema = new Schema<IStatusEvent>(
  {
    status:    { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder, OrderModelType>(
  {
    orderId:           { type: String, unique: true },
    student:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName:       { type: String, required: true },
    studentPhone:      String,
    vendor:            { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
    vendorUser:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items:             { type: [orderItemSchema], required: true },
    subtotal:          { type: Number, required: true, min: 0 },
    deliveryMethod:    { type: String, enum: ['campus_delivery', 'trade_fair_pickup', 'courier'], required: true },
    deliveryFee:       { type: Number, required: true, min: 0, default: 0 },
    deliveryAddress:   String,
    totalAmount:       { type: Number, required: true, min: 0 },
    platformFee:       { type: Number, required: true, min: 0 },
    vendorReceives:    { type: Number, required: true, min: 0 },
    status:            { type: String, enum: ['pending', 'confirmed', 'ready', 'delivered', 'rejected', 'disputed'], default: 'pending' },
    studentNote:       String,
    rejectionReason:   String,
    paystackReference: { type: String, required: true, unique: true },
    paidAt:            Date,
    statusHistory:     { type: [statusEventSchema], default: [] },
  },
  { timestamps: true }
);

orderSchema.index({ student: 1, createdAt: -1 });
orderSchema.index({ vendor: 1, createdAt: -1 });
orderSchema.index({ paystackReference: 1 }, { unique: true });

// Auto-generate orderId: ORD- + 4 uppercase hex chars
orderSchema.pre('save', function (next) {
  if (!this.orderId) {
    this.orderId = `ORD-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }
  next();
});

const Order = model<IOrder, OrderModelType>('Order', orderSchema);
export default Order;
