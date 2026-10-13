import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB ?? "gh_radar";

/**
 * Next.js dev mode hot-reloads modules. Without caching the client on
 * globalThis every reload would open a fresh connection pool, and MongoDB
 * would eventually refuse new connections once the old pools pile up.
 * Caching on globalThis means one client survives the whole dev session.
 */
const globalForMongo = globalThis as unknown as {
  __ghRadarMongoClient?: MongoClient;
};

export async function getDb(): Promise<Db> {
  if (!globalForMongo.__ghRadarMongoClient) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    await client.connect();
    globalForMongo.__ghRadarMongoClient = client;
  }
  return globalForMongo.__ghRadarMongoClient.db(dbName);
}

export function connectionInfo() {
  // Never echo a credential back to the browser or the rendered HTML.
  const safe = uri.replace(/\/\/([^@/]+)@/, "//***@");
  return { uri: safe, db: dbName };
}
