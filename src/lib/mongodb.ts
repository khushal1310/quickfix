import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickfix';
let client: MongoClient | null = null;
let db: Db | null = null;
let hasMigrated = false;

async function runMigration(dbInstance: Db) {
  try {
    const usersCol = dbInstance.collection('users');
    const usersWithoutId = await usersCol.find({ custom_user_id: { $exists: false } }).toArray();
    if (usersWithoutId.length > 0) {
      console.log(`[QuickFix DB Migration] Found ${usersWithoutId.length} users without custom_user_id. Assigning...`);
      let nextNum = 1001;
      const lastUser = await usersCol
        .find({ custom_user_id: { $regex: /^QF-\d+$/ } })
        .sort({ custom_user_id: -1 })
        .limit(1)
        .toArray();
      if (lastUser && lastUser.length > 0) {
        const match = lastUser[0].custom_user_id.match(/^QF-(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      for (const u of usersWithoutId) {
        await usersCol.updateOne(
          { _id: u._id },
          { $set: { custom_user_id: `QF-${nextNum}` } }
        );
        console.log(`[QuickFix DB Migration] Assigned QF-${nextNum} to user ${u.full_name || u.id}`);
        nextNum++;
      }
    }
  } catch (migErr) {
    console.error('[QuickFix DB Migration] Background migration failed:', migErr);
  }
}

export async function getNextCustomUserId(db: Db): Promise<string> {
  const usersCol = db.collection('users');
  const lastUser = await usersCol
    .find({ custom_user_id: { $regex: /^QF-\d+$/ } })
    .sort({ custom_user_id: -1 })
    .limit(1)
    .toArray();

  let nextNum = 1001;
  if (lastUser && lastUser.length > 0) {
    const match = lastUser[0].custom_user_id.match(/^QF-(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `QF-${nextNum}`;
}

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

  // Run one-time migration in the background
  if (!hasMigrated) {
    hasMigrated = true;
    runMigration(db).catch(migErr => {
      console.error('[QuickFix DB Migration] Background migration task failed:', migErr);
    });
  }

  return db;
}
