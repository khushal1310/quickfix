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
      .eq('mobile_number', mobileNumber)
      .eq('action_type', 'REGISTER')
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!otpRecord) {
      return NextResponse.json({ error: 'No active registration OTP found for this mobile number.' }, { status: 400 });
    }

    // 2. Validate OTP code
    if (otpRecord.otp_code !== otpCode) {
      return NextResponse.json({ error: 'Invalid OTP code. Please try again.' }, { status: 400 });
    }

    // 3. Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please register again.' }, { status: 400 });
    }

    // 4. Create User
    const tempUser = otpRecord.temp_user_data;
    const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(tempUser.fullName)}`;

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        role: tempUser.role,
        full_name: tempUser.fullName,
        mobile_number: tempUser.mobileNumber,
        password_hash: tempUser.passwordHash,
        profile_image: defaultAvatar,
        service_category: tempUser.serviceCategory || null,
        rating: tempUser.role === 'provider' ? 5.0 : null,
        verification_status: tempUser.role === 'provider' ? 'unverified' : 'verified',
        kyc_status: tempUser.role === 'provider' ? 'unverified' : 'verified',
        completed_orders_count: tempUser.role === 'provider' ? 0 : 0
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Note: The database trigger "trigger_create_provider_wallet" will automatically
    // create a wallet for this user if they are a provider.

    // 5. Delete OTP row
    await supabaseAdmin.from('user_otps').delete().eq('id', otpRecord.id);

    // 6. Sign custom JWT for the Supabase Client
    const token = await signJWT({
      id: newUser.id,
      role: newUser.role,
      fullName: newUser.full_name,
      mobileNumber: newUser.mobile_number,
    });

    // 7. Return user details and token
    const user = {
      id: newUser.id,
      role: newUser.role,
      fullName: newUser.full_name,
      mobileNumber: newUser.mobile_number,
      profileImage: newUser.profile_image,
      createdAt: newUser.created_at,
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
    console.error('Verify OTP API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during OTP verification.' }, { status: 500 });
  }
}
