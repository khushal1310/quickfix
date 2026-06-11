import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickfix';
let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log('[QuickFix MongoDB Client] Connected to MongoDB database successfully.');
  }

  // client.db() uses the database name from the connection string by default, 
  // or we can fall back to 'quickfix'
  db = client.db(uri.includes('/cluster') || uri.includes('.net/') ? undefined : 'quickfix');
  return db;
}
