import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_FILE = path.join(process.cwd(), 'supabase', 'db.json');

// Interface for DB tables
export interface DbSchema {
  users: any[];
  service_categories: any[];
  service_requests: any[];
  request_images: any[];
  provider_accepts: any[];
  orders: any[];
  wallets: any[];
  wallet_transactions: any[];
  chat_rooms: any[];
  chat_messages: any[];
  disputes: any[];
  user_otps: any[];
}

// Helper to check if file exists
function ensureDbFile() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    // Generate initial seeds
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);

    const initialDb: DbSchema = {
      users: [
        {
          id: 'admin-1',
          role: 'admin',
          full_name: 'Admin Moderation',
          mobile_number: '9999999999',
          password_hash: passwordHash,
          profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin',
          is_suspended: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'customer-1',
          role: 'customer',
          full_name: 'Alice Customer',
          mobile_number: '1111111111',
          password_hash: passwordHash,
          profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice',
          is_suspended: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'provider-1',
          role: 'provider',
          full_name: 'Bob Provider',
          mobile_number: '2222222222',
          password_hash: passwordHash,
          profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bob',
          is_suspended: false,
          created_at: new Date().toISOString()
        }
      ],
      service_categories: [
        { id: 'cat-1', name: 'Cleaning', icon: 'Sparkles', created_at: new Date().toISOString() },
        { id: 'cat-2', name: 'Plumbing', icon: 'Wrench', created_at: new Date().toISOString() },
        { id: 'cat-3', name: 'Electrician', icon: 'Zap', created_at: new Date().toISOString() },
        { id: 'cat-4', name: 'Appliance Repair', icon: 'Cpu', created_at: new Date().toISOString() },
        { id: 'cat-5', name: 'Painting', icon: 'Paintbrush', created_at: new Date().toISOString() },
        { id: 'cat-6', name: 'Pest Control', icon: 'Bug', created_at: new Date().toISOString() }
      ],
      service_requests: [],
      request_images: [],
      provider_accepts: [],
      orders: [],
      wallets: [
        {
          id: 'wallet-bob',
          provider_id: 'provider-1',
          balance: 0.00,
          held_amount: 0.00,
          available_amount: 0.00
        }
      ],
      wallet_transactions: [],
      chat_rooms: [],
      chat_messages: [],
      disputes: [],
      user_otps: []
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  }
}

export function readDb(): DbSchema {
  ensureDbFile();
  const content = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(content) as DbSchema;
}

export function writeDb(db: DbSchema) {
  ensureDbFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Basic CRUD Helpers
export const mockDb = {
  get: (table: keyof DbSchema) => {
    const db = readDb();
    return db[table];
  },
  
  insert: (table: keyof DbSchema, record: any) => {
    const db = readDb();
    const newRecord = { 
      id: record.id || Math.random().toString(36).substring(2, 9), 
      created_at: new Date().toISOString(),
      ...record 
    };
    db[table].push(newRecord);
    writeDb(db);
    return newRecord;
  },

  update: (table: keyof DbSchema, id: string, updates: any) => {
    const db = readDb();
    const index = db[table].findIndex((r: any) => r.id === id);
    if (index === -1) return null;
    
    db[table][index] = { ...db[table][index], ...updates };
    writeDb(db);
    return db[table][index];
  },

  delete: (table: keyof DbSchema, id: string) => {
    const db = readDb();
    const initialLength = db[table].length;
    db[table] = db[table].filter((r: any) => r.id !== id);
    writeDb(db);
    return db[table].length !== initialLength;
  }
};
