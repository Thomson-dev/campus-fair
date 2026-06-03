import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './src/config/db';
import authRoutes from './src/routes/auth';
import vendorRoutes from './src/routes/vendor';

const app = express();

connectDB();

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env['CLIENT_ORIGIN'] ?? '*', credentials: true }));
app.use(morgan(process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests, try again later.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);

app.get('/health', (_req: Request, res: Response) =>
  res.json({ status: 'ok', env: process.env['NODE_ENV'] })
);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500;
  if (process.env['NODE_ENV'] !== 'production') console.error(err);
  res.status(status).json({ success: false, message: err.message ?? 'Internal server error' });
});

const PORT = Number(process.env['PORT']) || 3000;
app.listen(PORT, () =>
  console.log(`Campus Fair API on port ${PORT} [${process.env['NODE_ENV'] ?? 'development'}]`)
);

export default app;
