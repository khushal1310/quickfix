import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, DbSchema } from '@/lib/mockDb';

export async function POST(req: NextRequest) {
  try {
    const { action, table, filters, data, id, order, limit, onConflict: topOnConflict } = await req.json();

    const db = readDb();
    let records = db[table as keyof DbSchema] || [];

    if (action === 'select') {
      // 1. Apply ID filter if specified
      if (id) {
        records = records.filter((r: any) => r.id === id);
      }

      // 2. Apply Custom Filters
      if (filters && Array.isArray(filters)) {
        for (const filter of filters) {
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
      }

      // 3. Resolve Joins and Counts
      const resolvedRecords = records.map((record: any) => {
        const copy = { ...record };

        // Users mapping details
        if (table === 'service_requests') {
          // Join Category
          copy.category = db.service_categories.find((c: any) => c.id === record.category_id);
          // Join Customer
          copy.customer = db.users.find((u: any) => u.id === record.customer_id);
          // Join Images
          copy.request_images = db.request_images.filter((img: any) => img.request_id === record.id);
          // Join provider accepts count
          const count = db.provider_accepts.filter((a: any) => a.request_id === record.id && a.status === 'ACCEPTED').length;
          copy.provider_accepts = [{ count }];
        }

        if (table === 'provider_accepts') {
          // Join Provider details
          copy.provider = db.users.find((u: any) => u.id === record.provider_id);
        }

        if (table === 'orders') {
          // Join Request
          const reqItem = db.service_requests.find((r: any) => r.id === record.request_id);
          if (reqItem) {
            const reqCopy = { ...reqItem };
            reqCopy.category = db.service_categories.find((c: any) => c.id === reqItem.category_id);
            reqCopy.request_images = db.request_images.filter((img: any) => img.request_id === reqItem.id);
            copy.request = reqCopy;
          }
          // Join Customer
          copy.customer = db.users.find((u: any) => u.id === record.customer_id);
          // Join Provider
          copy.provider = db.users.find((u: any) => u.id === record.provider_id);
        }

        if (table === 'chat_messages') {
          // Join Sender
          copy.sender = db.users.find((u: any) => u.id === record.sender_id);
        }

        if (table === 'disputes') {
          // Join Order
          const ordItem = db.orders.find((o: any) => o.id === record.order_id);
          if (ordItem) {
            const ordCopy = { ...ordItem };
            ordCopy.request = db.service_requests.find((r: any) => r.id === ordItem.request_id);
            ordCopy.customer = db.users.find((u: any) => u.id === ordItem.customer_id);
            ordCopy.provider = db.users.find((u: any) => u.id === ordItem.provider_id);
            copy.order = ordCopy;
          }
        }

        return copy;
      });

      // Sort / Ordering
      if (order) {
        const { column, ascending } = order;
        resolvedRecords.sort((a: any, b: any) => {
          const valA = a[column];
          const valB = b[column];
          if (valA < valB) return ascending ? -1 : 1;
          if (valA > valB) return ascending ? 1 : -1;
          return 0;
        });
      }

      // Limit
      let result = resolvedRecords;
      if (limit) {
        result = resolvedRecords.slice(0, limit);
      }

      return NextResponse.json({ data: result });
    }

    if (action === 'insert') {
      const recordsToInsert = Array.isArray(data) ? data : [data];
      const inserted: any[] = [];

      for (const item of recordsToInsert) {
        const newRecord = {
          id: item.id || Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString(),
          ...item
        };
        db[table as keyof DbSchema].push(newRecord);
        inserted.push(newRecord);
      }

      writeDb(db);
      return NextResponse.json({ data: inserted });
    }

    if (action === 'update') {
      // Find matching items
      let targetIds: string[] = [];

      if (id) {
        targetIds = [id];
      } else if (filters && Array.isArray(filters)) {
        let matching = [...records];
        for (const filter of filters) {
          const { column, op, value } = filter;
          if (op === 'eq') {
            matching = matching.filter((r: any) => r[column] === value);
          }
        }
        targetIds = matching.map((m: any) => m.id);
      }

      const updatedList: any[] = [];
      const currentList = db[table as keyof DbSchema];

      for (let i = 0; i < currentList.length; i++) {
        if (targetIds.includes(currentList[i].id)) {
          currentList[i] = { ...currentList[i], ...data };
          updatedList.push(currentList[i]);
        }
      }

      writeDb(db);
      return NextResponse.json({ data: updatedList });
    }

    if (action === 'upsert') {
      const onConflict = topOnConflict || (data ? data.onConflict : null);
      const upsertItems = Array.isArray(data) ? data : [data];
      const upserted: any[] = [];

      for (const item of upsertItems) {
        let existingIndex = -1;
        const currentList = db[table as keyof DbSchema];

        if (onConflict) {
          const cols = onConflict.split(',').map((c: string) => c.trim());
          existingIndex = currentList.findIndex((r: any) => {
            return cols.every((col: string) => r[col] === item[col]);
          });
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
      return NextResponse.json({ data: upserted });
    }

    if (action === 'delete') {
      let targetIds: string[] = [];

      if (id) {
        targetIds = [id];
      } else if (filters && Array.isArray(filters)) {
        let matching = [...records];
        for (const filter of filters) {
          const { column, op, value } = filter;
          if (op === 'eq') {
            matching = matching.filter((r: any) => r[column] === value);
          }
        }
        targetIds = matching.map((m: any) => m.id);
      }

      db[table as keyof DbSchema] = db[table as keyof DbSchema].filter((r: any) => !targetIds.includes(r.id));
      writeDb(db);
      return NextResponse.json({ data: { success: true, count: targetIds.length } });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Mock DB API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
