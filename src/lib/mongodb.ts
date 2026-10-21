import { InMemoryDb, inMemoryDb } from './inMemoryDb';

const uri = process.env.MONGODB_URI || '';

// Use in-memory mode when:
// 1. No MONGODB_URI is set
// 2. URI points to Railway internal hostname (not reachable from Netlify/other hosts)
// 3. URI points to localhost
const isInternalOrMissing =
  !uri ||
  uri.includes('railway.internal') ||
  uri.includes('localhost') ||
  uri.includes('127.0.0.1');

let db: any = null;

export async function getNextCustomUserId(dbInstance: any): Promise<string> {
  const usersCol = dbInstance.collection('users');
  const lastUser = await usersCol
    .find({ custom_user_id: { $regex: /^QF-\d+$/ } })
    .sort({ custom_user_id: -1 })
    .limit(1)
    .toArray();

  let nextNum = 1001;
  if (lastUser && lastUser.length > 0) {
    const match = lastUser[0].custom_user_id?.match(/^QF-(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `QF-${nextNum}`;
}

export async function getDb(): Promise<any> {
  if (db) return db;

  // ── In-memory fallback (Netlify / no real DB configured) ──────────────────
  if (isInternalOrMissing) {
    db = inMemoryDb;
    return db;
  }

  // ── Real MongoDB (Railway external URL / MongoDB Atlas) ───────────────────
  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    console.log('[QuickFix MongoDB Client] Connected to MongoDB database successfully.');
    db = client.db(uri.includes('/cluster') || uri.includes('.net/') ? undefined : 'quickfix');
    return db;
  } catch (err) {
    console.warn('[QuickFix DB] MongoDB connection failed — falling back to in-memory mode.', err);
    db = inMemoryDb;
    return db;
  }
}

