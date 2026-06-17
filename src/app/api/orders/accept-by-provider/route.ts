import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyJWT } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate provider
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Missing token.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJWT(token);
    if (!decoded || decoded.user_metadata?.role !== 'provider') {
      return NextResponse.json({ error: 'Unauthorized. Invalid provider session.' }, { status: 401 });
    }

    const providerId = decoded.sub as string;
    const { requestId } = await req.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    // 2. Fetch service request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!request) {
      return NextResponse.json({ error: 'Service request not found.' }, { status: 404 });
    }

    // Concurrency Check: must be OPEN or ACCEPTED
    if (request.status !== 'OPEN' && request.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Sorry, this service request has already been matched or cancelled.' }, { status: 400 });
    }

    // 3. Lock the request instantly
    const { error: updateRequestError } = await supabaseAdmin
      .from('service_requests')
      .update({ status: 'SELECTED' })
      .eq('id', requestId);

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 });
    }

    // 4. Create Order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        request_id: requestId,
        customer_id: request.customer_id,
        provider_id: providerId,
        status: 'SELECTED',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (orderError) {
      // Rollback request status
      await supabaseAdmin.from('service_requests').update({ status: 'OPEN' }).eq('id', requestId);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 5. Create Chat Room
    const { error: chatRoomError } = await supabaseAdmin
      .from('chat_rooms')
      .insert({ order_id: order.id });

    if (chatRoomError) {
      console.error('Error creating chat room, order created anyway:', chatRoomError);
    }

    // 6. Record that the provider accepted it
    await supabaseAdmin
      .from('provider_accepts')
      .upsert(
        {
          request_id: requestId,
          provider_id: providerId,
          status: 'ACCEPTED',
          created_at: new Date().toISOString(),
        },
        { onConflict: 'request_id,provider_id' }
      );

    // 7. Wallet Hold Logic (in INR/₹)
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('provider_id', providerId)
      .maybeSingle();

    if (walletError) {
      console.error('Error fetching provider wallet:', walletError);
    } else if (wallet) {
      // Calculate Platform Fee (10% of budget, default to ₹150 if budget is null)
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
            description: `Platform fee hold of ₹${platformFee} for Order ID: ${order.id.slice(0, 8)}`,
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
      message: 'Instant matching lock successful.',
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('Accept Request API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during instant matching.' }, { status: 500 });
  }
}
