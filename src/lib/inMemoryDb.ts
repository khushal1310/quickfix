import bcryptjs from 'bcryptjs';

// Pre-compute password hashes at module load time
const defaultPasswordHash = bcryptjs.hashSync('password123', 10);
const adminPasswordHash = bcryptjs.hashSync('admin', 10);

console.log('[QuickFix Database Simulator] Running in Offline Mock Mode (In-Memory).');

// In-memory collections - these persist across warm serverless invocations
// but reset on cold starts. Perfect for demo/portfolio deployments.
const collections: Record<string, any[]> = {
  users: [
    {
      id: 'user-admin-1',
      custom_user_id: 'QF-1001',
      role: 'admin',
      full_name: 'Admin User',
      mobile_number: '9999999999',
      email: 'admin@quickfix.com',
      password_hash: adminPasswordHash,
      profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin',
      is_suspended: false,
      kyc_status: 'verified',
      created_at: new Date().toISOString()
    },
    {
      id: 'user-customer-1',
      custom_user_id: 'QF-1002',
      role: 'customer',
      full_name: 'Alice Customer',
      mobile_number: '1111111111',
      email: 'customer@quickfix.com',
      password_hash: defaultPasswordHash,
      profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice',
      is_suspended: false,
      kyc_status: 'verified',
      dob: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'user-provider-1',
      custom_user_id: 'QF-1003',
      role: 'provider',
      full_name: 'Bob Provider',
      mobile_number: '2222222222',
      email: 'provider@quickfix.com',
      password_hash: defaultPasswordHash,
      profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bob',
      service_category: 'Cleaning',
      is_suspended: false,
      kyc_status: 'verified',
      is_active: true,
      badge_tier: 'gold',
      dob: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'user-provider-2',
      custom_user_id: 'QF-1004',
      role: 'provider',
      full_name: 'Charlie Silver',
      mobile_number: '3333333333',
      email: 'charlie@quickfix.com',
      password_hash: defaultPasswordHash,
      profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Charlie',
      service_category: 'Plumbing',
      is_suspended: false,
      kyc_status: 'verified',
      is_active: true,
      badge_tier: 'silver',
      dob: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'user-provider-3',
      custom_user_id: 'QF-1005',
      role: 'provider',
      full_name: 'Daniel Electrician',
      mobile_number: '4444444444',
      email: 'daniel@quickfix.com',
      password_hash: defaultPasswordHash,
      profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Daniel',
      service_category: 'Electrician',
      is_suspended: false,
      kyc_status: 'verified',
      is_active: true,
      badge_tier: 'bronze',
      dob: null,
      created_at: new Date().toISOString()
    }
  ],
  service_categories: [
    { id: 'cat-1', name: 'Cleaning', icon: 'Sparkles', created_at: new Date().toISOString() },
    { id: 'cat-2', name: 'Plumbing', icon: 'Wrench', created_at: new Date().toISOString() },
    { id: 'cat-3', name: 'Electrician', icon: 'Zap', created_at: new Date().toISOString() },
    { id: 'cat-4', name: 'Appliance Repair', icon: 'Cpu', created_at: new Date().toISOString() },
    { id: 'cat-5', name: 'Painting', icon: 'Paintbrush', created_at: new Date().toISOString() },
    { id: 'cat-6', name: 'Pest Control', icon: 'Bug', created_at: new Date().toISOString() },
    { id: 'cat-7', name: 'Carpentry', icon: 'Hammer', created_at: new Date().toISOString() }
  ],
  service_requests: [],
  request_images: [],
  provider_accepts: [],
  orders: [],
  wallets: [
    {
      id: 'wallet-provider-1',
      provider_id: 'user-provider-1',
      balance: 1250.00,
      held_amount: 0,
      available_amount: 1250.00,
      created_at: new Date().toISOString()
    },
    {
      id: 'wallet-provider-2',
      provider_id: 'user-provider-2',
      balance: 780.00,
      held_amount: 0,
      available_amount: 780.00,
      created_at: new Date().toISOString()
    },
    {
      id: 'wallet-provider-3',
      provider_id: 'user-provider-3',
      balance: 320.00,
      held_amount: 0,
      available_amount: 320.00,
      created_at: new Date().toISOString()
    }
  ],
  wallet_transactions: [],
  chat_rooms: [],
  chat_messages: [],
  disputes: [],
  user_otps: [],
  notifications: []
};

