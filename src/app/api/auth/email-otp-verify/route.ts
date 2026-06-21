import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { email, otpCode } = await req.json();

    if (!email || !otpCode) {
      return NextResponse.json({ error: 'Email and OTP code are required.' }, { status: 400 });
    }

    const emailStr = email.toLowerCase().trim();

    // 1. Fetch OTP record
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('user_otps')
      .select('*')
      .eq('mobile_number', emailStr)
      .eq('action_type', 'EMAIL_VERIFY')
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!otpRecord) {
      return NextResponse.json({ error: 'No active email verification OTP found for this email address.' }, { status: 400 });
    }

    // 2. Validate OTP code
    if (otpRecord.otp_code !== otpCode) {
      return NextResponse.json({ error: 'Invalid OTP code. Please try again.' }, { status: 400 });
    }

    // 3. Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new code.' }, { status: 400 });
    }

    // 4. Delete OTP row since it's verified
    await supabaseAdmin.from('user_otps').delete().eq('id', otpRecord.id);

    return NextResponse.json({
      success: true,
      message: 'Email address verified successfully.',
    });
  } catch (error: any) {
    console.error('Email OTP Verify Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during email OTP verification.' }, { status: 500 });
  }
}
