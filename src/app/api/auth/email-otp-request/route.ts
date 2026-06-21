import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail, getOtpEmailTemplate } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const emailStr = email.toLowerCase().trim();

    // 1. Check if email is already registered in users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', emailStr)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: 'Email address already registered.' }, { status: 400 });
    }

    // 2. Generate 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[QuickFix Email Simulator] Signup OTP for ${emailStr}: ${otpCode}`);

    // Send the email via Brevo
    const emailHtml = getOtpEmailTemplate(otpCode, 'યુઝર', 'registration');
    const emailResult = await sendEmail({
      to: emailStr,
      subject: 'QuickFix ઇમેલ વેરિફિકેશન કોડ',
      htmlContent: emailHtml,
      textContent: `નમસ્તે, QuickFix સાઇન-અપ માટે તમારો વેરિફિકેશન કોડ છે: ${otpCode}`,
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email via Brevo:', emailResult.error);
    }

    // 3. Store OTP in user_otps table
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    const { error: otpError } = await supabaseAdmin
      .from('user_otps')
      .upsert(
        {
          mobile_number: emailStr,
          otp_code: otpCode,
          action_type: 'EMAIL_VERIFY',
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
      message: 'Signup email verification OTP generated successfully.',
      otp: otpCode, // Exposed for development/testing ease
    });
  } catch (error: any) {
    console.error('Email OTP Request Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during email OTP request.' }, { status: 500 });
  }
}
