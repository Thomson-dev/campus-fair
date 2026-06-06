import { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

export interface IEvent {
  name: string;
  date: Date;
  location: string;
  organizer: Types.ObjectId;
  vendors: Types.ObjectId[];
  isLive: boolean;
  status: 'upcoming' | 'active' | 'past';
  createdAt: Date;
  updatedAt: Date;
}

type EventModelType = Model<IEvent>;
export type EventDocument = HydratedDocument<IEvent>;

const eventSchema = new Schema<IEvent, EventModelType>(
  {
    name:      { type: String, required: true, trim: true, maxlength: 120 },
    date:      { type: Date, required: true },
    location:  { type: String, required: true, trim: true, maxlength: 200 },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendors:   [{ type: Schema.Types.ObjectId, ref: 'VendorProfile' }],
    isLive:    { type: Boolean, default: false },
    status:    { type: String, enum: ['upcoming', 'active', 'past'], default: 'upcoming' },
  },
  { timestamps: true }
);

eventSchema.index({ date: -1 });
eventSchema.index({ status: 1 });

const Event = model<IEvent, EventModelType>('Event', eventSchema);
export default Event;
