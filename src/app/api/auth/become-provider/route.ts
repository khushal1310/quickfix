import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyJWT, signJWT } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    let token = '';
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = req.cookies.get('qf_token')?.value || '';
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Missing token.' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized. Invalid session.' }, { status: 401 });
    }

    const userId = decoded.sub as string;
    const { serviceCategory } = await req.json();

    if (!serviceCategory) {
      return NextResponse.json({ error: 'Service category is required to register as a provider.' }, { status: 400 });
    }

    // 1. Fetch user to confirm they exist
    const { data: userRecord, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // 2. Update role to provider and set initial rating / verification status
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role: 'provider',
        service_category: serviceCategory,
        rating: 5.0,
        verification_status: 'verified',
        kyc_status: 'verified'
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Ensure a wallet is created
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('provider_id', userId)
      .maybeSingle();

    if (!wallet) {
      await supabaseAdmin.from('wallets').insert({
        id: `wallet-${userId.slice(0, 8)}`,
        provider_id: userId,
        balance: 0.00,
        held_amount: 0.00,
        available_amount: 0.00,
      });
    }

    // 4. Generate new JWT token reflecting the provider role
    const newToken = await signJWT({
      id: userRecord.id,
      role: 'provider',
      fullName: userRecord.full_name,
      mobileNumber: userRecord.mobile_number,
    });

    const user = {
      id: userRecord.id,
      role: 'provider',
      fullName: userRecord.full_name,
      mobileNumber: userRecord.mobile_number,
      profileImage: userRecord.profile_image,
      createdAt: userRecord.created_at,
    };

    const response = NextResponse.json({
      success: true,
      token: newToken,
      user,
    });

    // Update the authentication cookie
    response.cookies.set('qf_token', newToken, {
      path: '/',
      maxAge: 2592000,
      sameSite: 'strict',
    });

    return response;
  } catch (error: any) {
    console.error('Become Provider API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during role registration.' }, { status: 500 });
  }
}
