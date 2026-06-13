import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
    }

    // 1. Fetch user from database
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // 2. Compare current password hash
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 4. Update password
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('Change Password API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during password update.' }, { status: 500 });
  }
}
