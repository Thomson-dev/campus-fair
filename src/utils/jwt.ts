import jwt from 'jsonwebtoken';
import { UserDocument, IUser } from '../models/User';

export const signToken = (user: UserDocument): string =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env['JWT_SECRET'] as string,
    { expiresIn: (process.env['JWT_EXPIRES_IN'] ?? '7d') as jwt.SignOptions['expiresIn'] }
  );

export interface AuthPayload {
  success: true;
  token: string;
  user: Pick<IUser, 'name' | 'email' | 'role' | 'university' | 'phone' | 'institution' | 'isVerified'> & { id: unknown };
}

export const authResponse = (user: UserDocument, token: string): AuthPayload => ({
  success: true,
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    university: user.university,
    phone: user.phone,
    institution: user.institution,
    isVerified: user.isVerified,
  },
});
