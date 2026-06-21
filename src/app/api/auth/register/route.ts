import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signJWT } from '@/lib/jwt';

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

    // 4. Create User Directly
    const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}`;

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        role,
        full_name: fullName,
        mobile_number: mobileNumber,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        profile_image: defaultAvatar,
        service_category: role === 'provider' ? serviceCategory : null,
        rating: role === 'provider' ? 5.0 : null,
        verification_status: role === 'provider' ? 'unverified' : 'verified',
        kyc_status: role === 'provider' ? 'unverified' : 'verified',
        completed_orders_count: role === 'provider' ? 0 : 0
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 5. Sign custom JWT for the Supabase Client
    const token = await signJWT({
      id: newUser.id,
      role: newUser.role,
      fullName: newUser.full_name,
      mobileNumber: newUser.mobile_number,
      custom_user_id: newUser.custom_user_id,
    });

    // 6. Return user details and token
    const user = {
      id: newUser.id,
      role: newUser.role,
      fullName: newUser.full_name,
      mobileNumber: newUser.mobile_number,
      profileImage: newUser.profile_image,
      createdAt: newUser.created_at,
      dob: newUser.dob || null,
      custom_user_id: newUser.custom_user_id,
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
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during registration.' }, { status: 500 });
  }
}
