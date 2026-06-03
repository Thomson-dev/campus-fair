import type { UserDocument } from '../models/User';

// Augment Express Request so req.user is available after protect middleware
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

export {};
