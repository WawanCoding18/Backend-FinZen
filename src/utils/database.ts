import mongoose from "mongoose";
import { DATABASE_URL } from "./env";


declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

const connect = async () => {
  if (!DATABASE_URL) {
    throw new Error(
      "❌ DATABASE_URL belum di-set di Environment Variables (Vercel/.env)!"
    );
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      dbName: "db-saku-sehat",
      bufferCommands: true, 
      serverSelectionTimeoutMS: 10000, //Timeout 10 detik
    };

    cached.promise = mongoose.connect(DATABASE_URL, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw new Error(`Failed to connect to database: ${error}`);
  }

  return cached.conn;
};

export default connect;