import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signJWT } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber, otpCode } = await req.json();

    if (!mobileNumber || !otpCode) {
      return NextResponse.json({ error: 'Mobile number and OTP code are required.' }, { status: 400 });
    }

    // 1. Fetch OTP record
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('user_otps')
      .select('*')
      .eq('mobile_number', mobileNumber.trim())
      .eq('action_type', 'LOGIN')
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!otpRecord) {
      return NextResponse.json({ error: 'No active login OTP found for this mobile number.' }, { status: 400 });
    }

    // 2. Validate OTP code
    if (otpRecord.otp_code !== otpCode) {
      return NextResponse.json({ error: 'Invalid OTP code. Please try again.' }, { status: 400 });
    }

    // 3. Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new code.' }, { status: 400 });
    }

    // 4. Fetch the user details
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('mobile_number', mobileNumber.trim())
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // 5. Delete OTP row
    await supabaseAdmin.from('user_otps').delete().eq('id', otpRecord.id);

    // 6. Sign custom JWT token
    const token = await signJWT({
      id: userRecord.id,
      role: userRecord.role,
      fullName: userRecord.full_name,
      mobileNumber: userRecord.mobile_number,
      custom_user_id: userRecord.custom_user_id,
    });

    const user = {
      id: userRecord.id,
      role: userRecord.role,
      fullName: userRecord.full_name,
      mobileNumber: userRecord.mobile_number,
      profileImage: userRecord.profile_image,
      createdAt: userRecord.created_at,
      dob: userRecord.dob || null,
      custom_user_id: userRecord.custom_user_id,
    };

    const response = NextResponse.json({
      success: true,
      token,
      user,
    });

    response.cookies.set('qf_token', token, {
      path: '/',
      maxAge: 2592000,
      sameSite: 'strict',
    });

    return response;
  } catch (error: any) {
    console.error('Verify Login OTP API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during login OTP verification.' }, { status: 500 });
  }
}
