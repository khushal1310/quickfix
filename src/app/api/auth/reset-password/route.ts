import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber, otpCode, newPassword } = await req.json();

    if (!mobileNumber || !otpCode || !newPassword) {
      return NextResponse.json(
        { error: 'Mobile number, OTP code, and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 1. Fetch OTP record
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('user_otps')
      .select('*')
      .eq('mobile_number', mobileNumber)
      .eq('action_type', 'RESET')
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!otpRecord) {
      return NextResponse.json({ error: 'No active password reset request found.' }, { status: 400 });
    }

    // 2. Validate OTP code
    if (otpRecord.otp_code !== otpCode) {
      return NextResponse.json({ error: 'Invalid OTP code.' }, { status: 400 });
    }

    // 3. Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // 4. Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 5. Update password in users table
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('mobile_number', mobileNumber);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 6. Delete OTP record
    await supabaseAdmin.from('user_otps').delete().eq('id', otpRecord.id);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error: any) {
    console.error('Reset Password API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during password reset.' }, { status: 500 });
  }
}
