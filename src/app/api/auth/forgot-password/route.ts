import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber } = await req.json();

    if (!mobileNumber) {
      return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 });
    }

    // 1. Verify user exists
    const { data: user, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('mobile_number', mobileNumber)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'No user registered with this mobile number.' }, { status: 404 });
    }

    // 2. Generate 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[QuickFix SMS Simulator] Password Reset OTP for ${mobileNumber}: ${otpCode}`);

    // 3. Store in user_otps table
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    const { error: otpError } = await supabaseAdmin
      .from('user_otps')
      .upsert(
        {
          mobile_number: mobileNumber,
          otp_code: otpCode,
          action_type: 'RESET',
          temp_user_data: null,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'mobile_number' }
      );

    if (otpError) {
      return NextResponse.json({ error: otpError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'OTP generated successfully. Check logs or verify with code.',
      otp: otpCode, // Exposed for development/testing ease
    });
  } catch (error: any) {
    console.error('Forgot Password API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during forgot password.' }, { status: 500 });
  }
}
