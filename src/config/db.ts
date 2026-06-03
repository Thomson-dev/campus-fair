import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env['MONGO_URI'];
    if (!uri) throw new Error('MONGO_URI is not defined in environment variables');
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${(err as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
