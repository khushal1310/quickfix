"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, Phone, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';

// Login form validation schema using Zod
const loginSchema = z.object({
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits').max(15, 'Invalid mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mobileNumber: '',
      password: '',
    }
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await login(data.mobileNumber, data.password);
      if (res.success) {
        toastSuccess('Logged in successfully!');
        // Get active user to determine redirect path
        const userJson = localStorage.getItem('qf_user');
        if (userJson) {
          const userObj = JSON.parse(userJson);
          router.push(`/${userObj.role}`);
        } else {
          router.push('/');
        }
      } else {
        setErrorMsg(res.error || 'Invalid credentials.');
        toastError(res.error || 'Login failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <span className="text-lg font-bold text-primary">QF</span>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Log in to connect with service providers or manage requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-3.5 text-sm font-semibold text-red-500 border border-red-500/20">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Mobile Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Enter mobile number"
                    className="pl-10"
                    {...register('mobileNumber')}
                  />
                </div>
                {errors.mobileNumber && (
                  <p className="text-xs font-medium text-red-500">{errors.mobileNumber.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Enter password"
                    className="pl-10"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-red-500">{errors.password.message}</p>
                )}
              </div>

              {/* Action Button */}
              <Button type="submit" size="lg" className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover font-bold mt-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm border-t border-border pt-4">
            <span className="text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-primary hover:underline">
                Sign Up
              </Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
