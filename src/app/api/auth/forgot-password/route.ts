import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail, getOtpEmailTemplate } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber, email } = await req.json();
    const identifier = email || mobileNumber;

    if (!identifier) {
      return NextResponse.json({ error: 'Email or mobile number is required.' }, { status: 400 });
    }

    // 1. Verify user exists
    const isEmail = identifier.includes('@');
    const inputIdentifier = isEmail ? identifier.toLowerCase().trim() : identifier.trim();
    
    let query = supabaseAdmin.from('users').select('id, email, mobile_number, full_name');
    if (isEmail) {
      query = query.eq('email', inputIdentifier);
    } else {
      query = query.eq('mobile_number', inputIdentifier);
    }

    const { data: user, error: checkError } = await query.maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: isEmail ? 'No user registered with this email address.' : 'No user registered with this mobile number.' }, { status: 404 });
    }

    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'This account does not have a linked email address. Please contact support.' }, { status: 400 });
    }

    // 2. Generate 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[QuickFix Email Simulator] Password Reset OTP for ${userEmail}: ${otpCode}`);

    // Send the email via Brevo
    const emailHtml = getOtpEmailTemplate(otpCode, user.full_name || 'User', 'reset');
    const emailResult = await sendEmail({
      to: userEmail,
      subject: 'QuickFix Password Reset Code',
      htmlContent: emailHtml,
      textContent: `Hello, your code to reset your password is: ${otpCode}`,
    });

    if (!emailResult.success) {
      console.error('Failed to send reset email via Brevo:', emailResult.error);
    }

    // 3. Store in user_otps table
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    const { error: otpError } = await supabaseAdmin
      .from('user_otps')
      .upsert(
        {
          mobile_number: inputIdentifier,
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
      message: 'OTP generated successfully. Check your email.',
    });
  } catch (error: any) {
    console.error('Forgot Password API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during forgot password.' }, { status: 500 });
  }
}
