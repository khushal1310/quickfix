import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signJWT } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber, password } = await req.json();

    if (!mobileNumber || !password) {
      return NextResponse.json({ error: 'Mobile number and password are required.' }, { status: 400 });
    }

    // 1. Fetch user by mobile number
    const { data: userRecord, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('mobile_number', mobileNumber)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'Invalid mobile number or password.' }, { status: 400 });
    }

    // 2. Compare password hash
    const isPasswordMatch = await bcrypt.compare(password, userRecord.password_hash);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: 'Invalid mobile number or password.' }, { status: 400 });
    }

    // 3. Sign custom JWT token
    const token = await signJWT({
      id: userRecord.id,
      role: userRecord.role,
      fullName: userRecord.full_name,
      mobileNumber: userRecord.mobile_number,
    });

    const user = {
      id: userRecord.id,
      role: userRecord.role,
      fullName: userRecord.full_name,
      mobileNumber: userRecord.mobile_number,
      profileImage: userRecord.profile_image,
      createdAt: userRecord.created_at,
    };

    return NextResponse.json({
      success: true,
      token,
      user,
    });
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: error.message || 'Server error during login.' }, { status: 500 });
  }
}
