import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyJWT } from '@/lib/jwt';

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

    // 1. Delete corresponding wallet
    await supabaseAdmin
      .from('wallets')
      .delete()
      .eq('provider_id', userId);

    // 2. Delete user record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, message: 'Account deleted successfully.' });
    
    // Clear cookies
    response.cookies.delete('qf_token');

    return response;
  } catch (error: any) {
    console.error('Delete Account API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during account deletion.' }, { status: 500 });
  }
}
