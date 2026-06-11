import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'default-jwt-secret-key-change-in-production';

export async function signJWT(payload: { id: string; role: 'customer' | 'provider' | 'admin'; fullName: string; mobileNumber: string }) {
  const secretKey = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({
    aud: 'authenticated',
    role: 'authenticated',
    sub: payload.id,
    user_metadata: {
      role: payload.role,
      full_name: payload.fullName,
      mobile_number: payload.mobileNumber,
    },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('30d') // Token lasts 30 days
    .sign(secretKey);
}

export async function verifyJWT(token: string) {
  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}
