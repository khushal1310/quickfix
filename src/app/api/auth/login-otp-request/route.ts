import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber } = await req.json();

    if (!mobileNumber) {
      return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 });
    }

    // 1. Fetch user by mobile number
    const { data: userRecord, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('mobile_number', mobileNumber.trim())
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'No account registered with this mobile number.' }, { status: 404 });
    }

    const email = userRecord.email;
    if (!email) {
      return NextResponse.json({ error: 'This account does not have a linked email address. Please contact support.' }, { status: 400 });
    }

    // 2. Generate 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[QuickFix Email Simulator] Login OTP for ${email}: ${otpCode}`);

    // 3. Store OTP in user_otps table
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    const { error: otpError } = await supabaseAdmin
      .from('user_otps')
      .upsert(
        {
          mobile_number: mobileNumber.trim(),
          otp_code: otpCode,
          action_type: 'LOGIN',
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
      message: 'Login OTP generated successfully. Check your email.',
      otp: otpCode, // Exposed for sandbox testing ease
    });
  } catch (error: any) {
    console.error('Login OTP Request Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during login OTP request.' }, { status: 500 });
  }
}
