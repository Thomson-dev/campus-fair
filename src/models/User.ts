import { Schema, model, Model, HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'vendor' | 'organizer';
  googleId?: string;
  university?: string;
  phone?: string;
  institution?: string;
  isVerified: boolean;
  isActive: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  createPasswordResetToken(): string;
  toPublic(): Record<string, unknown>;
}

type UserModelType = Model<IUser, Record<string, never>, IUserMethods>;

export type UserDocument = HydratedDocument<IUser, IUserMethods>;

// ── Schema ────────────────────────────────────────────────────────────────────

const userSchema = new Schema<IUser, UserModelType, IUserMethods>(
  {
    name:        { type: String, required: true, trim: true, maxlength: 80 },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
    password:    { type: String, minlength: 6, select: false },
    role:        { type: String, enum: ['student', 'vendor', 'organizer'], required: true },
    googleId:    { type: String, sparse: true },
    university:  { type: String, trim: true },
    phone:       { type: String, trim: true },
    institution: { type: String, trim: true },
    isVerified:  { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },
    passwordResetToken:   String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// ── Hash password before save ─────────────────────────────────────────────────

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password as string);
};

userSchema.methods.createPasswordResetToken = function (): string {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  return token;
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject() as Record<string, unknown>;
  delete obj['password'];
  delete obj['passwordResetToken'];
  delete obj['passwordResetExpires'];
  delete obj['__v'];
  return obj;
};

const User = model<IUser, UserModelType>('User', userSchema);
export default User;
