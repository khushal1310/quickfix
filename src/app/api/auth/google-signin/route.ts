import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signJWT } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, name, avatar } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required from Google profile.' }, { status: 400 });
    }

    // 1. Check if user exists by email
    const { data: userRecord, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let finalUser = userRecord;

    if (!userRecord) {
      // 2. Auto-register a new customer if they do not exist
      const mockMobile = `${Math.floor(6000000000 + Math.random() * 3999999999)}`;
      const mockPasswordHash = await bcrypt.hash('google-oauth-password-hash', 10);
      
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          full_name: name || 'Google User',
          email: email.toLowerCase().trim(),
          mobile_number: mockMobile,
          role: 'customer',
          password_hash: mockPasswordHash,
          kyc_status: 'unverified',
          verification_status: 'unverified',
          profile_image: avatar || null
        })
        .select('*')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      finalUser = newUser;
    }

    // 3. Sign custom JWT token
    const token = await signJWT({
      id: finalUser.id,
      role: finalUser.role,
      fullName: finalUser.full_name,
      mobileNumber: finalUser.mobile_number,
      custom_user_id: finalUser.custom_user_id,
    });

    const user = {
      id: finalUser.id,
      role: finalUser.role,
      fullName: finalUser.full_name,
      mobileNumber: finalUser.mobile_number,
      profileImage: finalUser.profile_image,
      createdAt: finalUser.created_at,
      dob: finalUser.dob || null,
      custom_user_id: finalUser.custom_user_id,
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
    console.error('Google Sign-In API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during Google sign-in.' }, { status: 500 });
  }
}
