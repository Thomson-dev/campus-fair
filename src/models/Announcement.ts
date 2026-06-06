import { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

export interface IAnnouncement {
  vendor: Types.ObjectId;
  text: string;
  imageUrl?: string;
  imagePublicId?: string;
  reach: number;
  createdAt: Date;
  updatedAt: Date;
}

type AnnouncementModelType = Model<IAnnouncement>;
export type AnnouncementDocument = HydratedDocument<IAnnouncement>;

const announcementSchema = new Schema<IAnnouncement, AnnouncementModelType>(
  {
    vendor:         { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },
    text:           { type: String, required: true, trim: true, maxlength: 500 },
    imageUrl:       String,
    imagePublicId:  String,
    reach:          { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

announcementSchema.index({ vendor: 1, createdAt: -1 });

const Announcement = model<IAnnouncement, AnnouncementModelType>('Announcement', announcementSchema);
export default Announcement;