// --- Query helpers ---
function matchesQuery(item: any, query: any): boolean {
  for (const [key, val] of Object.entries(query)) {
    if (val === undefined || val === null) {
      if (item[key] !== val) return false;
      continue;
    }
    if (val instanceof RegExp) {
      if (!val.test(String(item[key] ?? ''))) return false;
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      const obj = val as any;
      if ('$regex' in obj) {
        const regex = obj.$regex instanceof RegExp ? obj.$regex : new RegExp(obj.$regex, obj.$options || '');
        if (!regex.test(String(item[key] ?? ''))) return false;
      } else if ('$ne' in obj) {
        if (item[key] === obj.$ne) return false;
      } else if ('$in' in obj) {
        if (!obj.$in.includes(item[key])) return false;
      } else if ('$lt' in obj) {
        if (!(item[key] < obj.$lt)) return false;
      } else if ('$gt' in obj) {
        if (!(item[key] > obj.$gt)) return false;
      } else if ('$lte' in obj) {
        if (!(item[key] <= obj.$lte)) return false;
      } else if ('$gte' in obj) {
        if (!(item[key] >= obj.$gte)) return false;
      } else if ('$exists' in obj) {
        const exists = key in item && item[key] !== undefined && item[key] !== null;
        if (obj.$exists !== exists) return false;
      }
    } else {
      if (item[key] !== val) return false;
    }
  }
  return true;
}

// --- Cursor ---
class InMemoryCursor {
  private data: any[];
  private sortSpec: any = null;
  private limitVal: number | null = null;

  constructor(data: any[]) {
    this.data = [...data];
  }

  sort(spec: any) {
    this.sortSpec = spec;
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  async toArray(): Promise<any[]> {
    let result = [...this.data];
    if (this.sortSpec) {
      for (const [key, dir] of Object.entries(this.sortSpec)) {
        result.sort((a, b) => {
          if (a[key] < b[key]) return (dir as number) === 1 ? -1 : 1;
          if (a[key] > b[key]) return (dir as number) === 1 ? 1 : -1;
          return 0;
        });
      }
    }
    if (this.limitVal !== null) {
      result = result.slice(0, this.limitVal);
    }
    return result;
  }
}

// --- Collection ---
class InMemoryCollection {
  private name: string;

  constructor(name: string) {
    this.name = name;
    if (!collections[name]) collections[name] = [];
  }

  private store(): any[] {
    if (!collections[this.name]) collections[this.name] = [];
    return collections[this.name];
  }

  find(query: any = {}) {
    const filtered = this.store().filter(item => matchesQuery(item, query));
    return new InMemoryCursor(filtered);
  }

  async findOne(query: any = {}): Promise<any> {
    return this.store().find(item => matchesQuery(item, query)) ?? null;
  }

  async insertOne(doc: any): Promise<any> {
    const newDoc = {
      id: doc.id || Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      ...doc
    };
    collections[this.name].push(newDoc);
    return { insertedId: newDoc.id, ...newDoc };
  }

  async insertMany(docs: any[]): Promise<any> {
    const inserted = docs.map(doc => ({
      id: doc.id || Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      ...doc
    }));
    collections[this.name].push(...inserted);
    return { insertedCount: inserted.length, ops: inserted };
  }

  async updateOne(filter: any, update: any): Promise<any> {
    const idx = collections[this.name].findIndex(item => matchesQuery(item, filter));
    if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) {
      collections[this.name][idx] = { ...collections[this.name][idx], ...update.$set };
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc as any)) {
        collections[this.name][idx][k] = (collections[this.name][idx][k] || 0) + (v as number);
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter: any, update: any): Promise<any> {
    let count = 0;
    for (let i = 0; i < collections[this.name].length; i++) {
      if (matchesQuery(collections[this.name][i], filter)) {
        if (update.$set) {
          collections[this.name][i] = { ...collections[this.name][i], ...update.$set };
        }
        count++;
      }
    }
    return { matchedCount: count, modifiedCount: count };
  }

  async deleteOne(filter: any): Promise<any> {
    const idx = collections[this.name].findIndex(item => matchesQuery(item, filter));
    if (idx === -1) return { deletedCount: 0 };
    collections[this.name].splice(idx, 1);
    return { deletedCount: 1 };
  }

  async deleteMany(filter: any): Promise<any> {
    const before = collections[this.name].length;
    collections[this.name] = collections[this.name].filter(item => !matchesQuery(item, filter));
    return { deletedCount: before - collections[this.name].length };
  }

  async countDocuments(filter: any = {}): Promise<number> {
    return this.store().filter(item => matchesQuery(item, filter)).length;
  }
}

// --- DB ---
export class InMemoryDb {
  collection(name: string) {
    return new InMemoryCollection(name);
  }
}

export const inMemoryDb = new InMemoryDb();
