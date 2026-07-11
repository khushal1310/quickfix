import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Check if running in mock mode (no real credentials provided)
const isMockMode = 
  supabaseUrl.includes('placeholder-project.supabase.co') || 
  supabaseAnonKey === 'placeholder-anon-key';

if (isMockMode) {
  console.log('[QuickFix Database Simulator] Running in Offline Mock Mode (Writing to local JSON file).');
}

// Chainable query builder to mock Supabase JS syntax
class MockSupabaseQueryBuilder {
  private table: string;
  private filters: any[] = [];
  private dataObj: any = null;
  private idVal: string | null = null;
  private orderObj: any = null;
  private limitVal: number | null = null;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private onConflictCol: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string) {
    if (this.action !== 'insert' && this.action !== 'update' && this.action !== 'upsert' && this.action !== 'delete') {
      this.action = 'select';
    }
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.dataObj = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.dataObj = data;
    return this;
  }

  upsert(data: any, options?: any) {
    this.action = 'upsert';
    this.dataObj = data;
    if (options && options.onConflict) {
      this.onConflictCol = options.onConflict;
    }
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    if (column === 'id') {
      this.idVal = value;
    } else {
      this.filters.push({ column, op: 'eq', value });
    }
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ column, op: 'in', value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, op: 'lt', value });
    return this;
  }

  order(column: string, options?: any) {
    this.orderObj = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(val: number) {
    this.limitVal = val;
    return this;
  }

  async maybeSingle() {
    const res = await this.execute(this.action);
    if (res.error) return { data: null, error: res.error };
    return { data: res.data?.[0] || null, error: null };
  }

  async single() {
    const res = await this.execute(this.action);
    if (res.error) return { data: null, error: res.error };
    if (!res.data || res.data.length === 0) return { data: null, error: new Error('Record not found') };
    return { data: res.data[0], error: null };
  }

  // Promise-like then method so we can await the query builder directly!
  // e.g. await supabase.from('users').select('*')
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await this.execute(this.action);
      if (onfulfilled) return onfulfilled(res);
      return res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute(action: string) {
    try {
      const res = await fetch('/api/db-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          table: this.table,
          filters: this.filters,
          data: this.dataObj,
          id: this.idVal,
          order: this.orderObj,
          limit: this.limitVal,
          onConflict: this.onConflictCol
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { data: null, error: new Error(data.error || 'Query failed') };
      }
      if (data.serverTime && typeof window !== 'undefined') {
        (window as any).__qf_server_time_offset = Date.now() - new Date(data.serverTime).getTime();
      }
      return { data: data.data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
}

class MockChannel {
  name: string;
  private listeners: any[] = [];

  constructor(name: string) {
    this.name = name;
  }

  on(event: string, filter: any, callback: any) {
    this.listeners.push({ event, filter, callback });
    return this;
  }

  subscribe(callback?: any) {
    if (callback) {
      setTimeout(() => callback('SUBSCRIBED'), 100);
    }
    return this;
  }

  async track(state: any) {
    return Promise.resolve();
  }

  async send(payload: any) {
    return Promise.resolve();
  }
}

// In-memory cache for mock uploads to preserve actual uploaded files as Base64 Data URLs
const mockFileUrls: Record<string, string> = {};

class MockStorage {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload(path: string, file: File) {
    try {
      if (typeof window !== 'undefined') {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
        mockFileUrls[path] = base64;
      }
    } catch (e) {
      console.error('[QuickFix Storage Simulator] Failed to read uploaded file:', e);
    }
    return { data: { path }, error: null };
  }

  getPublicUrl(path: string) {
    // Return beautiful placeholder images depending on the bucket context
    if (this.bucket === 'profile-images') {
      return { data: { publicUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(path)}` } };
    }
    // Return the cached Base64 data URL of the customer's actual photo if uploaded
    if (mockFileUrls[path]) {
      return { data: { publicUrl: mockFileUrls[path] } };
    }
    // Return neat Unsplash photos for requests as a fallback
    const unsplashPics = [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop'
    ];
    const index = Math.abs(path.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % unsplashPics.length;
    return { data: { publicUrl: unsplashPics[index] } };
  }
}

// Generate client instance
export const supabase = isMockMode 
  ? ({
      from: (table: string) => new MockSupabaseQueryBuilder(table),
      channel: (name: string) => new MockChannel(name),
      removeChannel: (channel: any) => {},
      storage: {
        from: (bucket: string) => new MockStorage(bucket)
      },
      auth: {
        setSession: async (session: any) => Promise.resolve({ data: {}, error: null }),
        signOut: async () => Promise.resolve({ error: null })
      }
    } as any)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
    });

// Helper to set auth token dynamically
export const setSupabaseToken = async (token: string | null) => {
  if (isMockMode) return;
  
  if (token) {
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
  } else {
    await supabase.auth.signOut();
  }
};
