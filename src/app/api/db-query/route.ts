import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyJWT } from '@/lib/jwt';

function sanitizeUser(u: any) {
  if (!u) return;
  delete u.password_hash;
  delete u.passwordHash;
}

export async function POST(req: NextRequest) {
  try {
    const { action, table, filters, data, id, order, limit, onConflict: topOnConflict } = await req.json();

    const mongoDb = await getDb();
    const col = mongoDb.collection(table);

    // 1. Authenticate JWT token
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let userRole: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = await verifyJWT(token);
      if (decoded) {
        userId = decoded.sub as string;
        userRole = decoded.user_metadata?.role as string;
      }
    }

    // 2. Table-level Access Control (ACL)
    const publicReadTables = ['service_categories', 'platform_reviews'];
    const publicWriteTables = ['platform_reviews'];

    const isPublicRead = action === 'select' && publicReadTables.includes(table);
    const isPublicWrite = action === 'insert' && publicWriteTables.includes(table);

    if (!isPublicRead && !isPublicWrite && !userId) {
      return NextResponse.json({ error: 'Unauthorized. Missing or invalid security token.' }, { status: 401 });
    }

    // 3. Row-level Security (RLS) & Access Control Policies
    const isAdmin = userRole === 'admin';

    if (!isAdmin && userId) {
      // Parse query filters into helper dictionary for easier checks
      const filterMap: Record<string, any> = {};
      if (filters && Array.isArray(filters)) {
        for (const f of filters) {
          if (f.op === 'eq') filterMap[f.column] = f.value;
        }
      }

      if (table === 'users') {
        if (action === 'delete') {
          return NextResponse.json({ error: 'Forbidden. Only administrators can delete users.' }, { status: 403 });
        }
        if (action === 'insert') {
          if (data && data.role === 'admin') {
            return NextResponse.json({ error: 'Forbidden. Cannot register admin user.' }, { status: 403 });
          }
        }
        if (action === 'update') {
          const targetId = id || filterMap['id'];
          if (targetId !== userId) {
            return NextResponse.json({ error: 'Forbidden. You can only update your own profile.' }, { status: 403 });
          }
          if (data && data.role && data.role !== userRole) {
            return NextResponse.json({ error: 'Forbidden. Cannot modify your user role.' }, { status: 403 });
          }
        }
      }

      if (table === 'wallets') {
        if (action === 'select' || action === 'update') {
          const targetId = id || filterMap['id'];
          const targetProvider = filterMap['provider_id'];
          
          if (targetId && targetId !== `wallet-${userId}`) {
            return NextResponse.json({ error: 'Forbidden. You can only access your own wallet.' }, { status: 403 });
          }
          if (targetProvider && targetProvider !== userId) {
            return NextResponse.json({ error: 'Forbidden. You can only access your own wallet.' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: 'Forbidden. Wallet modifications are restricted.' }, { status: 403 });
        }
      }

      if (table === 'wallet_transactions') {
        if (action === 'select') {
          const targetWalletId = filterMap['wallet_id'];
          if (targetWalletId && targetWalletId !== `wallet-${userId}`) {
            return NextResponse.json({ error: 'Forbidden. You can only view your own wallet transactions.' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: 'Forbidden. Only system tasks can record transactions.' }, { status: 403 });
        }
      }

      if (table === 'service_requests') {
        if (action === 'insert' || action === 'update' || action === 'delete') {
          if (data && data.customer_id && data.customer_id !== userId) {
            return NextResponse.json({ error: 'Forbidden. Customer ID mismatch.' }, { status: 403 });
          }
          const targetId = id || filterMap['id'];
          if (targetId) {
            const reqRecord = await mongoDb.collection('service_requests').findOne({ id: targetId });
            if (reqRecord && reqRecord.customer_id !== userId) {
              return NextResponse.json({ error: 'Forbidden. You do not own this request.' }, { status: 403 });
            }
          }
        }
        if (action === 'select') {
          const isProvider = userRole === 'provider';
          const targetCustomer = filterMap['customer_id'];
          
          if (!isProvider) {
            if (targetCustomer && targetCustomer !== userId) {
              return NextResponse.json({ error: 'Forbidden. You cannot view other customers\' requests.' }, { status: 403 });
            }
          } else {
            const statusFilter = filters?.find((f: any) => f.column === 'status');
            const hasStatusFilter = statusFilter && (statusFilter.value === 'OPEN' || statusFilter.value === 'ACCEPTED' || (Array.isArray(statusFilter.value) && statusFilter.value.every((v: string) => v === 'OPEN' || v === 'ACCEPTED')));
            
            if (targetCustomer && targetCustomer !== userId && !hasStatusFilter) {
              return NextResponse.json({ error: 'Forbidden. Providers can only query open requests.' }, { status: 403 });
            }
          }
        }
      }

      if (table === 'orders') {
        const targetId = id || filterMap['id'];
        if (targetId) {
          const orderRecord = await mongoDb.collection('orders').findOne({ id: targetId });
          if (orderRecord && orderRecord.customer_id !== userId && orderRecord.provider_id !== userId) {
            return NextResponse.json({ error: 'Forbidden. You are not a participant in this order.' }, { status: 403 });
          }
        }
        if (action === 'select') {
          const targetCustomer = filterMap['customer_id'];
          const targetProvider = filterMap['provider_id'];
          
          if (!targetCustomer && !targetProvider && !targetId) {
            return NextResponse.json({ error: 'Forbidden. General orders queries are restricted.' }, { status: 403 });
          }
          if (targetCustomer && targetCustomer !== userId && targetProvider !== userId) {
            return NextResponse.json({ error: 'Forbidden. Participant mismatch.' }, { status: 403 });
          }
          if (targetProvider && targetProvider !== userId && targetCustomer !== userId) {
            return NextResponse.json({ error: 'Forbidden. Participant mismatch.' }, { status: 403 });
          }
        }
      }

      if (table === 'chat_messages') {
        const targetOrderId = filterMap['order_id'] || (data ? data.order_id : null);
        if (!targetOrderId) {
          return NextResponse.json({ error: 'Forbidden. Order ID is required for chat operations.' }, { status: 403 });
        }
        const orderRecord = await mongoDb.collection('orders').findOne({ id: targetOrderId });
        if (!orderRecord || (orderRecord.customer_id !== userId && orderRecord.provider_id !== userId)) {
          return NextResponse.json({ error: 'Forbidden. You do not have access to this chat room.' }, { status: 403 });
        }
        if (action === 'insert' && data && data.sender_id && data.sender_id !== userId) {
          return NextResponse.json({ error: 'Forbidden. Sender ID mismatch.' }, { status: 403 });
        }
      }

      if (table === 'disputes') {
        const targetOrderId = filterMap['order_id'] || (data ? data.order_id : null);
        if (targetOrderId) {
          const orderRecord = await mongoDb.collection('orders').findOne({ id: targetOrderId });
          if (!orderRecord || (orderRecord.customer_id !== userId && orderRecord.provider_id !== userId)) {
            return NextResponse.json({ error: 'Forbidden. You do not have access to this order\'s disputes.' }, { status: 403 });
          }
        }
      }

      if (table === 'provider_accepts') {
        const targetProvider = filterMap['provider_id'] || (data ? data.provider_id : null);
        if (targetProvider && targetProvider !== userId && userRole === 'provider') {
          return NextResponse.json({ error: 'Forbidden. You can only view/update your own accept records.' }, { status: 403 });
        }
      }
    }

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

      // 6. Security Sanitization (Strip sensitive credentials)
      if (records && Array.isArray(records)) {
        for (const record of records) {
          if (table === 'users') {
            sanitizeUser(record);
          }
          if (record.customer) {
            sanitizeUser(record.customer);
          }
          if (record.provider) {
            sanitizeUser(record.provider);
          }
          if (record.sender) {
            sanitizeUser(record.sender);
          }
          if (record.order) {
            if (record.order.customer) sanitizeUser(record.order.customer);
            if (record.order.provider) sanitizeUser(record.order.provider);
          }
        }
      }

      return NextResponse.json({ data: records, serverTime: new Date().toISOString() });
    }

    if (action === 'insert') {
      const recordsToInsert = Array.isArray(data) ? data : [data];
      const inserted: any[] = [];

      let nextNum = -1;
      for (const item of recordsToInsert) {
        let customUserId = item.custom_user_id;
        if (table === 'users' && !customUserId) {
          if (nextNum === -1) {
            const lastUser = await mongoDb.collection('users')
              .find({ custom_user_id: { $regex: /^QF-\d+$/ } })
              .sort({ custom_user_id: -1 })
              .limit(1)
              .toArray();
            nextNum = 1001;
            if (lastUser && lastUser.length > 0) {
              const match = lastUser[0].custom_user_id.match(/^QF-(\d+)$/);
              if (match) {
                nextNum = parseInt(match[1], 10) + 1;
              }
            }
          }
          customUserId = `QF-${nextNum}`;
          nextNum++;
        }

        const newRecord = {
          id: item.id || Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString(),
          ...item,
          ...(table === 'users' ? { custom_user_id: customUserId } : {})
        };
        inserted.push(newRecord);
      }

      await col.insertMany(inserted);
      return NextResponse.json({ data: inserted, serverTime: new Date().toISOString() });
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
      return NextResponse.json({ data: updatedList, serverTime: new Date().toISOString() });
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

      return NextResponse.json({ data: upserted, serverTime: new Date().toISOString() });
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
      return NextResponse.json({ data: { success: true, count: deleteResult.deletedCount }, serverTime: new Date().toISOString() });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Mock DB API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
