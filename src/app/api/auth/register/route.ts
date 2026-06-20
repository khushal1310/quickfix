import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { fullName, mobileNumber, email, password, role, serviceCategory } = await req.json();

    // 1. Validation
    if (!fullName || !mobileNumber || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Full Name, Mobile Number, Email, Password and Role are required.' },
        { status: 400 }
      );
    }

    if (!['customer', 'provider', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid user role.' }, { status: 400 });
    }

    if (role === 'provider' && !serviceCategory) {
      return NextResponse.json({ error: 'Service category is required for providers.' }, { status: 400 });
    }

    // 2. Check if mobile number is already registered in users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('mobile_number', mobileNumber)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: 'Mobile number already registered.' }, { status: 400 });
    }

    // Check if email is already registered in users table
    const { data: existingEmail, error: emailError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    if (existingEmail) {
      return NextResponse.json({ error: 'Email address already registered.' }, { status: 400 });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Generate 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[QuickFix Email Simulator] OTP for ${email}: ${otpCode}`);

    // 5. Store OTP and temp user data in user_otps table
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
    
    const tempUserData = {
      fullName,
      mobileNumber,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      serviceCategory: role === 'provider' ? serviceCategory : null,
    };

    // Upsert OTP (replaces if another exists for this mobile number)
    const { error: otpError } = await supabaseAdmin
      .from('user_otps')
      .upsert(
        {
          mobile_number: mobileNumber,
          otp_code: otpCode,
          action_type: 'REGISTER',
          temp_user_data: tempUserData,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'mobile_number' }
      );

    if (otpError) {
      return NextResponse.json({ error: otpError.message }, { status: 500 });
    }

    // 6. Return response
    return NextResponse.json({
      success: true,
      message: 'OTP generated successfully. Check logs or verify with code.',
      otp: otpCode, // Exposed for development/testing ease
    });
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during registration.' }, { status: 500 });
  }
}
