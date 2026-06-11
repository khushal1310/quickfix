import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyJWT } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate customer
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Missing token.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJWT(token);
    if (!decoded || decoded.user_metadata?.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized. Invalid customer session.' }, { status: 401 });
    }

    const customerId = decoded.sub as string;
    const { requestId, providerId } = await req.json();

    if (!requestId || !providerId) {
      return NextResponse.json({ error: 'Request ID and Provider ID are required.' }, { status: 400 });
    }

    // 2. Fetch service request and check ownership
    const { data: request, error: requestError } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', requestId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!request) {
      return NextResponse.json({ error: 'Service request not found or unauthorized.' }, { status: 404 });
    }

    if (request.status !== 'OPEN' && request.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'This service request is no longer open.' }, { status: 400 });
    }

    // 3. Verify provider actually accepted this request
    const { data: acceptance, error: acceptError } = await supabaseAdmin
      .from('provider_accepts')
      .select('*')
      .eq('request_id', requestId)
      .eq('provider_id', providerId)
      .eq('status', 'ACCEPTED')
      .maybeSingle();

    if (acceptError) {
      return NextResponse.json({ error: acceptError.message }, { status: 500 });
    }

    if (!acceptance) {
      return NextResponse.json({ error: 'Selected provider has not accepted this request.' }, { status: 400 });
    }

    // 4. Update request status
    const { error: updateRequestError } = await supabaseAdmin
      .from('service_requests')
      .update({ status: 'SELECTED' })
      .eq('id', requestId);

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 });
    }

    // 5. Create Order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        request_id: requestId,
        customer_id: customerId,
        provider_id: providerId,
        status: 'SELECTED',
      })
      .select('*')
      .single();

    if (orderError) {
      // Rollback request status (optional, but good practice)
      await supabaseAdmin.from('service_requests').update({ status: 'OPEN' }).eq('id', requestId);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 6. Create Chat Room
    const { error: chatRoomError } = await supabaseAdmin
      .from('chat_rooms')
      .insert({ order_id: order.id });

    if (chatRoomError) {
      console.error('Error creating chat room, order created anyway:', chatRoomError);
    }

    // 7. Wallet Hold Logic
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('provider_id', providerId)
      .maybeSingle();

    if (walletError) {
      console.error('Error fetching provider wallet:', walletError);
    } else if (wallet) {
      // Calculate Platform Fee (10% of budget, default to $15 if budget is null)
      const budget = request.budget ? parseFloat(request.budget) : 150.00;
      const platformFee = Math.round((budget * 0.10) * 100) / 100; // 10% fee

      const newHeldAmount = parseFloat(wallet.held_amount) + platformFee;

      // Update provider's wallet
      const { error: updateWalletError } = await supabaseAdmin
        .from('wallets')
        .update({ held_amount: newHeldAmount })
        .eq('id', wallet.id);

      if (updateWalletError) {
        console.error('Error holding platform fee in wallet:', updateWalletError);
      } else {
        // Record Hold Transaction
        const { error: txnError } = await supabaseAdmin
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'Hold',
            amount: platformFee,
            description: `Platform fee hold of $${platformFee} for Order ID: ${order.id.slice(0, 8)}`,
          });
        if (txnError) {
          console.error('Error creating wallet transaction:', txnError);
        }
      }
    } else {
      console.warn(`No wallet found for provider ${providerId}. Check trigger function.`);
    }

    return NextResponse.json({
      success: true,
      message: 'Provider selected and order generated successfully.',
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('Select Provider API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during provider selection.' }, { status: 500 });
  }
}
