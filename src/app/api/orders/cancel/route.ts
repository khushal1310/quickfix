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

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    // 2. Fetch order details with request
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

    // Only the customer who placed the request can cancel
    if (userRole !== 'customer' || order.customer_id !== userId) {
      return NextResponse.json({ error: 'Only the matching customer can cancel this request.' }, { status: 403 });
    }

    // Check status is SELECTED
    if (order.status !== 'SELECTED') {
      return NextResponse.json({ error: 'This order cannot be cancelled (current status: ' + order.status + ').' }, { status: 400 });
    }

    // Check cancellation window (1 minute)
    const createdAt = new Date(order.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - createdAt) / 1000;

    if (elapsedSeconds > 60) {
      return NextResponse.json({ error: 'Cancellation window (1 minute) has expired.' }, { status: 400 });
    }

    // 3. Update Order status to CANCELLED
    const { error: cancelOrderErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'CANCELLED', completed_at: new Date().toISOString() })
      .eq('id', orderId);

    if (cancelOrderErr) {
      return NextResponse.json({ error: cancelOrderErr.message }, { status: 500 });
    }

    // 4. Reset service request status to OPEN
    await supabaseAdmin
      .from('service_requests')
      .update({ status: 'OPEN' })
      .eq('id', order.request_id);

    // 5. Delete provider acceptance record so it can be accepted by other providers
    await supabaseAdmin
      .from('provider_accepts')
      .delete()
      .eq('request_id', order.request_id)
      .eq('provider_id', order.provider_id);

    // 6. Release Provider's Wallet Hold
    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('provider_id', order.provider_id)
      .maybeSingle();

    if (walletErr) {
      console.error('Error fetching provider wallet during cancellation release:', walletErr);
    } else if (wallet) {
      const budget = order.request?.budget ? parseFloat(order.request.budget) : 150.00;
      const platformFee = Math.round((budget * 0.10) * 100) / 100; // 10% platform fee

      const newHeldAmount = Math.max(0, parseFloat(wallet.held_amount) - platformFee);

      // Update provider's wallet
      const { error: updateWalletError } = await supabaseAdmin
        .from('wallets')
        .update({ held_amount: newHeldAmount })
        .eq('id', wallet.id);

      if (updateWalletError) {
        console.error('Error releasing provider wallet hold:', updateWalletError);
      } else {
        // Record Hold Release Transaction
        await supabaseAdmin
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'Refund',
            amount: platformFee,
            description: `Platform fee hold of ₹${platformFee} released due to customer cancellation. Order ID: ${order.id.slice(0, 8)}`,
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled and request reset to OPEN successfully.',
    });
  } catch (error: any) {
    console.error('Cancel Order API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during cancellation.' }, { status: 500 });
  }
}
