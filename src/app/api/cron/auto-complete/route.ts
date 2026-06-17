import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    // 1. Calculate the 12-hour threshold
    const thresholdTime = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    // 2. Fetch orders in COMPLETED status that were marked complete before threshold
    let query = supabaseAdmin
      .from('orders')
      .select('*, request:service_requests(*)')
      .eq('status', 'COMPLETED');

    if (!force) {
      query = query.lt('completed_at', thresholdTime);
    }

    const { data: orders, error: fetchErr } = await query;

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, message: 'No orders found matching autocomplete criteria.', count: 0 });
    }

    let processedCount = 0;

    // 3. Loop and autocomplete each order
    for (const order of orders) {
      // Update order status to AUTOCOMPLETED
      const { error: updateOrderErr } = await supabaseAdmin
        .from('orders')
        .update({ status: 'AUTOCOMPLETED' })
        .eq('id', order.id);

      if (updateOrderErr) {
        console.error(`Error autocompleting order ${order.id}:`, updateOrderErr);
        continue;
      }

      // Update service request status to AUTOCOMPLETED
      await supabaseAdmin
        .from('service_requests')
        .update({ status: 'AUTOCOMPLETED' })
        .eq('id', order.request_id);

      // Perform Wallet adjustments (credit provider, release hold, deduct fee)
      const { data: wallet, error: walletErr } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('provider_id', order.provider_id)
        .maybeSingle();

      if (walletErr) {
        console.error(`Error fetching wallet for provider ${order.provider_id}:`, walletErr);
      } else if (wallet) {
        const budget = order.request?.budget ? parseFloat(order.request.budget) : 150.00;
        const platformFee = Math.round((budget * 0.10) * 100) / 100;
        const providerEarnings = budget - platformFee;

        const currentBalance = parseFloat(wallet.balance);
        const currentAvailable = parseFloat(wallet.available_amount);
        const currentHeld = parseFloat(wallet.held_amount);

        const newBalance = currentBalance + providerEarnings;
        const newAvailable = currentAvailable + providerEarnings;
        const newHeld = Math.max(0, currentHeld - platformFee);

        // Update Wallet
        const { error: updateWalletErr } = await supabaseAdmin
          .from('wallets')
          .update({
            balance: newBalance,
            available_amount: newAvailable,
            held_amount: newHeld,
          })
          .eq('id', wallet.id);

        if (updateWalletErr) {
          console.error(`Error updating wallet ${wallet.id} during autocomplete:`, updateWalletErr);
        } else {
          // Record Credit Transaction
          await supabaseAdmin.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            type: 'Credit',
            amount: budget,
            description: `Job autocomplete earnings of ₹${budget} for Order ID: ${order.id.slice(0, 8)}`,
          });

          // Record Fee Deduction Transaction
          await supabaseAdmin.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            type: 'Fee Deduction',
            amount: platformFee,
            description: `Autocomplete platform fee deduction of ₹${platformFee} for Order ID: ${order.id.slice(0, 8)}`,
          });
        }
      }

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully autocompleted ${processedCount} orders.`,
      count: processedCount,
    });
  } catch (error: any) {
    console.error('Autocomplete Cron API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during autocomplete cron.' }, { status: 500 });
  }
}
