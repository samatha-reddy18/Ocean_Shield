import mongoose from 'mongoose';
import dns from 'node:dns';

/**
 * Some local / corporate DNS servers refuse the SRV queries required by the
 * `mongodb+srv://` scheme (Node reports `querySrv ECONNREFUSED`). Force the
 * resolver to use public DNS servers that support SRV records. This only
 * affects this process's DNS resolution; it does not change system settings.
 *
 * ALLOW_DNS_OVERRIDE=0 in the environment disables this override.
 */
const dnsOverrideDisabled = process.env.ALLOW_DNS_OVERRIDE === '0';
if (!dnsOverrideDisabled) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (err) {
    console.warn('Could not override DNS servers:', err.message);
  }
}

/**
 * Establishes a connection to MongoDB Atlas (database: oceanshield).
 * The connection string is read from MONGO_URI in the environment.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined. Copy backend/.env.example to backend/.env and set it.');
  }

  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB Atlas connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

export default connectDB;
