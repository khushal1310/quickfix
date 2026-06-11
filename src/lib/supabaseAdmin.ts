import { createClient } from '@supabase/supabase-js';
import { readDb, writeDb, DbSchema } from '@/lib/mockDb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

const isMockMode = 
  supabaseUrl.includes('placeholder-project.supabase.co') || 
  supabaseServiceKey === 'placeholder-service-key';

class MockAdminQueryBuilder {
  private table: string;
  private filters: any[] = [];
  private idVal: string | null = null;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private dataObj: any = null;
  private onConflictCol: string | null = null;
  private orderObj: any = null;
  private limitVal: number | null = null;

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
    const res = await this.execute();
    return { data: res.data?.[0] || null, error: res.error };
  }

  async single() {
    const res = await this.execute();
    if (res.error) return { data: null, error: res.error };
    if (!res.data || res.data.length === 0) return { data: null, error: new Error('Record not found') };
    return { data: res.data[0], error: null };
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await this.execute();
      if (onfulfilled) return onfulfilled(res);
      return res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute() {
    const db = readDb();
    const currentList = db[this.table as keyof DbSchema];

    if (this.action === 'insert') {
      const recordsToInsert = Array.isArray(this.dataObj) ? this.dataObj : [this.dataObj];
      const inserted: any[] = [];

      for (const item of recordsToInsert) {
        const newRecord = {
          id: item.id || Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString(),
          ...item
        };
        currentList.push(newRecord);
        inserted.push(newRecord);

        // Auto create wallet trigger simulation for providers
        if (this.table === 'users' && newRecord.role === 'provider') {
          const hasWallet = db.wallets.some(w => w.provider_id === newRecord.id);
          if (!hasWallet) {
            db.wallets.push({
              id: `wallet-${newRecord.id}`,
              provider_id: newRecord.id,
              balance: 0.00,
              held_amount: 0.00,
              available_amount: 0.00
            });
          }
        }
      }

      writeDb(db);
      return { data: Array.isArray(this.dataObj) ? inserted : inserted, error: null };
    }

    if (this.action === 'update') {
      let targetIds: string[] = [];
      if (this.idVal) {
        targetIds = [this.idVal];
      } else {
        let matching = [...currentList];
        for (const filter of this.filters) {
          const { column, op, value } = filter;
          if (op === 'eq') matching = matching.filter((r: any) => r[column] === value);
        }
        targetIds = matching.map((m: any) => m.id);
      }

      const updatedList: any[] = [];
      for (let i = 0; i < currentList.length; i++) {
        if (targetIds.includes(currentList[i].id)) {
          currentList[i] = { ...currentList[i], ...this.dataObj };
          updatedList.push(currentList[i]);
        }
      }

      writeDb(db);
      return { data: updatedList, error: null };
    }

    if (this.action === 'upsert') {
      const upsertItems = Array.isArray(this.dataObj) ? this.dataObj : [this.dataObj];
      const upserted: any[] = [];

      for (const item of upsertItems) {
        let existingIndex = -1;
        if (this.onConflictCol) {
          existingIndex = currentList.findIndex((r: any) => r[this.onConflictCol!] === item[this.onConflictCol!]);
        } else if (item.id) {
          existingIndex = currentList.findIndex((r: any) => r.id === item.id);
        }

        if (existingIndex !== -1) {
          currentList[existingIndex] = { ...currentList[existingIndex], ...item };
          upserted.push(currentList[existingIndex]);
        } else {
          const newItem = {
            id: item.id || Math.random().toString(36).substring(2, 9),
            created_at: new Date().toISOString(),
            ...item
          };
          currentList.push(newItem);
          upserted.push(newItem);
        }
      }

      writeDb(db);
      return { data: upserted, error: null };
    }

    if (this.action === 'delete') {
      let targetIds: string[] = [];
      if (this.idVal) {
        targetIds = [this.idVal];
      } else {
        let matching = [...currentList];
        for (const filter of this.filters) {
          const { column, op, value } = filter;
          if (op === 'eq') matching = matching.filter((r: any) => r[column] === value);
        }
        targetIds = matching.map((m: any) => m.id);
      }

      db[this.table as keyof DbSchema] = currentList.filter((r: any) => !targetIds.includes(r.id));
      writeDb(db);
      return { data: { success: true, count: targetIds.length }, error: null };
    }

    // Default: select operation
    let records = [...currentList];

    if (this.idVal) {
      records = records.filter((r: any) => r.id === this.idVal);
    }

    for (const filter of this.filters) {
      const { column, op, value } = filter;
      if (op === 'eq') {
        records = records.filter((r: any) => r[column] === value);
      } else if (op === 'neq') {
        records = records.filter((r: any) => r[column] !== value);
      } else if (op === 'in') {
        records = records.filter((r: any) => Array.isArray(value) && value.includes(r[column]));
      } else if (op === 'lt') {
        records = records.filter((r: any) => r[column] < value);
      }
    }

    // Sorting
    if (this.orderObj) {
      const { column, ascending } = this.orderObj;
      records.sort((a: any, b: any) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'string' && typeof valB === 'string') {
          return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
      });
    }

    // Limit Slicing
    if (this.limitVal !== null && this.limitVal !== undefined) {
      records = records.slice(0, this.limitVal);
    }

    // Resolve JOINS
    const resolvedRecords = records.map((record: any) => {
      const copy = { ...record };

      if (this.table === 'service_requests') {
        copy.category = db.service_categories.find((c: any) => c.id === record.category_id);
        copy.customer = db.users.find((u: any) => u.id === record.customer_id);
        copy.request_images = db.request_images.filter((img: any) => img.request_id === record.id);
        const count = db.provider_accepts.filter((a: any) => a.request_id === record.id && a.status === 'ACCEPTED').length;
        copy.provider_accepts = [{ count }];
      }

      if (this.table === 'orders') {
        const reqItem = db.service_requests.find((r: any) => r.id === record.request_id);
        if (reqItem) {
          const reqCopy = { ...reqItem };
          reqCopy.category = db.service_categories.find((c: any) => c.id === reqItem.category_id);
          reqCopy.request_images = db.request_images.filter((img: any) => img.request_id === reqItem.id);
          copy.request = reqCopy;
        }
        copy.customer = db.users.find((u: any) => u.id === record.customer_id);
        copy.provider = db.users.find((u: any) => u.id === record.provider_id);
      }

      return copy;
    });

    return { data: resolvedRecords, error: null };
  }
}

export const supabaseAdmin = isMockMode
  ? ({
      from: (table: string) => new MockAdminQueryBuilder(table),
      auth: {
        setSession: async (session: any) => Promise.resolve({ data: {}, error: null }),
        signOut: async () => Promise.resolve({ error: null })
      }
    } as any)
  : createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
