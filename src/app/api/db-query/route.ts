import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { action, table, filters, data, id, order, limit, onConflict: topOnConflict } = await req.json();

    const mongoDb = await getDb();
    const col = mongoDb.collection(table);

    if (action === 'select') {
      // 1. Build MongoDB query filter
      const query: any = {};
      if (id) {
        query.id = id;
      }

      if (filters && Array.isArray(filters)) {
        for (const filter of filters) {
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
      }

      // 2. Execute find query
      let cursor = col.find(query);

      // 3. Apply sorting
      if (order) {
        const { column, ascending } = order;
        cursor = cursor.sort({ [column]: ascending ? 1 : -1 });
      }

      // 4. Apply limit
      if (limit) {
        cursor = cursor.limit(limit);
      }

      const records = await cursor.toArray();

      // 5. Resolve Joins and Counts
      if (records.length > 0) {
        if (table === 'service_requests') {
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

        if (table === 'provider_accepts') {
          const provIds = records.map(r => r.provider_id).filter(Boolean);
          const providers = await mongoDb.collection('users').find({ id: { $in: provIds } }).toArray();
          for (const record of records) {
            record.provider = providers.find(u => u.id === record.provider_id) || null;
          }
        }

        if (table === 'orders') {
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

        if (table === 'chat_messages') {
          const senderIds = records.map(r => r.sender_id).filter(Boolean);
          const senders = await mongoDb.collection('users').find({ id: { $in: senderIds } }).toArray();
          for (const record of records) {
            record.sender = senders.find(u => u.id === record.sender_id) || null;
          }
        }

        if (table === 'disputes') {
          const ordIds = records.map(r => r.order_id).filter(Boolean);
          const orders = await mongoDb.collection('orders').find({ id: { $in: ordIds } }).toArray();
          
          const reqIds = orders.map(o => o.request_id).filter(Boolean);
          const custIds = orders.map(o => o.customer_id).filter(Boolean);
          const provIds = orders.map(o => o.provider_id).filter(Boolean);

          const requests = await mongoDb.collection('service_requests').find({ id: { $in: reqIds } }).toArray();
          const users = await mongoDb.collection('users').find({ id: { $in: [...custIds, ...provIds] } }).toArray();

          for (const ord of orders) {
            ord.request = requests.find(r => r.id === ord.request_id) || null;
            ord.customer = users.find(u => u.id === ord.customer_id) || null;
            ord.provider = users.find(u => u.id === ord.provider_id) || null;
          }

          for (const record of records) {
            record.order = orders.find(o => o.id === record.order_id) || null;
          }
        }
      }

      return NextResponse.json({ data: records });
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
        inserted.push(newRecord);
      }

      await col.insertMany(inserted);
      return NextResponse.json({ data: inserted });
    }

    if (action === 'update') {
      let targetQuery: any = {};

      if (id) {
        targetQuery.id = id;
      } else if (filters && Array.isArray(filters)) {
        for (const filter of filters) {
          const { column, op, value } = filter;
          if (op === 'eq') {
            targetQuery[column] = value;
          }
        }
      }

      const items = await col.find(targetQuery).toArray();
      const ids = items.map(i => i.id);

      await col.updateMany(
        { id: { $in: ids } },
        { $set: data }
      );

      const updatedList = await col.find({ id: { $in: ids } }).toArray();
      return NextResponse.json({ data: updatedList });
    }

    if (action === 'upsert') {
      const onConflict = topOnConflict || (data ? data.onConflict : null);
      const upsertItems = Array.isArray(data) ? data : [data];
      const upserted: any[] = [];

      for (const item of upsertItems) {
        const itemCopy = { ...item };
        delete itemCopy.onConflict;

        let query: any = {};
        if (onConflict) {
          const cols = onConflict.split(',').map((c: string) => c.trim());
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
            { $set: itemCopy }
          );
          const updated = await col.findOne({ id: existing.id });
          upserted.push(updated);
        } else {
          const newItem = {
            id: itemCopy.id || Math.random().toString(36).substring(2, 9),
            created_at: new Date().toISOString(),
            ...itemCopy
          };
          await col.insertOne(newItem);
          upserted.push(newItem);
        }
      }

      return NextResponse.json({ data: upserted });
    }

    if (action === 'delete') {
      let targetQuery: any = {};

      if (id) {
        targetQuery.id = id;
      } else if (filters && Array.isArray(filters)) {
        for (const filter of filters) {
          const { column, op, value } = filter;
          if (op === 'eq') {
            targetQuery[column] = value;
          }
        }
      }

      const deleteResult = await col.deleteMany(targetQuery);
      return NextResponse.json({ data: { success: true, count: deleteResult.deletedCount } });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Mock DB API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
