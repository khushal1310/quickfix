import { createClient } from '@supabase/supabase-js';
import { getDb } from '@/lib/mongodb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// In MongoDB database mode, we force the query runner to run queries locally on Mongo 
// instead of fetching online Supabase cloud tables.
const isMockMode = true; 

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
    try {
      const mongoDb = await getDb();
      const col = mongoDb.collection(this.table);

      if (this.action === 'insert') {
        const recordsToInsert = Array.isArray(this.dataObj) ? this.dataObj : [this.dataObj];
        const inserted: any[] = [];

        for (const item of recordsToInsert) {
          const newRecord = {
            id: item.id || Math.random().toString(36).substring(2, 9),
            created_at: new Date().toISOString(),
            ...item
          };
          inserted.push(newRecord);
        }

        await col.insertMany(inserted);

        // Auto create wallet trigger simulation for providers
        for (const newRecord of inserted) {
          if (this.table === 'users' && newRecord.role === 'provider') {
            const hasWallet = await mongoDb.collection('wallets').findOne({ provider_id: newRecord.id });
            if (!hasWallet) {
              await mongoDb.collection('wallets').insertOne({
                id: `wallet-${newRecord.id}`,
                provider_id: newRecord.id,
                balance: 0.00,
                held_amount: 0.00,
                available_amount: 0.00
              });
            }
          }
        }

        return { data: inserted, error: null };
      }

      if (this.action === 'update') {
        let targetQuery: any = {};
        if (this.idVal) {
          targetQuery.id = this.idVal;
        } else {
          for (const filter of this.filters) {
            const { column, op, value } = filter;
            if (op === 'eq') targetQuery[column] = value;
          }
        }

        const items = await col.find(targetQuery).toArray();
        const ids = items.map(i => i.id);

        await col.updateMany(
          { id: { $in: ids } },
          { $set: this.dataObj }
        );

        const updatedList = await col.find({ id: { $in: ids } }).toArray();
        return { data: updatedList, error: null };
      }

      if (this.action === 'upsert') {
        const upsertItems = Array.isArray(this.dataObj) ? this.dataObj : [this.dataObj];
        const upserted: any[] = [];

        for (const item of upsertItems) {
          let query: any = {};
          if (this.onConflictCol) {
            const cols = this.onConflictCol.split(',').map((c: string) => c.trim());
            cols.forEach((col: string) => {
              query[col] = item[col];
            });
          } else if (item.id) {
            query.id = item.id;
          }

          const existing = await col.findOne(query);

          if (existing) {
            await col.updateOne(
              { id: existing.id },
              { $set: item }
            );
            const updated = await col.findOne({ id: existing.id });
            upserted.push(updated);
          } else {
            const newItem = {
              id: item.id || Math.random().toString(36).substring(2, 9),
              created_at: new Date().toISOString(),
              ...item
            };
            await col.insertOne(newItem);
            upserted.push(newItem);
          }
        }

        return { data: upserted, error: null };
      }

      if (this.action === 'delete') {
        let targetQuery: any = {};
        if (this.idVal) {
          targetQuery.id = this.idVal;
        } else {
          for (const filter of this.filters) {
            const { column, op, value } = filter;
            if (op === 'eq') targetQuery[column] = value;
          }
        }

        const deleteResult = await col.deleteMany(targetQuery);
        return { data: { success: true, count: deleteResult.deletedCount }, error: null };
      }

      // Default: select operation
      const query: any = {};
      if (this.idVal) {
        query.id = this.idVal;
      }

      for (const filter of this.filters) {
        const { column, op, value } = filter;
        if (op === 'eq') {
          query[column] = value;
        } else if (op === 'neq') {
          query[column] = { $ne: value };
        } else if (op === 'in') {
          query[column] = { $in: value };
        } else if (op === 'lt') {
          query[column] = { $lt: value };
        }
      }

      let cursor = col.find(query);

      if (this.orderObj) {
        const { column, ascending } = this.orderObj;
        cursor = cursor.sort({ [column]: ascending ? 1 : -1 });
      }

      if (this.limitVal !== null && this.limitVal !== undefined) {
        cursor = cursor.limit(this.limitVal);
      }

      const records = await cursor.toArray();

      // Resolve JOINS
      if (records.length > 0) {
        if (this.table === 'service_requests') {
          const catIds = records.map(r => r.category_id).filter(Boolean);
          const custIds = records.map(r => r.customer_id).filter(Boolean);
          const reqIds = records.map(r => r.id).filter(Boolean);

          const categories = await mongoDb.collection('service_categories').find({ id: { $in: catIds } }).toArray();
          const customers = await mongoDb.collection('users').find({ id: { $in: custIds } }).toArray();
          const images = await mongoDb.collection('request_images').find({ request_id: { $in: reqIds } }).toArray();
          const accepts = await mongoDb.collection('provider_accepts').find({ request_id: { $in: reqIds }, status: 'ACCEPTED' }).toArray();

          for (const record of records) {
            record.category = categories.find(c => c.id === record.category_id) || null;
            record.customer = customers.find(c => c.id === record.customer_id) || null;
            record.request_images = images.filter(img => img.request_id === record.id);
            const count = accepts.filter(a => a.request_id === record.id).length;
            record.provider_accepts = [{ count }];
          }
        }

        if (this.table === 'orders') {
          const reqIds = records.map(r => r.request_id).filter(Boolean);
          const custIds = records.map(r => r.customer_id).filter(Boolean);
          const provIds = records.map(r => r.provider_id).filter(Boolean);

          const requests = await mongoDb.collection('service_requests').find({ id: { $in: reqIds } }).toArray();
          const customers = await mongoDb.collection('users').find({ id: { $in: custIds } }).toArray();
          const providers = await mongoDb.collection('users').find({ id: { $in: provIds } }).toArray();

          const catIds = requests.map(r => r.category_id).filter(Boolean);
          const reqItemIds = requests.map(r => r.id).filter(Boolean);
          const categories = await mongoDb.collection('service_categories').find({ id: { $in: catIds } }).toArray();
          const images = await mongoDb.collection('request_images').find({ request_id: { $in: reqItemIds } }).toArray();

          for (const reqItem of requests) {
            reqItem.category = categories.find(c => c.id === reqItem.category_id) || null;
            reqItem.request_images = images.filter(img => img.request_id === reqItem.id);
          }

          for (const record of records) {
            record.request = requests.find(r => r.id === record.request_id) || null;
            record.customer = customers.find(u => u.id === record.customer_id) || null;
            record.provider = providers.find(u => u.id === record.provider_id) || null;
          }
        }
      }

      return { data: records, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
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
