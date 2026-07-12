import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    MONGODB_URI_DEFINED: !!process.env.MONGODB_URI,
    JWT_SECRET_DEFINED: !!process.env.JWT_SECRET,
    BREVO_API_KEY_DEFINED: !!process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL_DEFINED: !!process.env.BREVO_SENDER_EMAIL,
    NODE_ENV: process.env.NODE_ENV
  });
}
