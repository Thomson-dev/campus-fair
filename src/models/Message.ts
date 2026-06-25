import { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

export interface IMessage {
  order: Types.ObjectId;
  sender: Types.ObjectId;
  senderRole: 'student' | 'vendor';
  text: string;
  createdAt: Date;
}

type MessageModelType = Model<IMessage>;
export type MessageDocument = HydratedDocument<IMessage>;

const messageSchema = new Schema<IMessage, MessageModelType>(
  {
    order:      { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    sender:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['student', 'vendor'], required: true },
    text:       { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ order: 1, createdAt: 1 });

const Message = model<IMessage, MessageModelType>('Message', messageSchema);
export default Message;
