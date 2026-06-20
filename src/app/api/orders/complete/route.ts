import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyJWT } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Missing token.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized. Invalid session.' }, { status: 401 });
    }

    const userId = decoded.sub as string;
    const userRole = decoded.user_metadata?.role as 'customer' | 'provider' | 'admin';

    const body = await req.json();
    const { orderId, action, rating, comment } = body;

    if (!orderId || !action) {
      return NextResponse.json({ error: 'Order ID and Action are required.' }, { status: 400 });
    }

    // 2. Fetch order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, request:service_requests(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // 3. Process actions based on roles
    if (action === 'start') {
      // Step: Provider starts work. Role must be provider, order must be SELECTED.
      if (userRole !== 'provider' || order.provider_id !== userId) {
        return NextResponse.json({ error: 'Only the assigned provider can start work.' }, { status: 403 });
      }
      if (order.status !== 'SELECTED') {
        return NextResponse.json({ error: 'Order must be in SELECTED state to start work.' }, { status: 400 });
      }

      // Update Order
      const { error: updateOrderErr } = await supabaseAdmin
        .from('orders')
        .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
        .eq('id', orderId);

      // Update Request status as well
      await supabaseAdmin
        .from('service_requests')
        .update({ status: 'IN_PROGRESS' })
        .eq('id', order.request_id);

      if (updateOrderErr) return NextResponse.json({ error: updateOrderErr.message }, { status: 500 });
      
      return NextResponse.json({ success: true, status: 'IN_PROGRESS' });
    }

    if (action === 'complete') {
      // Step: Provider marks complete. Role must be provider, order must be IN_PROGRESS.
      if (userRole !== 'provider' || order.provider_id !== userId) {
        return NextResponse.json({ error: 'Only the assigned provider can mark work completed.' }, { status: 403 });
      }
      if (order.status !== 'IN_PROGRESS') {
        return NextResponse.json({ error: 'Order must be in IN_PROGRESS state to mark complete.' }, { status: 400 });
      }

      // Update Order
      const { error: updateOrderErr } = await supabaseAdmin
        .from('orders')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', orderId);

      // Update Request status
      await supabaseAdmin
        .from('service_requests')
        .update({ status: 'COMPLETED' })
        .eq('id', order.request_id);

      if (updateOrderErr) return NextResponse.json({ error: updateOrderErr.message }, { status: 500 });

      return NextResponse.json({ success: true, status: 'COMPLETED' });
    }

    if (action === 'confirm') {
      // Step: Customer confirms completion. Role must be customer, order must be COMPLETED or IN_PROGRESS.
      if (userRole !== 'customer' || order.customer_id !== userId) {
        return NextResponse.json({ error: 'Only the customer can confirm completion.' }, { status: 403 });
      }
      if (order.status !== 'COMPLETED' && order.status !== 'IN_PROGRESS') {
        return NextResponse.json({ error: 'Order must be in COMPLETED or IN_PROGRESS state to confirm.' }, { status: 400 });
      }

      // 1. Update order status to AUTOCOMPLETED (since customer has confirmed it)
      const completedTime = order.completed_at || new Date().toISOString();
      await supabaseAdmin
        .from('orders')
        .update({ status: 'AUTOCOMPLETED', completed_at: completedTime })
        .eq('id', orderId);

      await supabaseAdmin
        .from('service_requests')
        .update({ status: 'AUTOCOMPLETED' })
        .eq('id', order.request_id);

      // 2. Insert provider review if rating is provided
      if (rating) {
        await supabaseAdmin.from('provider_reviews').insert({
          order_id: orderId,
          provider_id: order.provider_id,
          customer_id: order.customer_id,
          rating: Number(rating),
          comment: comment || '',
          created_at: new Date().toISOString()
        });
      }

      // 3. Increment provider's completed_orders_count by 1
      const { data: providerProfile } = await supabaseAdmin
        .from('users')
        .select('completed_orders_count')
        .eq('id', order.provider_id)
        .maybeSingle();

      if (providerProfile) {
        const currentCompletedCount = providerProfile.completed_orders_count || 0;
        await supabaseAdmin
          .from('users')
          .update({ completed_orders_count: currentCompletedCount + 1 })
          .eq('id', order.provider_id);
      }

      // 2. Fetch Wallet of provider to perform calculations
      const { data: wallet, error: walletErr } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('provider_id', order.provider_id)
        .maybeSingle();

      if (walletErr) {
        console.error('Error fetching wallet:', walletErr);
      } else if (wallet) {
        const budget = order.request?.budget ? parseFloat(order.request.budget) : 150.00;
        const platformFee = Math.round((budget * 0.10) * 100) / 100; // 10%

        // Provider's new earnings: budget minus platform fee
        const providerEarnings = budget - platformFee;

        // Perform Wallet updates:
        // - balance increases by providerEarnings (budget - fee)
        // - available_amount increases by providerEarnings
        // - held_amount decreases by platformFee (since order is done, fee hold is released)
        const currentBalance = parseFloat(wallet.balance);
        const currentAvailable = parseFloat(wallet.available_amount);
        const currentHeld = parseFloat(wallet.held_amount);

        const newBalance = currentBalance + providerEarnings;
        const newAvailable = currentAvailable + providerEarnings;
        // Ensure held doesn't go below 0
        const newHeld = Math.max(0, currentHeld - platformFee);

        const { error: updateWalletErr } = await supabaseAdmin
          .from('wallets')
          .update({
            balance: newBalance,
            available_amount: newAvailable,
            held_amount: newHeld,
          })
          .eq('id', wallet.id);

        if (updateWalletErr) {
          console.error('Wallet update failure:', updateWalletErr);
        } else {
          // Record Credit Transaction (for job earnings)
          await supabaseAdmin.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            type: 'Credit',
            amount: budget,
            description: `Job earnings of ₹${budget} for Order ID: ${order.id.slice(0, 8)}`,
          });

          // Record Fee Deduction Transaction
          await supabaseAdmin.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            type: 'Fee Deduction',
            amount: platformFee,
            description: `Platform fee deduction of ₹${platformFee} for Order ID: ${order.id.slice(0, 8)}`,
          });
        }
      }

      return NextResponse.json({ success: true, status: 'AUTOCOMPLETED' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Complete Order API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during order completion.' }, { status: 500 });
  }
}
